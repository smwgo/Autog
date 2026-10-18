import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let schemaEnsured = false;

async function ensureTallerSchema() {
  if (schemaEnsured) return;
  try {
    const statements = [
      `ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "vehicleType" TEXT DEFAULT 'Auto'`,
      `ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "nextOilChangeMileage" INTEGER`,
      `ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "customerId" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "clientIdDoc" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "mileage" INTEGER`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "nextOilChangeKm" INTEGER`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "itemsJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "receptionPhotosJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "evidencePhotosJson" TEXT DEFAULT '[]'`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3)`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3)`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER DEFAULT 0`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "posRequestId" TEXT`,
      `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "stockDeducted" BOOLEAN DEFAULT false`,
      `ALTER TABLE "WorkshopHistory" ADD COLUMN IF NOT EXISTS "nextOilChangeKm" INTEGER`,
      `ALTER TABLE "WorkshopHistory" ADD COLUMN IF NOT EXISTS "photosJson" TEXT DEFAULT '[]'`,
    ];

    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql).catch(() => {});
    }
    schemaEnsured = true;
  } catch (err) {
    console.warn("Aviso al verificar esquema de Taller:", err);
  }
}

function safeParseJson<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function formatDurationText(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
}

function mapOrderRow(r: any) {
  const rawItems = safeParseJson<any[]>(r.itemsJson, []);
  const legacyServices = safeParseJson<string[]>(r.servicesJson, []);

  // Si la orden venía del formato anterior (solo nombres en servicesJson), construir items compatibles
  const items =
    rawItems.length > 0
      ? rawItems
      : legacyServices.map((srvName, idx) => ({
          id: `legacy-${r.id}-${idx}`,
          type: "SERVICE",
          category: "Mecánica Rápida",
          code: `SRV-0${idx + 1}`,
          name: srvName,
          price:
            legacyServices.length > 0 && r.totalCost
              ? Number((Number(r.totalCost) / legacyServices.length).toFixed(2))
              : 25,
          qty: 1,
          status:
            r.status === "Listo para Entregar" || r.status === "LISTO_PARA_COBRO"
              ? "Listo"
              : r.status === "Reparando" || r.status === "En Proceso"
              ? "En Proceso"
              : "Pendiente",
        }));

  const receptionPhotos = safeParseJson<string[]>(r.receptionPhotosJson, []);
  const evidencePhotos = safeParseJson<string[]>(r.evidencePhotosJson, []);

  const totalFromItems = items.reduce(
    (acc: number, it: any) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const totalCost = items.length > 0 ? totalFromItems : Number(r.totalCost || 0);

  let progress = Number(r.progress || 0);
  if (items.length > 0) {
    const points = items.reduce((acc: number, it: any) => {
      if (it.status === "Listo") return acc + 1;
      if (it.status === "En Proceso") return acc + 0.5;
      return acc;
    }, 0);
    progress = Math.round((points / items.length) * 100);
  }

  return {
    id: r.id,
    orderNumber: r.orderNumber,
    customerId: r.customerId || null,
    vehicleId: r.vehicleId || null,
    vehicle: r.vehicle,
    plate: r.plate,
    client: r.client,
    clientPhone: r.clientPhone || "",
    clientIdDoc: r.clientIdDoc || "",
    mechanic: r.mechanic || "Carlos Rodríguez",
    status: r.status || "En Pista",
    progress,
    mileage: r.mileage ? Number(r.mileage) : null,
    nextOilChangeKm: r.nextOilChangeKm
      ? Number(r.nextOilChangeKm)
      : r.mileage
      ? Number(r.mileage) + 5000
      : null,
    items,
    services: items.map((i: any) => i.name),
    receptionPhotos,
    evidencePhotos,
    notes: r.notes || "",
    dateIn: r.dateIn,
    startedAt: r.startedAt || null,
    completedAt: r.completedAt || null,
    durationMinutes: Number(r.durationMinutes || 0),
    totalCost,
    posRequestId: r.posRequestId || null,
    stockDeducted: Boolean(r.stockDeducted),
    updatedAt: r.updatedAt,
  };
}

// GET: Buscador por Placa/Cédula + Inicialización de Autos en Pista, Inventario y Mecánicos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryRaw = (searchParams.get("q") || "").trim();
    const plateParam = (searchParams.get("plate") || "").trim().toUpperCase();

    return await withRetry(async () => {
      await ensureTallerSchema();

      // 1. Consulta específica de historial por placa
      if (plateParam && searchParams.get("historial") === "true") {
        const [historyRows, orderRows] = (await Promise.all([
          prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopHistory" WHERE UPPER("plate") = $1 ORDER BY "createdAt" DESC LIMIT 30`,
            plateParam
          ),
          prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopOrder" WHERE UPPER("plate") = $1 ORDER BY "createdAt" DESC LIMIT 20`,
            plateParam
          ),
        ])) as [any[], any[]];

        const history = historyRows.map((h: any) => ({
          id: h.id,
          serviceCode: h.serviceCode,
          orderNumber: h.orderNumber || h.serviceCode,
          date: h.date,
          vehicle: h.vehicle,
          plate: h.plate,
          client: h.client,
          services: safeParseJson<string[]>(h.servicesJson, []),
          cost: Number(h.cost || 0),
          mechanic: h.mechanic || "Carlos Rodríguez",
          mileage: h.mileage || "N/A",
          nextOilChangeKm: h.nextOilChangeKm || null,
          photos: safeParseJson<string[]>(h.photosJson, []),
          notes: h.notes || "",
        }));

        return NextResponse.json({
          success: true,
          history,
          orders: orderRows.map(mapOrderRow),
        });
      }

      // 2. Búsqueda rápida por Placa o Cédula/RUC/Nombre
      if (queryRaw) {
        const cleanQ = queryRaw.toUpperCase();

        // Buscar primero vehículo por placa exacta o parcial
        const vehiclesFound: any[] = await prisma.vehicle.findMany({
          where: {
            OR: [
              { plate: { equals: cleanQ, mode: "insensitive" } },
              { plate: { contains: queryRaw, mode: "insensitive" } },
              { vin: { contains: queryRaw, mode: "insensitive" } },
            ],
          },
          include: {
            customer: {
              include: { vehicles: true },
            },
          },
          take: 5,
        });

        let matchedVehicle: any = vehiclesFound[0] || null;
        let matchedCustomer: any = matchedVehicle?.customer || null;

        // Si no se halló por placa, buscar cliente por Cédula/RUC, nombre o teléfono
        if (!matchedCustomer) {
          const customersFound = await prisma.customer.findMany({
            where: {
              OR: [
                { identification: { equals: queryRaw, mode: "insensitive" } },
                { identification: { contains: queryRaw, mode: "insensitive" } },
                { name: { contains: queryRaw, mode: "insensitive" } },
                { phone: { contains: queryRaw, mode: "insensitive" } },
              ],
            },
            include: {
              vehicles: true,
            },
            take: 5,
          });

          if (customersFound.length > 0) {
            matchedCustomer = customersFound[0];
            matchedVehicle = matchedCustomer.vehicles?.[0] || null;
          }
        }

        if (matchedVehicle || matchedCustomer) {
          const targetPlate = matchedVehicle?.plate?.toUpperCase() || "";

          let activeOrder = null;
          let history: any[] = [];

          if (targetPlate) {
            const activeOrdersRows: any[] = await prisma.$queryRawUnsafe(
              `SELECT * FROM "WorkshopOrder"
               WHERE UPPER("plate") = $1
                 AND "status" NOT IN ('Entregado', 'ENTREGADO', 'Cancelado', 'CANCELADO')
               ORDER BY "updatedAt" DESC LIMIT 1`,
              targetPlate
            );
            if (activeOrdersRows.length > 0) {
              activeOrder = mapOrderRow(activeOrdersRows[0]);
            }

            const historyRows: any[] = await prisma.$queryRawUnsafe(
              `SELECT * FROM "WorkshopHistory" WHERE UPPER("plate") = $1 ORDER BY "createdAt" DESC LIMIT 15`,
              targetPlate
            );
            history = historyRows.map((h: any) => ({
              id: h.id,
              serviceCode: h.serviceCode,
              orderNumber: h.orderNumber || h.serviceCode,
              date: h.date,
              vehicle: h.vehicle,
              plate: h.plate,
              client: h.client,
              services: safeParseJson<string[]>(h.servicesJson, []),
              cost: Number(h.cost || 0),
              mechanic: h.mechanic || "Carlos Rodríguez",
              mileage: h.mileage || "N/A",
              nextOilChangeKm: h.nextOilChangeKm || null,
              photos: safeParseJson<string[]>(h.photosJson, []),
              notes: h.notes || "",
            }));
          }

          return NextResponse.json({
            success: true,
            found: true,
            vehicle: matchedVehicle
              ? {
                  ...matchedVehicle,
                  photos: safeParseJson<string[]>((matchedVehicle as any).photosJson, []),
                }
              : null,
            customer: matchedCustomer,
            customerVehicles: matchedCustomer?.vehicles || [],
            activeOrder,
            history,
          });
        }

        // Determinar si la búsqueda parece placa o cédula/RUC
        const looksLikeCedula = /^\d{8,13}$/.test(queryRaw.replace(/[-\s]/g, ""));
        return NextResponse.json({
          success: true,
          found: false,
          suggestedPlate: looksLikeCedula ? "" : cleanQ,
          suggestedIdentification: looksLikeCedula ? queryRaw : "",
        });
      }

      // 3. Carga inicial del Panel Taller: Autos en Pista + Repuestos (Oficina) + Servicios + Mecánicos
      const [ordersRows, products, services, employeesRows] = (await Promise.all([
        prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE "status" NOT IN ('Entregado', 'ENTREGADO', 'Cancelado', 'CANCELADO')
           ORDER BY "updatedAt" DESC LIMIT 30`
        ),
        prisma.product.findMany({
          orderBy: { name: "asc" },
        }),
        prisma.$queryRawUnsafe(`SELECT * FROM "WorkshopService" WHERE "active" = true ORDER BY "name" ASC`).catch(() => []),
        prisma.$queryRawUnsafe(`SELECT * FROM "Employee" WHERE "status" = 'Activo' ORDER BY "name" ASC`).catch(() => []),
      ])) as [any[], any[], any[], any[]];

      const autosEnPista = ordersRows.map(mapOrderRow);

      const mecanicosList =
        employeesRows.length > 0
          ? employeesRows.map((e: any) => e.name)
          : ["Carlos Rodríguez", "Luis Martínez", "Ana Torres", "Miguel Ángel"];

      return NextResponse.json({
        success: true,
        autosEnPista,
        productos: products.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          brand: p.brand || "Genérico",
          category: p.category || "Repuestos",
          price: Number(p.price || 0),
          stock: Number(p.stock ?? 0),
          minStock: Number(p.minStock ?? 5),
          status: p.status,
          imageUrl: p.imageUrl || null,
        })),
        servicios: services.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          category: s.category,
          price: Number(s.price || 0),
          estimatedMinutes: Number(s.estimatedMinutes || 30),
        })),
        mecanicos: mecanicosList,
      });
    });
  } catch (error: any) {
    console.error("Error en GET /api/taller/operacion:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al cargar operación de taller." },
      { status: 500 }
    );
  }
}

// POST: Acciones operativas en tiempo real (Registro Express, Orden Unificada, Cronómetro, R2, Envío a POS)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    return await withRetry(async () => {
      await ensureTallerSchema();

      // =========================================================================
      // ACCIÓN 1: REGISTRO EXPRESS (Cliente + Vehículo + Apertura de Orden #OT)
      // =========================================================================
      if (action === "REGISTRO_EXPRESS") {
        const {
          identificacion,
          nombres,
          telefono,
          email,
          placa,
          tipoVehiculo = "Auto",
          marca,
          modelo,
          anio,
          color,
          kilometraje,
          mechanic = "Carlos Rodríguez",
          receptionPhotos = [],
        } = body;

        if (!placa || !nombres || !marca || !modelo) {
          return NextResponse.json(
            {
              success: false,
              error: "Placa, Nombres del cliente, Marca y Modelo son obligatorios.",
            },
            { status: 400 }
          );
        }

        const cleanPlate = placa.trim().toUpperCase();
        const cleanIdent =
          (identificacion || "").trim() || `CLI-${Date.now().toString().slice(-6)}`;
        const kmNum = kilometraje ? parseInt(String(kilometraje), 10) || 0 : 0;
        const yearNum = anio ? parseInt(String(anio), 10) || new Date().getFullYear() : new Date().getFullYear();

        // 1. Upsert Cliente en Neon (disponible en Clientes, Oficina y POS)
        let customer = await prisma.customer.findUnique({
          where: { identification: cleanIdent },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              identification: cleanIdent,
              name: nombres.trim(),
              phone: (telefono || "").trim() || "S/N",
              email: email?.trim() || null,
              type: cleanIdent.length === 13 ? "Empresa" : "Personal",
            },
          });
        } else {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              name: nombres.trim() || customer.name,
              phone: (telefono || "").trim() || customer.phone,
              email: email?.trim() || customer.email,
              lastVisit: new Date(),
            },
          });
        }

        // 2. Upsert Vehículo en Neon
        let vehicle = await prisma.vehicle.findUnique({
          where: { plate: cleanPlate },
        });

        const photosJsonStr = JSON.stringify(Array.isArray(receptionPhotos) ? receptionPhotos : []);

        if (!vehicle) {
          vehicle = await prisma.vehicle.create({
            data: {
              customerId: customer.id,
              plate: cleanPlate,
              brand: marca.trim(),
              model: modelo.trim(),
              year: yearNum,
              color: color?.trim() || null,
              mileage: kmNum,
              fuelType: "Gasolina",
            },
          });
        } else {
          vehicle = await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: {
              customerId: customer.id,
              brand: marca.trim(),
              model: modelo.trim(),
              year: yearNum,
              color: color?.trim() || vehicle.color,
              mileage: kmNum || vehicle.mileage,
            },
          });
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "Vehicle" SET "vehicleType" = $2, "nextOilChangeMileage" = $3, "photosJson" = $4 WHERE "id" = $1`,
          vehicle.id,
          tipoVehiculo,
          kmNum > 0 ? kmNum + 5000 : null,
          photosJsonStr
        );

        // 3. Crear Orden de Trabajo Unificada activa inmediatamente
        const orderId = "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const orderNumber = `OT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const vehicleTitle = `${marca.trim()} ${modelo.trim()} ${yearNum}`;
        const nextOilKm = kmNum > 0 ? kmNum + 5000 : null;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "WorkshopOrder" (
            "id", "orderNumber", "customerId", "vehicleId", "vehicle", "plate",
            "client", "clientPhone", "clientIdDoc", "mechanic", "status", "progress",
            "mileage", "nextOilChangeKm", "servicesJson", "itemsJson",
            "receptionPhotosJson", "evidencePhotosJson", "notes", "estimatedOut",
            "totalCost", "dateIn", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, 'En Pista', 10,
            $11, $12, '[]', '[]',
            $13, '[]', $14, 'Hoy',
            0, NOW(), NOW(), NOW()
          )`,
          orderId,
          orderNumber,
          customer.id,
          vehicle.id,
          vehicleTitle,
          cleanPlate,
          customer.name,
          customer.phone,
          customer.identification,
          mechanic,
          kmNum,
          nextOilKm,
          photosJsonStr,
          `Ingreso Express (${tipoVehiculo}). Kilometraje: ${kmNum} km.`
        );

        const createdRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          orderId
        );

        return NextResponse.json({
          success: true,
          customer,
          vehicle: {
            ...vehicle,
            vehicleType: tipoVehiculo,
            nextOilChangeMileage: nextOilKm,
            photos: Array.isArray(receptionPhotos) ? receptionPhotos : [],
          },
          activeOrder: mapOrderRow(createdRows[0]),
          message: `Vehículo ${cleanPlate} registrado y Orden ${orderNumber} abierta en pista.`,
        });
      }

      // =========================================================================
      // ACCIÓN 2: ABRIR O RECUPERAR ORDEN PARA VEHÍCULO EXISTENTE
      // =========================================================================
      if (action === "ABRIR_ORDEN_VEHICULO") {
        const {
          vehicleId,
          plate,
          mileage,
          receptionPhotos,
          mechanic = "Carlos Rodríguez",
        } = body;

        const cleanPlate = (plate || "").trim().toUpperCase();
        if (!cleanPlate && !vehicleId) {
          return NextResponse.json(
            { success: false, error: "Placa o ID de vehículo requerido." },
            { status: 400 }
          );
        }

        const vehicle = await prisma.vehicle.findFirst({
          where: vehicleId ? { id: vehicleId } : { plate: cleanPlate },
          include: { customer: true },
        });

        if (!vehicle) {
          return NextResponse.json(
            { success: false, error: "Vehículo no encontrado en Neon." },
            { status: 404 }
          );
        }

        const kmNum =
          mileage !== undefined && mileage !== null && mileage !== ""
            ? parseInt(String(mileage), 10)
            : vehicle.mileage || 0;
        const nextOilKm = kmNum > 0 ? kmNum + 5000 : null;

        // Actualizar kilometraje y fotos del vehículo si fueron provistos
        const existingPhotos = safeParseJson<string[]>((vehicle as any).photosJson, []);
        const mergedPhotos =
          Array.isArray(receptionPhotos) && receptionPhotos.length > 0
            ? receptionPhotos
            : existingPhotos;

        await prisma.$executeRawUnsafe(
          `UPDATE "Vehicle" SET "mileage" = $2, "nextOilChangeMileage" = COALESCE($3, "nextOilChangeMileage"), "photosJson" = $4, "updatedAt" = NOW() WHERE "id" = $1`,
          vehicle.id,
          kmNum,
          nextOilKm,
          JSON.stringify(mergedPhotos)
        );

        // Verificar si ya tiene orden activa en pista
        const existingOrders: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder"
           WHERE UPPER("plate") = $1
             AND "status" NOT IN ('Entregado', 'ENTREGADO', 'Cancelado', 'CANCELADO')
           ORDER BY "updatedAt" DESC LIMIT 1`,
          vehicle.plate.toUpperCase()
        );

        if (existingOrders.length > 0) {
          const current = existingOrders[0];
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "mileage" = COALESCE($2, "mileage"),
                 "nextOilChangeKm" = COALESCE($3, "nextOilChangeKm"),
                 "receptionPhotosJson" = $4,
                 "updatedAt" = NOW()
             WHERE "id" = $1`,
            current.id,
            kmNum || null,
            nextOilKm,
            JSON.stringify(mergedPhotos)
          );

          const updatedRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
            current.id
          );
          return NextResponse.json({
            success: true,
            activeOrder: mapOrderRow(updatedRows[0]),
          });
        }

        // Crear nueva orden en pista
        const orderId = "ord_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const orderNumber = `OT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const vehicleTitle = `${vehicle.brand} ${vehicle.model}${vehicle.year ? " " + vehicle.year : ""}`;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "WorkshopOrder" (
            "id", "orderNumber", "customerId", "vehicleId", "vehicle", "plate",
            "client", "clientPhone", "clientIdDoc", "mechanic", "status", "progress",
            "mileage", "nextOilChangeKm", "servicesJson", "itemsJson",
            "receptionPhotosJson", "evidencePhotosJson", "notes", "estimatedOut",
            "totalCost", "dateIn", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, 'En Pista', 10,
            $11, $12, '[]', '[]',
            $13, '[]', $14, 'Hoy',
            0, NOW(), NOW(), NOW()
          )`,
          orderId,
          orderNumber,
          vehicle.customerId,
          vehicle.id,
          vehicleTitle,
          vehicle.plate.toUpperCase(),
          vehicle.customer?.name || "Cliente Taller",
          vehicle.customer?.phone || "",
          vehicle.customer?.identification || "",
          mechanic,
          kmNum,
          nextOilKm,
          JSON.stringify(mergedPhotos),
          `Recepción en pista. Kilometraje: ${kmNum} km.`
        );

        const createdRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          orderId
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(createdRows[0]),
        });
      }

      // =========================================================================
      // ACCIÓN 3: ACTUALIZAR ORDEN UNIFICADA (Servicios, Repuestos, Fotos, Notas, Km)
      // =========================================================================
      if (action === "ACTUALIZAR_ORDEN") {
        const {
          orderId,
          items,
          mechanic,
          mileage,
          nextOilChangeKm,
          notes,
          receptionPhotos,
          evidencePhotos,
          status,
        } = body;

        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        const existingRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (existingRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const current = existingRows[0];
        const finalItems = Array.isArray(items)
          ? items
          : safeParseJson<any[]>(current.itemsJson, []);

        const totalCost = finalItems.reduce(
          (acc: number, it: any) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
          0
        );
        const servicesNames = finalItems.map((it: any) =>
          it.qty && Number(it.qty) > 1 ? `${it.qty}x ${it.name}` : it.name
        );

        let progress = Number(current.progress || 10);
        if (finalItems.length > 0) {
          const completedPoints = finalItems.reduce((acc: number, it: any) => {
            if (it.status === "Listo") return acc + 1;
            if (it.status === "En Proceso") return acc + 0.5;
            return acc;
          }, 0);
          progress = Math.max(10, Math.round((completedPoints / finalItems.length) * 100));
        }

        const finalReceptionPhotos = Array.isArray(receptionPhotos)
          ? receptionPhotos
          : safeParseJson<string[]>(current.receptionPhotosJson, []);

        const finalEvidencePhotos = Array.isArray(evidencePhotos)
          ? evidencePhotos
          : safeParseJson<string[]>(current.evidencePhotosJson, []);

        const finalMileage =
          mileage !== undefined && mileage !== null && mileage !== ""
            ? parseInt(String(mileage), 10)
            : current.mileage;

        const finalNextOilKm =
          nextOilChangeKm !== undefined && nextOilChangeKm !== null && nextOilChangeKm !== ""
            ? parseInt(String(nextOilChangeKm), 10)
            : finalMileage
            ? Number(finalMileage) + 5000
            : current.nextOilChangeKm;

        let finalStatus = status || current.status;
        if (
          finalItems.length > 0 &&
          finalItems.every((i: any) => i.status === "Listo") &&
          finalStatus !== "LISTO_PARA_COBRO"
        ) {
          finalStatus = "Listo para Entregar";
          progress = 100;
        } else if (
          finalItems.some((i: any) => i.status === "En Proceso" || i.status === "Listo") &&
          finalStatus === "En Pista"
        ) {
          finalStatus = "En Proceso";
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "itemsJson" = $2,
               "servicesJson" = $3,
               "totalCost" = $4,
               "progress" = $5,
               "mechanic" = COALESCE($6, "mechanic"),
               "mileage" = COALESCE($7, "mileage"),
               "nextOilChangeKm" = COALESCE($8, "nextOilChangeKm"),
               "notes" = COALESCE($9, "notes"),
               "receptionPhotosJson" = $10,
               "evidencePhotosJson" = $11,
               "status" = $12,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          current.id,
          JSON.stringify(finalItems),
          JSON.stringify(servicesNames),
          totalCost,
          progress,
          mechanic || null,
          finalMileage ?? null,
          finalNextOilKm ?? null,
          notes !== undefined ? notes : null,
          JSON.stringify(finalReceptionPhotos),
          JSON.stringify(finalEvidencePhotos),
          finalStatus
        );

        // Sincronizar kilometraje y fotos con el expediente del vehículo (Oficina / Clientes)
        if (current.plate) {
          await prisma.$executeRawUnsafe(
            `UPDATE "Vehicle"
             SET "mileage" = COALESCE($2, "mileage"),
                 "nextOilChangeMileage" = COALESCE($3, "nextOilChangeMileage"),
                 "photosJson" = $4,
                 "updatedAt" = NOW()
             WHERE UPPER("plate") = $1`,
            current.plate.toUpperCase(),
            finalMileage ?? null,
            finalNextOilKm ?? null,
            JSON.stringify([...finalReceptionPhotos, ...finalEvidencePhotos].slice(0, 12))
          ).catch(() => {});
        }

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          current.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
        });
      }

      // =========================================================================
      // ACCIÓN 4: INICIAR ORDEN (Guarda startedAt en Neon y activa cronómetro)
      // =========================================================================
      if (action === "INICIAR_ORDEN") {
        const { orderId, mechanic } = body;
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "startedAt" = COALESCE("startedAt", NOW()),
               "status" = 'En Proceso',
               "mechanic" = COALESCE($2, "mechanic"),
               "progress" = GREATEST("progress", 25),
               "updatedAt" = NOW()
           WHERE "id" = $1 OR "orderNumber" = $1`,
          orderId,
          mechanic || null
        );

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          message: "Cronómetro de orden iniciado en tiempo real.",
        });
      }

      // =========================================================================
      // ACCIÓN 5: ENVIAR A POS / CAJA + DESCUENTO DE STOCK + TIEMPOS + HISTORIAL
      // =========================================================================
      if (action === "ENVIAR_A_POS") {
        const { orderId } = body;
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "ID de orden requerido." },
            { status: 400 }
          );
        }

        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
          orderId
        );

        if (rows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Orden no encontrada." },
            { status: 404 }
          );
        }

        const order = mapOrderRow(rows[0]);
        if (order.items.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Agrega al menos un servicio o repuesto antes de enviar a Caja / POS.",
            },
            { status: 400 }
          );
        }

        // Marcar todos los ítems como "Listo"
        const completedItems = order.items.map((it: any) => ({
          ...it,
          status: "Listo",
        }));

        const now = new Date();
        const startMs = order.startedAt
          ? new Date(order.startedAt).getTime()
          : new Date(order.dateIn || now).getTime();
        const elapsedMinutes = Math.max(
          15,
          Math.round((now.getTime() - startMs) / 60000)
        );

        // 1. OFICINA / INVENTARIO: Descontar stock de los repuestos/insumos usados (una sola vez)
        if (!order.stockDeducted) {
          for (const item of completedItems) {
            if (item.type === "PART" && item.productId) {
              const prod = await prisma.product
                .findUnique({ where: { id: item.productId } })
                .catch(() => null);
              if (prod) {
                const usedQty = Math.max(1, Number(item.qty) || 1);
                const newStock = Math.max(0, Number(prod.stock || 0) - usedQty);
                const minStock = Number(prod.minStock || 5);
                const newStatus =
                  newStock <= 0
                    ? "Agotado"
                    : newStock <= minStock
                    ? "Bajo Stock"
                    : "En Stock";

                await prisma.product.update({
                  where: { id: prod.id },
                  data: {
                    stock: newStock,
                    status: newStatus,
                  },
                });
              }
            }
          }
        }

        // 2. POS (CAJA): Crear/actualizar OrderRequest para facturar sin volver a digitar
        const itemsSummary = completedItems
          .map((i: any) => `${i.qty || 1}x ${i.name}`)
          .join(", ");

        const posItemsPayload = completedItems.map((i: any) => ({
          id: i.productId || i.id,
          code: i.code || "TAL",
          name: i.name,
          brand: order.plate,
          category: i.category || "Taller",
          price: Number(i.price) || 0,
          qty: Number(i.qty) || 1,
        }));

        const requestNumber = order.orderNumber.startsWith("OT-")
          ? order.orderNumber
          : `OT-${order.orderNumber}`;

        const existingReq = await prisma.orderRequest
          .findUnique({ where: { requestNumber } })
          .catch(() => null);

        let posRequest: any;
        if (existingReq) {
          posRequest = await prisma.orderRequest.update({
            where: { id: existingReq.id },
            data: {
              customerName: order.client,
              customerPhone: order.clientPhone || null,
              vehicleInfo: `${order.vehicle} [${order.plate}]`,
              itemsSummary,
              itemsJson: JSON.stringify(posItemsPayload),
              totalEstimated: order.totalCost,
              notes: `Orden Taller ${order.orderNumber} | Mecánico: ${order.mechanic} | Km: ${order.mileage || "N/A"}`,
              status: "PENDIENTE",
            },
          });
        } else {
          posRequest = await prisma.orderRequest.create({
            data: {
              requestNumber,
              type: "TALLER",
              customerName: order.client,
              customerPhone: order.clientPhone || null,
              vehicleInfo: `${order.vehicle} [${order.plate}]`,
              itemsSummary,
              itemsJson: JSON.stringify(posItemsPayload),
              totalEstimated: order.totalCost,
              notes: `Orden Taller ${order.orderNumber} | Mecánico: ${order.mechanic} | Km: ${order.mileage || "N/A"}`,
              status: "PENDIENTE",
            },
          });
        }

        // 3. GERENCIA: Registrar tiempo real de ejecución y productividad en WorkshopTimeLog
        const logNumber = `TL-${order.orderNumber.replace(/[^0-9A-Z]/gi, "").slice(-6)}`;
        const dateStr = now.toISOString().split("T")[0];
        const durationStr = formatDurationText(elapsedMinutes);

        const existingLog: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id" FROM "WorkshopTimeLog" WHERE "orderId" = $1 LIMIT 1`,
          order.orderNumber
        );

        if (existingLog.length > 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopTimeLog"
             SET "task" = $2, "mechanic" = $3, "duration" = $4, "durationMinutes" = $5, "revenue" = $6, "status" = 'Finalizado', "updatedAt" = NOW()
             WHERE "id" = $1`,
            existingLog[0].id,
            itemsSummary.slice(0, 140),
            order.mechanic,
            durationStr,
            elapsedMinutes,
            order.totalCost
          );
        } else {
          const tlogId = "tlog_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkshopTimeLog" ("id", "logNumber", "task", "orderId", "vehicle", "mechanic", "date", "duration", "durationMinutes", "status", "revenue", "notes", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Finalizado', $10, $11, NOW(), NOW())`,
            tlogId,
            logNumber,
            itemsSummary.slice(0, 140),
            order.orderNumber,
            `${order.vehicle} (${order.plate})`,
            order.mechanic,
            dateStr,
            durationStr,
            elapsedMinutes,
            order.totalCost,
            `Ejecución real: ${durationStr} | Técnico: ${order.mechanic}`
          );
        }

        // 4. CLIENTES: Actualizar historial de mantenimiento, próximo cambio de aceite y fotos R2
        const allPhotos = [...order.receptionPhotos, ...order.evidencePhotos];
        const existingHist: any[] = await prisma.$queryRawUnsafe(
          `SELECT "id" FROM "WorkshopHistory" WHERE "orderNumber" = $1 LIMIT 1`,
          order.orderNumber
        );

        const historyNotes = [
          order.notes,
          order.nextOilChangeKm
            ? `Próximo cambio de aceite sugerido: ${order.nextOilChangeKm.toLocaleString()} km.`
            : null,
        ]
          .filter(Boolean)
          .join(" | ");

        if (existingHist.length > 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE "WorkshopHistory"
             SET "servicesJson" = $2, "cost" = $3, "mechanic" = $4, "mileage" = $5, "nextOilChangeKm" = $6, "photosJson" = $7, "notes" = $8, "updatedAt" = NOW()
             WHERE "id" = $1`,
            existingHist[0].id,
            JSON.stringify(completedItems.map((i: any) => i.name)),
            order.totalCost,
            order.mechanic,
            order.mileage ? `${order.mileage.toLocaleString()} km` : "N/A",
            order.nextOilChangeKm,
            JSON.stringify(allPhotos),
            historyNotes
          );
        } else {
          const hstId = "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const serviceCode = `SRV-${Date.now().toString().slice(-5)}`;
          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkshopHistory" (
              "id", "serviceCode", "date", "vehicle", "plate", "client",
              "servicesJson", "cost", "mechanic", "mileage", "nextOilChangeKm",
              "photosJson", "notes", "orderNumber", "createdAt", "updatedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11,
              $12, $13, $14, NOW(), NOW()
            )`,
            hstId,
            serviceCode,
            dateStr,
            order.vehicle,
            order.plate.toUpperCase(),
            order.client,
            JSON.stringify(completedItems.map((i: any) => i.name)),
            order.totalCost,
            order.mechanic,
            order.mileage ? `${order.mileage.toLocaleString()} km` : "N/A",
            order.nextOilChangeKm,
            JSON.stringify(allPhotos),
            historyNotes,
            order.orderNumber
          );
        }

        // 5. Actualizar estado final de la Orden de Taller a LISTO_PARA_COBRO
        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "status" = 'LISTO_PARA_COBRO',
               "progress" = 100,
               "itemsJson" = $2,
               "servicesJson" = $3,
               "completedAt" = NOW(),
               "durationMinutes" = $4,
               "posRequestId" = $5,
               "stockDeducted" = true,
               "updatedAt" = NOW()
           WHERE "id" = $1`,
          order.id,
          JSON.stringify(completedItems),
          JSON.stringify(completedItems.map((i: any) => i.name)),
          elapsedMinutes,
          posRequest.id
        );

        const updatedRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "WorkshopOrder" WHERE "id" = $1`,
          order.id
        );

        return NextResponse.json({
          success: true,
          activeOrder: mapOrderRow(updatedRows[0]),
          posRequest,
          message: `Orden ${order.orderNumber} enviada a POS / Caja (${itemsSummary}). Stock, tiempos e historial actualizados.`,
        });
      }

      return NextResponse.json(
        { success: false, error: `Acción desconocida: ${action}` },
        { status: 400 }
      );
    });
  } catch (error: any) {
    console.error("Error en POST /api/taller/operacion:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al ejecutar operación en Taller." },
      { status: 500 }
    );
  }
}
