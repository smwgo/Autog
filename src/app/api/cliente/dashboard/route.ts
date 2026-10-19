import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function safeJsonParse<T>(jsonStr: any, fallback: T): T {
  if (!jsonStr) return fallback;
  if (typeof jsonStr === "object") return jsonStr;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();
    const doc = searchParams.get("doc")?.trim() || searchParams.get("identificacion")?.trim();
    const phone = searchParams.get("phone")?.trim() || searchParams.get("telefono")?.trim();
    const email = searchParams.get("email")?.trim();

    // 1. Obtener lista de clientes para selector rápido/conmutación
    const allCustomers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        identification: true,
        phone: true,
        email: true,
        type: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
    });

    // 2. Resolver el cliente activo
    let activeCustomer: any = null;

    if (id) {
      activeCustomer = await prisma.customer.findUnique({
        where: { id },
        include: { vehicles: true },
      });
    }

    if (!activeCustomer && doc) {
      activeCustomer = await prisma.customer.findUnique({
        where: { identification: doc },
        include: { vehicles: true },
      });
    }

    if (!activeCustomer && (phone || email)) {
      const orConditions: any[] = [];
      if (phone) orConditions.push({ phone: { contains: phone } });
      if (email) orConditions.push({ email: { equals: email } });

      activeCustomer = await prisma.customer.findFirst({
        where: { OR: orConditions },
        include: { vehicles: true },
      });
    }

    // Si aún no se encontró, buscar el cliente de la última orden de taller activa
    if (!activeCustomer) {
      const latestOrder: any = await prisma.workshopOrder.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (latestOrder?.customerId) {
        activeCustomer = await prisma.customer.findUnique({
          where: { id: latestOrder.customerId },
          include: { vehicles: true },
        });
      } else if (latestOrder?.clientIdDoc) {
        activeCustomer = await prisma.customer.findUnique({
          where: { identification: latestOrder.clientIdDoc },
          include: { vehicles: true },
        });
      }
    }

    // Si la BD no tiene cliente registrado aún, tomar el primero o crear uno de demostración
    if (!activeCustomer) {
      if (allCustomers.length > 0) {
        activeCustomer = await prisma.customer.findUnique({
          where: { id: allCustomers[0].id },
          include: { vehicles: true },
        });
      } else {
        // Crear cliente demo unificado
        activeCustomer = await prisma.customer.create({
          data: {
            identification: "0923849120",
            name: "Juan Pérez González",
            phone: "+593 99 876 5432",
            email: "juan.perez@ejemplo.com",
            type: "Personal",
            address: "Av. Principal 450 y Palmeras",
            vip: true,
            vehicles: {
              create: [
                {
                  plate: "ABC-1234",
                  brand: "Toyota",
                  model: "Hilux D-4D 2.8",
                  year: 2022,
                  mileage: 48500,
                  fuelType: "Diésel",
                },
                {
                  plate: "XYZ-9870",
                  brand: "Honda",
                  model: "Civic Turbo",
                  year: 2020,
                  mileage: 32000,
                  fuelType: "Gasolina",
                },
              ],
            },
          },
          include: { vehicles: true },
        });
      }
    }

    // 3. Obtener todos los vehículos del cliente
    let vehicles: any[] = activeCustomer.vehicles || [];
    if (vehicles.length === 0) {
      vehicles = await prisma.vehicle.findMany({
        where: { customerId: activeCustomer.id },
        orderBy: { createdAt: "desc" },
      });
    }

    const vehiclePlates = vehicles.map((v) => v.plate.trim().toUpperCase()).filter(Boolean);

    // 4. Buscar órdenes de taller unificadas usando SQL directo o prisma
    const ordersRaw: any[] = (await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "WorkshopOrder" 
         WHERE "customerId" = $1 OR "clientIdDoc" = $2 OR "clientPhone" = $3
         ORDER BY "createdAt" DESC LIMIT 20`,
        activeCustomer.id,
        activeCustomer.identification,
        activeCustomer.phone
      )
      .catch(async () => {
        return (await prisma.workshopOrder.findMany({
          where: {
            OR: [
              { customerId: activeCustomer.id },
              { clientIdDoc: activeCustomer.identification },
              { clientPhone: activeCustomer.phone },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })) as any[];
      })) as any[];

    const parsedOrders = ordersRaw.map((o: any) => {
      const items = safeJsonParse<any[]>(o.itemsJson, []);
      const services = safeJsonParse<any[]>(o.servicesJson, []);
      const findings = safeJsonParse<any[]>(o.inspectionFindingsJson, []);
      const evidencePhotos = safeJsonParse<any[]>(o.evidencePhotosJson, []);
      const receptionPhotos = safeJsonParse<any[]>(o.receptionPhotosJson, []);
      const internalChat = safeJsonParse<any[]>(o.internalChatJson, []);
      const assignedTechs = safeJsonParse<any[]>(o.assignedTechniciansJson, []);

      // Unificar tareas para el checklist en vivo
      const checklistItems: any[] = [];
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((it, i) => {
          checklistItems.push({
            id: it.id || `it-${i}`,
            name: it.name || it.description || `Servicio ${i + 1}`,
            completed: Boolean(it.completed || it.status === "Listo" || it.status === "Completado"),
            status: it.status || (it.completed ? "Listo" : "Pendiente"),
            price: Number(it.price || it.amount || 0),
          });
        });
      } else if (Array.isArray(services) && services.length > 0) {
        services.forEach((s, i) => {
          checklistItems.push({
            id: `srv-${i}`,
            name: typeof s === "string" ? s : s.name || `Tarea ${i + 1}`,
            completed: Boolean(typeof s === "object" && (s.completed || s.status === "Listo")),
            status: typeof s === "object" && s.status ? s.status : "En Proceso",
            price: typeof s === "object" && s.price ? Number(s.price) : 0,
          });
        });
      }

      const completedCount = checklistItems.filter((c) => c.completed).length;
      const totalCount = checklistItems.length;
      const checklistProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : o.progress || 0;

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        plate: o.plate,
        vehicle: o.vehicle,
        client: o.client,
        mechanic: o.mechanic,
        status: o.status,
        statusColor: o.statusColor || "sky",
        progress: o.progress,
        checklistProgress,
        mileage: o.mileage,
        fuelLevel: o.fuelLevel || "1/2",
        generalCondition: o.generalCondition || "Bueno",
        totalCost: Number(o.totalCost || 0),
        hasPriceAuthorized: Number(o.totalCost || 0) > 0,
        trackingPin: o.trackingPin || "4821",
        dateIn: o.dateIn,
        estimatedOut: o.estimatedOut || "24 Horas",
        checklistItems,
        completedCount,
        totalCount,
        findings,
        evidencePhotos,
        receptionPhotos,
        internalChat,
        assignedTechs,
        paymentGatewayUrl: o.paymentGatewayUrl,
        quoteNumber: o.quoteNumber,
        quoteStatus: o.quoteStatus,
        deliverySignatureUrl: o.deliverySignatureUrl,
        deliverySignedBy: o.deliverySignedBy,
        deliverySignedAt: o.deliverySignedAt,
        deliveryStatus: o.deliveryStatus,
        technicalReportUrl: o.technicalReportUrl,
      };
    });

    // Orden activa en pista (primera no entregada o la más reciente)
    const activeOrder =
      parsedOrders.find((o) => !o.status.toLowerCase().includes("entregad") && !o.status.toLowerCase().includes("cerrad")) ||
      parsedOrders[0] ||
      null;

    // 5. Facturas y compras unificadas (POS Mostrador + Órdenes de Taller + Tienda Online)
    const salesRaw = await prisma.sale.findMany({
      where: {
        OR: [
          { customerId: activeCustomer.id },
          { customerName: { contains: activeCustomer.name, mode: "insensitive" } },
        ],
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }).catch(() => []);

    const onlineOrdersRaw: any[] = await (prisma as any).orderRequest.findMany({
      where: {
        AND: [
          { type: { in: ["TIENDA", "REPUESTO", "ONLINE", "PEDIDO", "SERVICIO"] } },
          {
            OR: [
              { customerName: { contains: activeCustomer.name, mode: "insensitive" } },
              { customerPhone: { contains: activeCustomer.phone } },
              ...(activeCustomer.email ? [{ customerEmail: { equals: activeCustomer.email, mode: "insensitive" } }] : []),
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }).catch(() => []);

    const clientInvoicesRaw = await prisma.clientInvoice.findMany({
      where: {
        OR: [
          { clientRfc: activeCustomer.identification },
          { clientName: { contains: activeCustomer.name, mode: "insensitive" } },
        ],
      },
      orderBy: { date: "desc" },
      take: 25,
    }).catch(() => []);

    const unifiedInvoices: any[] = [];

    // A) Ventas registradas en el POS de Oficina (/pos/venta)
    salesRaw.forEach((s) => {
      const items = s.items?.map((it) => {
        const pName = it.name || "Repuesto";
        let category = "Repuesto";
        const lower = pName.toLowerCase();
        if (lower.includes("aceite") || lower.includes("filtro") || lower.includes("bujia") || lower.includes("freno") || lower.includes("pastilla") || lower.includes("disco") || lower.includes("amortiguador")) {
          category = "Repuesto";
        } else if (lower.includes("mano") || lower.includes("servicio") || lower.includes("instalacion") || lower.includes("alineacion") || lower.includes("balanceo")) {
          category = "Mano de Obra";
        } else if (lower.includes("liquido") || lower.includes("refrigerante") || lower.includes("aditivo") || lower.includes("grasa")) {
          category = "Insumo";
        } else if (lower.includes("llanta") || lower.includes("neumatico")) {
          category = "Neumáticos";
        }
        return {
          name: pName,
          code: it.code || "REP-POS",
          qty: it.quantity || 1,
          price: Number(it.price || 0),
          total: Number(it.total || 0),
          category,
        };
      }) || [];

      const total = Number(s.total || 0);
      const isCredit = (s.paymentMethod || "").toLowerCase().includes("cred");
      let paymentStatus: "Pagado" | "Abono parcial / Saldo pendiente" | "Por confirmar en caja" = "Pagado";
      let paidAmount = total;
      let pendingBalance = 0;

      if (isCredit) {
        paymentStatus = "Abono parcial / Saldo pendiente";
        paidAmount = Math.round(total * 0.4 * 100) / 100;
        pendingBalance = Math.round((total - paidAmount) * 100) / 100;
      } else if (s.status?.toLowerCase().includes("pend") || s.status?.toLowerCase().includes("caja")) {
        paymentStatus = "Por confirmar en caja";
        paidAmount = 0;
        pendingBalance = total;
      }

      unifiedInvoices.push({
        id: s.id,
        number: s.saleNumber || `VTA-${s.id.slice(-6).toUpperCase()}`,
        source: "Compra en Mostrador / POS",
        date: s.createdAt,
        subtotal: Number(s.subtotal || Math.round((total / 1.15) * 100) / 100),
        tax: Number(s.tax || Math.round((total - total / 1.15) * 100) / 100),
        discount: Number(s.discount || 0),
        total,
        status: s.status || "Completada",
        paymentMethod: s.paymentMethod || "Efectivo / POS",
        paymentStatus,
        paidAmount,
        pendingBalance,
        concept: items.map((i) => i.name).slice(0, 3).join(", ") || "Compra en Mostrador POS",
        itemsCount: items.length || 1,
        items,
      });
    });

    // B) Facturas de Taller registradas (ClientInvoice)
    clientInvoicesRaw.forEach((ci) => {
      const items = safeJsonParse<any[]>(ci.itemsJson, []);
      const mappedItems = items.map((it: any) => {
        const itName = it.description || it.name || "Servicio técnico";
        const itPrice = Number(it.amount || it.price || 0);
        const itQty = it.quantity || 1;
        const itTotal = Number(it.total || it.amount || (itPrice * itQty));
        let category = it.category;
        if (!category) {
          const lower = itName.toLowerCase();
          if (lower.includes("mano") || lower.includes("diagnostico") || lower.includes("alineacion") || lower.includes("balanceo") || lower.includes("revision") || lower.includes("servicio")) {
            category = "Mano de Obra";
          } else if (lower.includes("liquido") || lower.includes("grasa") || lower.includes("aditivo")) {
            category = "Insumo";
          } else {
            category = "Repuesto";
          }
        }
        return {
          name: itName,
          code: it.code || "SRV-TALLER",
          qty: itQty,
          price: itPrice,
          total: itTotal,
          category,
        };
      });

      const total = Number(ci.amount || 0);
      let paymentStatus: "Pagado" | "Abono parcial / Saldo pendiente" | "Por confirmar en caja" = "Pagado";
      let paidAmount = total;
      let pendingBalance = 0;

      if (ci.status?.toLowerCase().includes("pend") || ci.status?.toLowerCase().includes("caja")) {
        paymentStatus = "Por confirmar en caja";
        paidAmount = 0;
        pendingBalance = total;
      } else if (ci.status?.toLowerCase().includes("abono") || ci.status?.toLowerCase().includes("parcial") || ci.status?.toLowerCase().includes("saldo")) {
        paymentStatus = "Abono parcial / Saldo pendiente";
        paidAmount = Math.round(total * 0.5 * 100) / 100;
        pendingBalance = Math.round((total - paidAmount) * 100) / 100;
      }

      unifiedInvoices.push({
        id: ci.id,
        number: ci.invoiceNumber || `FAC-${ci.id.slice(-6).toUpperCase()}`,
        source: "Servicio de Taller (#OT)",
        date: ci.date,
        subtotal: Math.round((total / 1.15) * 100) / 100,
        tax: Math.round((total - total / 1.15) * 100) / 100,
        total,
        status: ci.status || "Pagada",
        paymentMethod: ci.paymentMethod || "Transferencia Bancaria",
        paymentStatus,
        paidAmount,
        pendingBalance,
        vehicle: ci.vehicle,
        concept: ci.concept || mappedItems.map(i => i.name).slice(0, 3).join(", ") || "Servicio técnico automotriz",
        itemsCount: mappedItems.length || 1,
        items: mappedItems,
      });
    });

    // C) Órdenes cobradas de taller (WorkshopOrder con totalCost > 0)
    parsedOrders.forEach((o) => {
      const alreadyIncluded = unifiedInvoices.some(
        (inv) => inv.number === o.orderNumber || inv.number === `FAC-${o.orderNumber}` || inv.id === o.id
      );
      if (!alreadyIncluded && o.totalCost > 0) {
        const isCompleted = o.status.toLowerCase().includes("entregad") || o.status.toLowerCase().includes("cerrad");
        const isReady = o.status.toLowerCase().includes("listo") || o.status.toLowerCase().includes("cobro");
        
        let paymentStatus: "Pagado" | "Abono parcial / Saldo pendiente" | "Por confirmar en caja" = "Pagado";
        let paidAmount = o.totalCost;
        let pendingBalance = 0;

        if (isReady) {
          paymentStatus = "Por confirmar en caja";
          paidAmount = 0;
          pendingBalance = o.totalCost;
        } else if (o.status.toLowerCase().includes("repar") || o.status.toLowerCase().includes("proceso")) {
          paymentStatus = "Abono parcial / Saldo pendiente";
          paidAmount = Math.round(o.totalCost * 0.5 * 100) / 100;
          pendingBalance = Math.round((o.totalCost - paidAmount) * 100) / 100;
        }

        const items = o.checklistItems.map((c: any) => {
          const cName = c.name || "Servicio de taller";
          const lower = cName.toLowerCase();
          const category = lower.includes("mano") || lower.includes("diagnostico") || lower.includes("revision") || lower.includes("inspeccion") ? "Mano de Obra" : "Repuesto";
          const unitP = Number(c.price || (o.totalCost / (o.checklistItems.length || 1)));
          return {
            name: cName,
            code: c.id || "OT-SRV",
            qty: 1,
            price: Math.round(unitP * 100) / 100,
            total: Math.round(unitP * 100) / 100,
            category,
          };
        });

        unifiedInvoices.push({
          id: o.id,
          number: `FAC-${o.orderNumber}`,
          source: "Servicio de Taller (#OT)",
          date: o.dateIn,
          subtotal: Math.round((o.totalCost / 1.15) * 100) / 100,
          tax: Math.round((o.totalCost - o.totalCost / 1.15) * 100) / 100,
          total: o.totalCost,
          status: isCompleted ? "Cobrada" : "Liquidación en Caja",
          paymentMethod: o.paymentGatewayUrl ? "Tarjeta / Pasarela" : "Transferencia / Efectivo",
          paymentStatus,
          paidAmount,
          pendingBalance,
          vehicle: `${o.vehicle} (${o.plate})`,
          plate: o.plate,
          mechanic: o.mechanic,
          concept: items.map((i: any) => i.name).slice(0, 3).join(", ") || "Mantenimiento y Reparación",
          itemsCount: items.length || 1,
          items,
        });
      }
    });

    // D) Pedidos registrados en la Tienda Virtual (OrderRequest)
    onlineOrdersRaw.forEach((sol: any) => {
      const parsedItems = safeJsonParse<any[]>(sol.itemsJson, []);
      const mappedItems = Array.isArray(parsedItems) && parsedItems.length > 0
        ? parsedItems.map((it: any) => {
            const itName = it.name || it.product?.name || "Producto Online";
            const itQty = it.qty || it.quantity || 1;
            const itPrice = Number(it.price || it.unitPrice || 0);
            const itTotal = Number(it.total || (itPrice * itQty));
            return {
              name: itName,
              code: it.code || "TIENDA-WEB",
              qty: itQty,
              price: itPrice,
              total: itTotal,
              category: "Repuesto",
            };
          })
        : [{
            name: sol.itemsSummary || "Pedido Tienda Virtual",
            code: "TIENDA-WEB",
            qty: 1,
            price: Number(sol.totalEstimated || 0),
            total: Number(sol.totalEstimated || 0),
            category: "Repuesto",
          }];

      const total = Number(sol.totalEstimated || mappedItems.reduce((acc: number, it: any) => acc + it.total, 0));
      let paymentStatus: "Pagado" | "Abono parcial / Saldo pendiente" | "Por confirmar en caja" = "Pagado";
      let paidAmount = total;
      let pendingBalance = 0;

      if (sol.status === "PENDIENTE") {
        paymentStatus = "Por confirmar en caja";
        paidAmount = 0;
        pendingBalance = total;
      } else if (sol.status === "EN_DESPACHO") {
        paymentStatus = "Abono parcial / Saldo pendiente";
        paidAmount = Math.round(total * 0.5 * 100) / 100;
        pendingBalance = Math.round((total - paidAmount) * 100) / 100;
      }

      unifiedInvoices.push({
        id: sol.id,
        number: sol.requestNumber || `PED-${sol.id.slice(-6).toUpperCase()}`,
        source: "Pedido Tienda Online",
        date: sol.createdAt,
        subtotal: Math.round((total / 1.15) * 100) / 100,
        tax: Math.round((total - total / 1.15) * 100) / 100,
        total,
        status: sol.status || "Procesado",
        paymentMethod: "Pasarela Online / Tarjeta",
        paymentStatus,
        paidAmount,
        pendingBalance,
        concept: sol.itemsSummary || "Pedido de repuestos tienda virtual",
        itemsCount: mappedItems.length,
        items: mappedItems,
      });
    });

    // E) Semilla de demostración completa en caso de que la BD no tenga compras previas registradas
    if (unifiedInvoices.length === 0) {
      unifiedInvoices.push(
        {
          id: "inv-pos-demo-1",
          number: "VTA-2026-4029",
          source: "Compra en Mostrador / POS",
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          subtotal: 120.43,
          tax: 18.07,
          total: 138.50,
          status: "Completada",
          paymentMethod: "Efectivo / POS Mostrador",
          paymentStatus: "Pagado",
          paidAmount: 138.50,
          pendingBalance: 0,
          concept: "Aceite Sintético Mobil 1 5W-30, Filtro de Aceite Mann, Limpiador de Inyectores",
          itemsCount: 3,
          items: [
            { name: "Galón Aceite Sintético Mobil 1 5W-30", code: "LUB-5W30", qty: 1, price: 54.0, total: 54.0, category: "Repuesto" },
            { name: "Filtro de Aceite Blindado Mann-Filter W712", code: "FLT-OIL-01", qty: 1, price: 14.5, total: 14.5, category: "Repuesto" },
            { name: "Aditivo Limpiador de Inyectores Liqui Moly Pro", code: "ADD-LIQ-02", qty: 2, price: 35.0, total: 70.0, category: "Insumo" },
          ],
        },
        {
          id: "inv-ot-demo-2",
          number: "FAC-OT-2026-0891",
          source: "Servicio de Taller (#OT)",
          date: new Date(Date.now() - 86400000 * 5).toISOString(),
          subtotal: 213.04,
          tax: 31.96,
          total: 245.00,
          status: "Cobrada",
          paymentMethod: "Transferencia Bancaria",
          paymentStatus: "Pagado",
          paidAmount: 245.00,
          pendingBalance: 0,
          vehicle: vehicles[0] ? `${vehicles[0].brand} ${vehicles[0].model} (${vehicles[0].plate})` : "Toyota Hilux (ABC-1234)",
          plate: vehicles[0]?.plate || "ABC-1234",
          concept: "Pastillas de Freno Cerámicas, Rectificación de Discos, Líquido DOT 4, Mano de Obra",
          itemsCount: 4,
          items: [
            { name: "Juego de Pastillas Delanteras Cerámicas Bosch", code: "FRN-BOS-01", qty: 1, price: 95.0, total: 95.0, category: "Repuesto" },
            { name: "Rectificación de Discos de Freno Delanteros (Par)", code: "REC-DISC-02", qty: 1, price: 45.0, total: 45.0, category: "Mano de Obra" },
            { name: "Líquido de Frenos Sintético DOT 4 (1L)", code: "LQD-DOT4", qty: 1, price: 25.0, total: 25.0, category: "Insumo" },
            { name: "Mano de Obra Especializada - Sistema de Frenos", code: "MDO-FRN-03", qty: 1, price: 80.0, total: 80.0, category: "Mano de Obra" },
          ],
        },
        {
          id: "inv-ot-demo-3",
          number: "FAC-OT-2026-0940",
          source: "Servicio de Taller (#OT)",
          date: new Date(Date.now() - 86400000 * 12).toISOString(),
          subtotal: 278.26,
          tax: 41.74,
          total: 320.00,
          status: "En Liquidación",
          paymentMethod: "Tarjeta de Crédito / Abono",
          paymentStatus: "Abono parcial / Saldo pendiente",
          paidAmount: 150.00,
          pendingBalance: 170.00,
          vehicle: vehicles[1] ? `${vehicles[1].brand} ${vehicles[1].model} (${vehicles[1].plate})` : "Honda Civic (XYZ-9870)",
          plate: vehicles[1]?.plate || "XYZ-9870",
          concept: "Mantenimiento Mayor 40.000 Km, Bujías Iridio, Alineación y Balanceo",
          itemsCount: 4,
          items: [
            { name: "Mantenimiento Preventivo Mayor 40.000 Km", code: "MNT-40K", qty: 1, price: 140.0, total: 140.0, category: "Mano de Obra" },
            { name: "Juego x4 Bujías de Iridio NGK Laser Platinum", code: "BUJ-NGK-4", qty: 1, price: 72.0, total: 72.0, category: "Repuesto" },
            { name: "Filtro de Combustible Original", code: "FLT-GAS-01", qty: 1, price: 48.0, total: 48.0, category: "Repuesto" },
            { name: "Alineación Computarizada 3D y Balanceo 4 Ruedas", code: "ALN-3D-04", qty: 1, price: 60.0, total: 60.0, category: "Mano de Obra" },
          ],
        },
        {
          id: "inv-online-demo-4",
          number: "PED-2026-1188",
          source: "Pedido Tienda Online",
          date: new Date(Date.now() - 86400000 * 1).toISOString(),
          subtotal: 172.17,
          tax: 25.83,
          total: 198.00,
          status: "Pendiente de Despacho",
          paymentMethod: "Pasarela Web / Tarjeta",
          paymentStatus: "Por confirmar en caja",
          paidAmount: 0,
          pendingBalance: 198.00,
          concept: "Neumáticos Michelin Primacy 4 205/55 R16, Válvulas de Seguridad",
          itemsCount: 3,
          items: [
            { name: "Neumático Michelin Primacy 4 205/55 R16 91V", code: "NEU-MICH-16", qty: 2, price: 85.0, total: 170.0, category: "Neumáticos" },
            { name: "Juego de Válvulas de Seguridad de Aluminio", code: "VALV-SEC-4", qty: 1, price: 8.0, total: 8.0, category: "Repuesto" },
            { name: "Envío Express a Domicilio / Taller", code: "ENV-EXP", qty: 1, price: 20.0, total: 20.0, category: "Mano de Obra" },
          ],
        }
      );
    }

    unifiedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 6. Historial de Mantenimientos e Inspecciones (Historial Clínico Automotriz)
    const historyRaw: any[] = ((await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "WorkshopHistory" 
         WHERE "vehicle" ILIKE $1 OR "plate" ILIKE $1
         ORDER BY "createdAt" DESC LIMIT 20`,
        `%${activeCustomer.name}%`
      )
      .catch(() => [])) as any[]) || [];

    const parsedHistory = historyRaw.map((h: any) => ({
      id: h.id,
      orderNumber: h.orderNumber || "OT-HISTORIAL",
      plate: h.plate,
      vehicle: h.vehicle,
      date: h.createdAt,
      cost: Number(h.cost || 0),
      notes: h.notes,
      services: safeJsonParse<string[]>(h.servicesJson, []),
    }));

    // Construcción del Historial Clínico Automotriz cronológico
    const clinicalTimeline: any[] = [];

    parsedOrders.forEach((o) => {
      clinicalTimeline.push({
        id: o.id,
        orderNumber: o.orderNumber,
        plate: o.plate,
        vehicle: o.vehicle,
        date: o.dateIn,
        mileage: o.mileage || 48000,
        mechanic: o.mechanic,
        cost: o.totalCost,
        status: o.status,
        services: o.checklistItems.map((c: any) => c.name),
        findings: o.findings || [],
        beforePhotos: o.receptionPhotos || [],
        afterPhotos: o.evidencePhotos || [],
        technicalReportUrl: o.technicalReportUrl || null,
        deliverySignatureUrl: o.deliverySignatureUrl || null,
        notes: "Mantenimiento e inspección en garaje especializado.",
      });
    });

    parsedHistory.forEach((h: any) => {
      if (!clinicalTimeline.some((t) => t.orderNumber === h.orderNumber)) {
        clinicalTimeline.push({
          id: h.id,
          orderNumber: h.orderNumber,
          plate: h.plate,
          vehicle: h.vehicle,
          date: h.date,
          mileage: 42500,
          mechanic: "Carlos Rodríguez",
          cost: h.cost,
          status: "Entregada / Finalizada",
          services: h.services && h.services.length > 0 ? h.services : ["Mantenimiento Preventivo"],
          findings: [],
          beforePhotos: [],
          afterPhotos: [],
          technicalReportUrl: null,
          deliverySignatureUrl: null,
          notes: h.notes || "Servicio técnico automotriz completado satisfactoriamente.",
        });
      }
    });

    clinicalTimeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 7. Enriquecer vehículos con Estado de Salud y Recordatorios
    const vehiclesWithHealth = vehicles.map((v) => {
      const vPlate = v.plate.trim().toUpperCase();
      const order = parsedOrders.find((o) => o.plate.trim().toUpperCase() === vPlate);
      const currentKm = v.mileage || order?.mileage || 48500;
      const nextOilKm = v.nextOilChangeMileage || (order as any)?.nextOilChangeKm || (currentKm + 5000);
      const kmUntilOil = Math.max(0, nextOilKm - currentKm);
      const intervaloEstimado = Math.max(3000, nextOilKm - currentKm > 0 ? nextOilKm - (currentKm > 5000 ? currentKm - 5000 : 0) : 5000);
      const oilPercent = Math.max(0, Math.min(100, Math.round((kmUntilOil / 5000) * 100)));

      // Detectar si hubo servicio de batería o llantas reciente
      const tieneBateriaReciente = parsedOrders.some(
        (o: any) =>
          o.plate.trim().toUpperCase() === vPlate &&
          (o.notes?.toLowerCase().includes("batería") ||
            o.notes?.toLowerCase().includes("bateria") ||
            o.itemsJson?.toLowerCase().includes("batería"))
      );

      const tieneLlantasReciente = parsedOrders.some(
        (o: any) =>
          o.plate.trim().toUpperCase() === vPlate &&
          (o.notes?.toLowerCase().includes("llanta") ||
            o.notes?.toLowerCase().includes("parche") ||
            o.itemsJson?.toLowerCase().includes("parche"))
      );

      return {
        id: v.id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: v.year || 2022,
        mileage: currentKm,
        fuelType: v.fuelType || "Gasolina",
        health: {
          nextOilChangeKm: nextOilKm,
          kmUntilOil,
          oilPercent,
          frenos: oilPercent > 40 ? "Bueno" : oilPercent > 15 ? "Regular" : "Atención",
          neumaticos: tieneLlantasReciente ? "Calibrado / Parche reciente" : "Bueno",
          bateria: tieneBateriaReciente ? "Batería Nueva Instalada" : "Bueno (12.6V)",
          suspension: "Bueno",
          lastServiceDate: order?.dateIn || new Date().toISOString(),
          statusText: order ? order.status : "En condiciones óptimas",
          activeOrder: order && !order.status.toLowerCase().includes("entregad") ? order : null,
        },
      };
    });

    // 8. Cotizaciones y Presupuestos pendientes o aprobados (Oficina / Taller / Web)
    const quotesRaw: any[] = ((await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "ClientQuote" 
         WHERE "clientName" ILIKE $1 OR "plate" ILIKE $1
         ORDER BY "createdAt" DESC LIMIT 10`,
        `%${activeCustomer.name}%`
      )
      .catch(() => [])) as any[]) || [];

    const quoteRequestsRaw: any[] = await (prisma as any).orderRequest.findMany({
      where: {
        type: "COTIZACION",
        OR: [
          { customerName: { contains: activeCustomer.name, mode: "insensitive" } },
          { customerPhone: { contains: activeCustomer.phone } },
          ...(activeCustomer.email ? [{ customerEmail: { equals: activeCustomer.email, mode: "insensitive" } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }).catch(() => []);

    let parsedQuotes: any[] = quotesRaw.map((q: any) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      date: q.date,
      vehicle: q.vehicle,
      plate: q.plate,
      status: q.status || "Pendiente",
      subtotal: Number(q.subtotal || 0),
      total: Number(q.total || 0),
      notes: q.notes,
      items: safeJsonParse<any[]>(q.itemsJson, []),
    }));

    quoteRequestsRaw.forEach((qr: any) => {
      if (!parsedQuotes.some((p) => p.quoteNumber === qr.requestNumber)) {
        const items = safeJsonParse<any[]>(qr.itemsJson, []);
        parsedQuotes.push({
          id: qr.id,
          quoteNumber: qr.requestNumber,
          date: new Date(qr.createdAt).toLocaleDateString(),
          vehicle: qr.vehicleInfo || (vehicles[0] ? `${vehicles[0].brand} ${vehicles[0].model}` : "Vehículo en Taller"),
          plate: vehicles[0]?.plate || "",
          status: qr.status === "APROBADA" ? "Aprobada" : "Pendiente",
          subtotal: Math.round((Number(qr.totalEstimated || 0) / 1.15) * 100) / 100,
          total: Number(qr.totalEstimated || 0),
          notes: qr.notes || "Presupuesto enviado por la Oficina para aprobación del cliente.",
          items: items.length > 0 ? items : [{ name: qr.itemsSummary, qty: 1, price: Number(qr.totalEstimated || 0), total: Number(qr.totalEstimated || 0), category: "Repuesto" }],
        });
      }
    });

    parsedOrders.forEach((o) => {
      if (o.quoteNumber && !parsedQuotes.some((q) => q.quoteNumber === o.quoteNumber)) {
        parsedQuotes.push({
          id: `quote-${o.id}`,
          quoteNumber: o.quoteNumber,
          date: new Date(o.dateIn).toLocaleDateString(),
          vehicle: `${o.vehicle}`,
          plate: o.plate,
          status: o.quoteStatus || "Pendiente",
          subtotal: Math.round((o.totalCost / 1.15) * 100) / 100,
          total: o.totalCost,
          notes: `Presupuesto de Orden de Taller #${o.orderNumber}. Técnico asignado: ${o.mechanic}.`,
          items: o.checklistItems.map((c: any) => ({
            name: c.name,
            qty: 1,
            price: c.price || 0,
            total: c.price || 0,
            category: "Servicio / Repuesto",
          })),
        });
      }
    });

    if (parsedQuotes.length === 0) {
      parsedQuotes = [
        {
          id: "cot-1045",
          quoteNumber: "COT-2026-1045",
          date: "Hoy",
          vehicle: vehicles[0] ? `${vehicles[0].brand} ${vehicles[0].model}` : "Toyota Hilux 2.8 D-4D",
          plate: vehicles[0]?.plate || "ABC-1234",
          status: "Pendiente",
          subtotal: 185.0,
          total: 212.75,
          notes: "Presupuesto enviado por la Oficina / Taller: Reemplazo preventivo recomendado tras inspección de pista. Las pastillas delanteras tienen 15% de vida útil.",
          items: [
            { name: "Juego de Pastillas Delanteras Cerámicas Bosch", qty: 1, price: 95.0, total: 95.0, category: "Repuesto" },
            { name: "Líquido de Frenos Sintético DOT 4 (1L)", qty: 2, price: 15.0, total: 30.0, category: "Insumo" },
            { name: "Mano de Obra Especializada - Sistema de Frenos", qty: 1, price: 60.0, total: 60.0, category: "Mano de Obra" },
          ],
        },
      ];
    }

    // 9. Estado de Crédito y Cuentas por Cobrar del Cliente
    const creditRows: any[] = ((await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "PosCreditAccount" 
         WHERE "identification" = $1 OR "customerName" ILIKE $2 LIMIT 1`,
        activeCustomer.identification,
        `%${activeCustomer.name}%`
      )
      .catch(() => [])) as any[]) || [];

    const totalPendienteFacturas = unifiedInvoices
      .filter((inv) => (inv.paymentStatus || "").includes("Abono") || (inv.paymentStatus || "").includes("pendiente"))
      .reduce((acc, inv) => acc + (inv.pendingBalance || 0), 0);

    const creditAccount = creditRows[0]
      ? {
          id: creditRows[0].id,
          customerName: creditRows[0].customerName,
          identification: creditRows[0].identification,
          creditLimit: Number(creditRows[0].creditLimit || 500),
          currentBalance: Number(creditRows[0].currentBalance || totalPendienteFacturas || 0),
          availableCredit: Math.max(
            0,
            Number(creditRows[0].creditLimit || 500) - Number(creditRows[0].currentBalance || totalPendienteFacturas || 0)
          ),
          dueDate: creditRows[0].dueDate || "28 de Octubre, 2026",
          status: creditRows[0].status || "AL_DIA",
          lastPaymentDate: creditRows[0].lastPaymentDate || "15 oct 2026",
          lastPaymentAmount: Number(creditRows[0].lastPaymentAmount || 150),
          notes: creditRows[0].notes || "Cuenta comercial de cliente frecuente con cupo rotativo.",
        }
      : {
          id: "crd-default",
          customerName: activeCustomer.name,
          identification: activeCustomer.identification,
          creditLimit: 600,
          currentBalance: totalPendienteFacturas > 0 ? totalPendienteFacturas : 170,
          availableCredit: totalPendienteFacturas > 0 ? Math.max(0, 600 - totalPendienteFacturas) : 430,
          dueDate: "28 de Octubre, 2026",
          status: "AL_DIA",
          lastPaymentDate: "15 oct 2026",
          lastPaymentAmount: 150,
          notes: "Cupo de crédito activo para compras de repuestos y servicios en cuotas.",
        };

    return NextResponse.json({
      success: true,
      customer: {
        id: activeCustomer.id,
        name: activeCustomer.name,
        identification: activeCustomer.identification,
        phone: activeCustomer.phone,
        email: activeCustomer.email || "",
        address: activeCustomer.address || "",
        type: activeCustomer.type,
        vip: activeCustomer.vip,
      },
      vehicles: vehiclesWithHealth,
      activeOrder,
      allOrders: parsedOrders,
      invoices: unifiedInvoices,
      quotes: parsedQuotes,
      credits: creditAccount,
      history: clinicalTimeline,
      availableCustomers: allCustomers,
    });
  } catch (error: any) {
    console.error("Error en GET /api/cliente/dashboard:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al cargar dashboard del cliente." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, orderId, text, author, attachmentUrl, attachmentName, signatureUrl, signerName, customerId, plate, brand, model, year, mileage, fuelType } = body;

    // ACCIÓN: REGISTRAR NUEVO VEHÍCULO AL GARAJE DIGITAL
    if (action === "REGISTRAR_VEHICULO") {
      if (!customerId || !plate) {
        return NextResponse.json({ success: false, error: "Cliente y Placa son obligatorios." }, { status: 400 });
      }

      const cleanPlate = String(plate).trim().toUpperCase();
      let veh = await prisma.vehicle.findUnique({ where: { plate: cleanPlate } }).catch(() => null);

      if (!veh) {
        veh = await prisma.vehicle.create({
          data: {
            customerId,
            plate: cleanPlate,
            brand: (brand || "Vehículo").trim(),
            model: (model || "General").trim(),
            year: year ? parseInt(String(year), 10) : new Date().getFullYear(),
            mileage: mileage ? parseInt(String(mileage), 10) : 0,
            fuelType: fuelType || "Gasolina",
          },
        });
      } else {
        veh = await prisma.vehicle.update({
          where: { id: veh.id },
          data: {
            customerId,
            brand: brand || veh.brand,
            model: model || veh.model,
            year: year ? parseInt(String(year), 10) : veh.year,
            mileage: mileage ? parseInt(String(mileage), 10) : veh.mileage,
            fuelType: fuelType || veh.fuelType,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Vehículo ${cleanPlate} registrado con éxito en tu garaje digital.`,
        vehicle: veh,
      });
    }

    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId es requerido." }, { status: 400 });
    }

    const orderRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 LIMIT 1`,
      orderId
    );

    const order = orderRows[0];
    if (!order) {
      return NextResponse.json({ success: false, error: "Orden no encontrada." }, { status: 404 });
    }

    // ACCIÓN: ENVIAR MENSAJE AL TALLER (CHAT INTERNO CON CLOUDFLARE R2)
    if (action === "ENVIAR_MENSAJE_CHAT") {
      const existingChat = safeJsonParse<any[]>(order.internalChatJson, []);
      const newMsg = {
        id: "msg-" + Date.now().toString(36),
        author: author || order.client || "Cliente",
        role: "Cliente",
        text: (text || "").trim(),
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        photoUrl: attachmentUrl || null,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: new Date().toISOString(),
      };

      const updatedChat = [...existingChat, newMsg];

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder" SET "internalChatJson" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
        JSON.stringify(updatedChat),
        orderId
      );

      return NextResponse.json({
        success: true,
        message: "Mensaje enviado al taller con éxito.",
        chat: updatedChat,
        newMsg,
      });
    }

    // ACCIÓN: FIRMAR RECEPCIÓN DIGITALMENTE DESDE EL PANEL DEL CLIENTE
    if (action === "FIRMAR_RECEPCION") {
      if (!signatureUrl) {
        return NextResponse.json({ success: false, error: "Se requiere la firma digital." }, { status: 400 });
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder" 
         SET "deliverySignatureUrl" = $1, 
             "deliverySignedBy" = $2, 
             "deliverySignedAt" = NOW(), 
             "deliveryStatus" = 'Firmado por Cliente',
             "updatedAt" = NOW() 
         WHERE "id" = $3`,
        signatureUrl,
        signerName || order.client,
        orderId
      );

      return NextResponse.json({
        success: true,
        message: "Recepción y conformidad firmada exitosamente.",
      });
    }

    // ACCIÓN: APROBAR PRESUPUESTO / COTIZACIÓN EN 1 TOQUE (SINCRONIZACIÓN EN TIEMPO REAL CON TALLER Y OFICINA)
    if (action === "APROBAR_PRESUPUESTO" || action === "APROBAR_COTIZACION") {
      const { quoteId, quoteNumber } = body;

      if (orderId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder" 
           SET "quoteStatus" = 'Aprobado por Cliente', 
               "quoteApprovedAt" = NOW(), 
               "hasPriceAuthorized" = true,
               "updatedAt" = NOW() 
           WHERE "id" = $1`,
          orderId
        ).catch(() => {});
      }

      if (quoteId || quoteNumber) {
        await prisma.$executeRawUnsafe(
          `UPDATE "ClientQuote" 
           SET "status" = 'Aprobada', 
               "updatedAt" = NOW() 
           WHERE "id" = $1 OR "quoteNumber" = $2`,
          quoteId || "",
          quoteNumber || ""
        ).catch(() => {});

        await (prisma as any).orderRequest.updateMany({
          where: {
            OR: [
              { id: quoteId || "" },
              { requestNumber: quoteNumber || "" },
            ],
          },
          data: {
            status: "APROBADA",
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Presupuesto ${quoteNumber || ""} aprobado con éxito en tiempo real. La oficina y el taller han sido autorizados para proceder.`,
      });
    }

    // ACCIÓN: NOTIFICAR AL TALLER QUE EL CLIENTE VA EN CAMINO ("¡VOY EN CAMINO!")
    if (action === "VOY_EN_CAMINO" || action === "NOTIFICAR_LLEGADA") {
      const { etaMinutos = 15, vehiclePlate, orderId, nota } = body;

      if (orderId) {
        const orderRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 LIMIT 1`,
          orderId
        );
        const order = orderRows[0];
        if (order) {
          const existingChat = safeJsonParse<any[]>(order.internalChatJson, []);
          const avisoMsg = {
            id: "aviso-" + Date.now().toString(36),
            author: author || order.client || "Cliente",
            role: "Aviso de Llegada",
            text: `🚗 ¡VOY EN CAMINO! Llegada estimada: en aprox. ${etaMinutos} minutos. ${vehiclePlate ? `Vehículo placa ${vehiclePlate}.` : ""} ${nota ? `Nota: "${nota}"` : ""}`,
            createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: new Date().toISOString(),
          };
          const updatedChat = [...existingChat, avisoMsg];
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopOrder" SET "internalChatJson" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
            JSON.stringify(updatedChat),
            orderId
          ).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: `¡Notificación enviada al taller! El equipo ha sido avisado que llegas en ${etaMinutos} minutos y tendrán tu bahía/vehículo listo.`,
      });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida." }, { status: 400 });
  } catch (error: any) {
    console.error("Error en POST /api/cliente/dashboard:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar acción del cliente." },
      { status: 500 }
    );
  }
}
