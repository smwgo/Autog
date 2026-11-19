import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitirFacturaElectronica } from "@/lib/sri/facturaService";
import { emitRealtimeEvent } from "@/lib/realtime";
import { createAuditLog } from "@/lib/audit";

let saleInvoiceDetailsSchemaEnsured = false;

async function ensureSaleInvoiceDetailsSchema() {
  if (saleInvoiceDetailsSchemaEnsured) return;
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Sale"
      ADD COLUMN IF NOT EXISTS "customerIdentification" TEXT,
      ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
      ADD COLUMN IF NOT EXISTS "customerEmail" TEXT,
      ADD COLUMN IF NOT EXISTS "customerAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "sourceOrderNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "OrderRequest"
      ADD COLUMN IF NOT EXISTS "customerId" TEXT,
      ADD COLUMN IF NOT EXISTS "customerIdentification" TEXT,
      ADD COLUMN IF NOT EXISTS "customerAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT
  `);
  saleInvoiceDetailsSchemaEnsured = true;
}

function calcularEstado(stock: number, minStock: number = 5): string {
  if (stock <= 0) return "Agotado";
  if (stock <= minStock) return "Bajo Stock";
  return "En Stock";
}

// GET: Consultar ventas registradas en Neon
export async function GET(request: Request) {
  try {
    await ensureSaleInvoiceDetailsSchema();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
          items: true,
          customer: {
            include: {
              vehicles: true,
            },
          },
        },
      });
      if (!sale) {
        return NextResponse.json({ success: false, error: "Venta no encontrada." }, { status: 404 });
      }
      const workshopHistory = await prisma.workshopHistory.findFirst({
        where: { orderNumber: sale.saleNumber },
        select: { vehicle: true, plate: true },
      });
      const sourceOrderNumber = sale.sourceOrderNumber?.trim().replace(/^OT-/i, "") || "";
      let sourceRequest = sourceOrderNumber
        ? await (prisma as any).orderRequest.findFirst({
            where: { requestNumber: { in: [sourceOrderNumber, `OT-${sourceOrderNumber}`] } },
          })
        : null;
      if (!sourceRequest && !sale.customerId && sale.customerName) {
        const from = new Date(sale.createdAt);
        from.setDate(from.getDate() - 7);
        const matchingRequests = await (prisma as any).orderRequest.findMany({
          where: {
            type: "TALLER",
            customerName: sale.customerName,
            createdAt: { gte: from, lte: sale.createdAt },
            ...(sale.customerPhone ? { customerPhone: sale.customerPhone } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 2,
        });
        if (matchingRequests.length === 1) sourceRequest = matchingRequests[0];
      }
      const sourceOrderKey = sourceRequest?.requestNumber || sourceOrderNumber;
      const normalizedSourceOrderKey = sourceOrderKey.trim().replace(/^OT-/i, "");
      const sourceOrder = normalizedSourceOrderKey
        ? await prisma.workshopOrder.findFirst({
            where: { orderNumber: { in: [normalizedSourceOrderKey, `OT-${normalizedSourceOrderKey}`] } },
            select: {
              orderNumber: true,
              clientIdDoc: true,
              clientPhone: true,
              clientEmail: true,
              client: true,
              vehicle: true,
              plate: true,
              vehicleRef: { select: { year: true, color: true, mileage: true, vehicleType: true } },
              customer: { select: { identification: true, name: true, phone: true, email: true, address: true } },
            },
          })
        : null;
      return NextResponse.json({
        success: true,
        venta: {
          ...sale,
          sourceOrderNumber: sourceOrderKey || sale.sourceOrderNumber,
          customerName: sale.customerName || sourceOrder?.client || sourceRequest?.customerName,
          customerIdentification:
            (sale.customerIdentification === "9999999999999" && (sourceOrder || sourceRequest)
              ? null
              : sale.customerIdentification) ||
            sourceOrder?.clientIdDoc || sourceRequest?.customerIdentification || sourceOrder?.customer?.identification,
          customerPhone:
            sale.customerPhone || sourceOrder?.clientPhone || sourceRequest?.customerPhone || sourceOrder?.customer?.phone,
          customerEmail:
            sale.customerEmail || sourceOrder?.clientEmail || sourceRequest?.customerEmail || sourceOrder?.customer?.email,
          customerAddress: sale.customerAddress || sourceRequest?.customerAddress || sourceOrder?.customer?.address,
          serviceVehicle: sourceOrder
            ? {
                model: sale.vehicleModel || sourceOrder.vehicle || sourceRequest?.vehicleModel,
                plate: sale.vehiclePlate || sourceOrder.plate || sourceRequest?.vehiclePlate,
                year: sourceOrder.vehicleRef?.year,
                color: sourceOrder.vehicleRef?.color,
                mileage: sourceOrder.vehicleRef?.mileage,
                type: sourceOrder.vehicleRef?.vehicleType,
              }
            : sourceRequest
              ? { model: sale.vehicleModel || sourceRequest.vehicleModel || "", plate: sale.vehiclePlate || sourceRequest.vehiclePlate || "" }
              : workshopHistory
            ? {
                model: sale.vehicleModel || workshopHistory.vehicle,
                plate: sale.vehiclePlate || workshopHistory.plate,
              }
            : sale.vehicleModel || sale.vehiclePlate
              ? { model: sale.vehicleModel || "", plate: sale.vehiclePlate || "" }
              : null,
        },
      });
    }

    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const sedeParam = (searchParams.get("sede") || "").toUpperCase();
    const userBranchParam = (searchParams.get("userBranch") || "").toUpperCase();

    const where: any = {};
    if (busqueda) {
      where.OR = [
        { saleNumber: { contains: busqueda, mode: "insensitive" } },
        { customerName: { contains: busqueda, mode: "insensitive" } },
        { paymentMethod: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const [sales, branchRows] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: true,
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
      }),
      prisma.$queryRawUnsafe(
        `SELECT "id", COALESCE("branch", 'PRINCIPAL') AS "branch" FROM "Sale"`
      ).catch(() => []) as Promise<any[]>,
    ]);

    const branchMap = new Map<string, string>();
    for (const r of branchRows) {
      branchMap.set(r.id, (r.branch || "PRINCIPAL").toUpperCase());
    }

    const filteredSales = sales
      .map((s: any) => {
        const sBranch = branchMap.get(s.id) || "PRINCIPAL";
        return {
          ...s,
          branch: sBranch === "SUCURSAL" ? "Sucursal" : "Principal",
          _branchUpper: sBranch,
        };
      })
      .filter((s: any) => {
        // En Sucursal: ÚNICAMENTE ver ventas de Sucursal
        if (userBranchParam === "SUCURSAL" || sedeParam === "SUCURSAL") {
          return s._branchUpper === "SUCURSAL";
        }
        // En Principal si selecciona "Ambas": ver todo junto
        if (sedeParam === "AMBOS" || sedeParam === "AMBAS") {
          return true;
        }
        // En Principal por defecto: solo ventas de Principal
        return s._branchUpper !== "SUCURSAL";
      });

    return NextResponse.json({
      success: true,
      ventas: filteredSales,
      totalVentas: filteredSales.length,
    });
  } catch (error: any) {
    console.error("Error al obtener ventas de base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar ventas en base de datos" },
      { status: 500 }
    );
  }
}

// POST: Registrar nueva venta en Neon y descontar inventario
export async function POST(request: Request) {
  try {
    await ensureSaleInvoiceDetailsSchema();
    const body = await request.json();
    const {
      customerId = null,
      customerIdentification = null,
      customerName = "Consumidor Final",
      customerPhone = null,
      customerEmail = null,
      customerAddress = null,
      serviceOrderNumber = null,
      items = [],
      paymentMethod = "Efectivo",
      discount = 0,
      taxPercent = 0.15,
      vehiclePlate = null,
      vehicleModel = null,
      branch = null,
      sede = null,
    } = body;

    const targetBranch = (branch || sede || "").toString().toUpperCase().includes("SUCURSAL")
      ? "SUCURSAL"
      : "PRINCIPAL";

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "El carrito no contiene productos para cobrar." },
        { status: 400 }
      );
    }

    // 1. Ejecutar verificación de precios, creación de venta, descuento de stock y actualización de caja en una sola transacción atómica (con reintento ante colisión de secuencial)
    const runSaleTx = () => prisma.$transaction(async (tx) => {
      const sourceOrderNumber =
        typeof serviceOrderNumber === "string"
          ? serviceOrderNumber.trim().replace(/^OT-/i, "")
          : "";
      const rawOrderDigits = sourceOrderNumber.replace(/^(OT|ORD)[-\s#]*/gi, "").replace(/#+/g, "").trim();
      const orderNumCandidates = Array.from(
        new Set(
          [
            sourceOrderNumber,
            `OT-${sourceOrderNumber}`,
            rawOrderDigits,
            rawOrderDigits ? `#${rawOrderDigits}` : "",
            rawOrderDigits ? `OT #${rawOrderDigits}` : "",
            rawOrderDigits ? `OT-${rawOrderDigits}` : "",
            rawOrderDigits ? `OT-OT #${rawOrderDigits}` : "",
          ].filter(Boolean)
        )
      );
      const sourceRequest = orderNumCandidates.length > 0
        ? await (tx as any).orderRequest.findFirst({
            where: { requestNumber: { in: orderNumCandidates } },
          })
        : null;
      const serviceOrder = orderNumCandidates.length > 0
        ? await tx.workshopOrder.findFirst({
            where: {
              orderNumber: {
                in: orderNumCandidates,
              },
            },
            select: {
              id: true,
              orderNumber: true,
              stockDeducted: true,
              customerId: true,
              clientIdDoc: true,
              client: true,
              clientPhone: true,
              clientEmail: true,
              vehicle: true,
              plate: true,
              vehicleRef: { select: { year: true, color: true, mileage: true, vehicleType: true } },
            },
          })
        : null;

      let linkedCustomer = null;
      const sourceCustomerId = serviceOrder?.customerId || sourceRequest?.customerId || null;
      const sourceCustomerIdentification =
        serviceOrder?.clientIdDoc || sourceRequest?.customerIdentification || null;
      if (sourceCustomerId) {
        linkedCustomer = await tx.customer.findUnique({
          where: { id: sourceCustomerId },
          select: { id: true, name: true, identification: true, phone: true, email: true, address: true },
        });
      }
      if (
        !linkedCustomer &&
        sourceCustomerIdentification &&
        sourceCustomerIdentification.trim()
      ) {
        linkedCustomer = await tx.customer.findUnique({
          where: { identification: sourceCustomerIdentification.trim() },
          select: { id: true, name: true, identification: true, phone: true, email: true, address: true },
        });
      }
      if (typeof customerId === "string" && customerId.trim()) {
        linkedCustomer ??= await tx.customer.findUnique({
          where: { id: customerId.trim() },
          select: { id: true, name: true, identification: true, phone: true, email: true, address: true },
        });
      }
      if (
        !linkedCustomer &&
        !serviceOrder &&
        !(typeof customerId === "string" && customerId.startsWith("web-")) &&
        typeof customerIdentification === "string" &&
        customerIdentification.trim()
      ) {
        linkedCustomer ??= await tx.customer.findUnique({
          where: { identification: customerIdentification.trim() },
          select: { id: true, name: true, identification: true, phone: true, email: true, address: true },
        });
      }
      const saleCustomerName =
        serviceOrder?.client || sourceRequest?.customerName || linkedCustomer?.name || customerName || "Consumidor Final";
      const saleVehiclePlate = serviceOrder?.plate || sourceRequest?.vehiclePlate || vehiclePlate;
      const saleVehicleModel = serviceOrder?.vehicle || sourceRequest?.vehicleModel || vehicleModel;

      let subtotalCalc = 0;
      const saleItemsData = [];

      for (const item of items) {
        let price = parseFloat(item.price?.toString() || "0") || 0;
        const quantity = Math.max(1, parseInt((item.qty || item.quantity || 1).toString(), 10) || 1);
        let name = item.name || "Producto General";
        let code = item.code || "S/C";
        let validProductId: string | null = null;
        let dbProduct = null;

        if (item.productId) {
          dbProduct = await tx.product.findUnique({
            where: { id: item.productId },
          });
        }
        if (!dbProduct && typeof item.code === "string" && item.code.trim()) {
          dbProduct = await tx.product.findUnique({
            where: { code: item.code.trim() },
          });
        }

        if (dbProduct) {
          validProductId = dbProduct.id;
          const submittedPrice = parseFloat(item.price?.toString() || "");
          if (Number.isFinite(submittedPrice) && submittedPrice >= 0) {
            price = submittedPrice;
          } else {
            price = parseFloat(dbProduct.price.toString());
          }
          name = dbProduct.name;
          code = dbProduct.code;

          if (!serviceOrder?.stockDeducted) {
            const curPrincipal = Number(dbProduct.stock || 0);
            const curSucursal = Number((dbProduct as any).stockNorte || 0);
            const availableInBranch = targetBranch === "SUCURSAL" ? curSucursal : curPrincipal;
            if (availableInBranch < quantity) {
              throw new Error(
                `STOCK_INSUFICIENTE:Stock insuficiente para "${dbProduct.name}" en sede ${targetBranch} (disponible: ${availableInBranch}, solicitado: ${quantity}).`
              );
            }
            const nextPrincipal = targetBranch === "SUCURSAL" ? curPrincipal : curPrincipal - quantity;
            const nextSucursal = targetBranch === "SUCURSAL" ? curSucursal - quantity : curSucursal;
            const newStatus = calcularEstado(nextPrincipal + nextSucursal, dbProduct.minStock);
            await tx.product.update({
              where: { id: dbProduct.id },
              data: targetBranch === "SUCURSAL"
                ? { stockNorte: nextSucursal, status: newStatus }
                : { stock: nextPrincipal, status: newStatus },
            });
          }
        } else if (item.isService || (typeof item.code === "string" && item.code.trim())) {
          // Validar precio de catálogo cuando el ítem corresponde a un WorkshopService
          const dbService = await tx.workshopService
            .findFirst({
              where: {
                OR: [
                  ...(item.id ? [{ id: String(item.id) }] : []),
                  ...(typeof item.code === "string" && item.code.trim() ? [{ code: item.code.trim() }] : []),
                ],
                active: true,
              },
            })
            .catch(() => null);
          if (dbService && (!price || price <= 0)) {
            price = parseFloat(dbService.price.toString());
            name = dbService.name;
            code = dbService.code;
          }
        }

        const itemTotal = price * quantity;
        subtotalCalc += itemTotal;

        saleItemsData.push({
          productId: validProductId,
          code,
          name,
          price,
          quantity,
          total: itemTotal,
        });
      }

      const numDiscount = Math.max(0, parseFloat(discount.toString()) || 0);
      const parsedTaxRate = Number.isFinite(Number(taxPercent)) ? Number(taxPercent) : 0.15;
      const effectiveTaxRate = parsedTaxRate > 1 ? parsedTaxRate / 100 : parsedTaxRate;
      const taxCalc = Math.max(0, (subtotalCalc - numDiscount) * effectiveTaxRate);
      const totalCalc = Math.max(0, subtotalCalc - numDiscount + taxCalc);

      // Numeración correlativa secuencial: VENTA-001, VENTA-002 en adelante
      const allVentasNums = await tx.sale.findMany({
        where: {
          OR: [
            { saleNumber: { startsWith: "VENTA-" } },
            { saleNumber: { startsWith: "VENTA " } },
          ],
        },
        select: { saleNumber: true },
      });

      let nextSeq = 1;
      let maxSeq = 0;
      for (const v of allVentasNums) {
        if (!v.saleNumber) continue;
        const match = v.saleNumber.match(/\d+/);
        if (match) {
          const n = parseInt(match[0], 10);
          if (!Number.isNaN(n) && n > maxSeq) {
            maxSeq = n;
          }
        }
      }
      if (maxSeq > 0) {
        nextSeq = maxSeq + 1;
      }
      const saleNumber = `VENTA-${String(nextSeq).padStart(3, "0")}`;

      const createdSale = await tx.sale.create({
        data: {
          saleNumber,
          customerId: linkedCustomer?.id ?? null,
          customerName: saleCustomerName,
          sourceOrderNumber: serviceOrder?.orderNumber || sourceRequest?.requestNumber || serviceOrderNumber,
          customerIdentification:
            sourceCustomerIdentification || linkedCustomer?.identification ||
            (!serviceOrder && !sourceRequest &&
              !(typeof customerId === "string" && customerId.startsWith("web-"))
              ? customerIdentification
              : null),
          customerPhone: serviceOrder?.clientPhone || sourceRequest?.customerPhone || linkedCustomer?.phone || customerPhone,
          customerEmail: serviceOrder?.clientEmail || sourceRequest?.customerEmail || linkedCustomer?.email || customerEmail,
          customerAddress: linkedCustomer?.address || sourceRequest?.customerAddress || customerAddress,
          vehiclePlate: saleVehiclePlate?.toString().trim().toUpperCase() || null,
          vehicleModel: saleVehicleModel || null,
          subtotal: subtotalCalc,
          tax: taxCalc,
          discount: numDiscount,
          total: totalCalc,
          paymentMethod,
          status: "Completada",
          items: {
            create: saleItemsData.map((item) => ({
              productId: item.productId,
              code: item.code,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              total: item.total,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Asignar sede a la venta de forma atómica
      try {
        await tx.$executeRawUnsafe(
          `UPDATE "Sale" SET "branch" = $1 WHERE "id" = $2`,
          targetBranch,
          createdSale.id
        );
      } catch (brErr) {
        console.warn("Aviso al asignar branch a Sale:", brErr);
      }

      // Marcar orden de trabajo de taller como Pagada para que pase al historial y no siga en pista
      const orderNumKey = (serviceOrder?.orderNumber || sourceRequest?.requestNumber || sourceOrderNumber || "").toString().trim().replace(/^OT-/i, "");
      if (orderNumKey) {
        try {
          await tx.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "status" = 'Pagado',
                 "quoteStatus" = 'Pagado',
                 "deliveryStatus" = 'Facturado',
                 "stockDeducted" = true,
                 "updatedAt" = NOW()
             WHERE "orderNumber" = $1 OR "orderNumber" = $2 OR "id" = $3`,
            orderNumKey,
            `OT-${orderNumKey}`,
            serviceOrder?.id || ""
          );
        } catch (ordErr) {
          console.warn("Aviso al actualizar WorkshopOrder como Pagado:", ordErr);
        }
      } else if (saleVehiclePlate) {
        try {
          await tx.$executeRawUnsafe(
            `UPDATE "WorkshopOrder"
             SET "status" = 'Pagado',
                 "quoteStatus" = 'Pagado',
                 "deliveryStatus" = 'Facturado',
                 "stockDeducted" = true,
                 "updatedAt" = NOW()
             WHERE UPPER("plate") = UPPER($1)
               AND COALESCE("branch", 'PRINCIPAL') = $2
               AND "status" NOT IN ('Entregado', 'ENTREGADO', '05 Entregada', 'Entregada', 'Finalizado', 'FINALIZADO', 'Terminado', 'TERMINADO', 'Historial', 'HISTORIAL', 'Cancelado', 'CANCELADO', 'Pagado', 'PAGADO', 'Facturado', 'FACTURADO')`,
            saleVehiclePlate.toString().trim(),
            targetBranch
          );
        } catch (ordErr) {
          console.warn("Aviso al actualizar WorkshopOrder por placa como Pagado:", ordErr);
        }
      }

      if (sourceRequest?.id || orderNumKey) {
        try {
          if (sourceRequest?.id) {
            await (tx as any).orderRequest.update({
              where: { id: sourceRequest.id },
              data: { status: "DESPACHADO" },
            });
          } else {
            await (tx as any).orderRequest.updateMany({
              where: {
                requestNumber: { in: [orderNumKey, `OT-${orderNumKey}`, ...orderNumCandidates] },
              },
              data: { status: "DESPACHADO" },
            });
          }
        } catch (reqErr) {
          console.warn("Aviso al marcar OrderRequest como DESPACHADO:", reqErr);
        }
      }

      if (saleVehiclePlate) {
        try {
          const histId = "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          const serviceNames = items.map((it: any) => `${it.quantity || it.qty || 1}x ${it.name || "Ítem"}`);
          await tx.$executeRawUnsafe(
            `INSERT INTO "WorkshopHistory" ("id", "serviceCode", "date", "vehicle", "plate", "client", "servicesJson", "cost", "mechanic", "mileage", "notes", "orderNumber", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
            histId,
            `POS-${createdSale.saleNumber}`,
            new Date().toISOString().split("T")[0],
            saleVehicleModel || "Vehículo",
            saleVehiclePlate.toString().trim().toUpperCase(),
            saleCustomerName,
            JSON.stringify(serviceNames),
            totalCalc,
            "Caja Mostrador",
            "N/A",
            body.notes || "Venta de mostrador POS",
            createdSale.saleNumber
          );
        } catch (histErr) {
          console.warn("WorkshopHistory opcional no registrado:", histErr);
        }
      }

      // Sincronizar automáticamente con la sesión de caja abierta en Neon para ESTA sede
      const activeSession = await tx.cashRegister.findFirst({
        where: {
          status: "ABIERTA",
          branch: targetBranch,
        },
        orderBy: { openedAt: "desc" },
      });

      if (activeSession) {
        const updateData: any = {};
        if (paymentMethod === "Efectivo") {
          updateData.totalSalesCash = { increment: totalCalc };
          updateData.expectedCash = { increment: totalCalc };
        } else if (paymentMethod === "Tarjeta") {
          updateData.totalSalesCard = { increment: totalCalc };
        } else if (paymentMethod === "Transferencia") {
          updateData.totalSalesTransfer = { increment: totalCalc };
        } else if (paymentMethod === "Mixto" && body.paymentBreakdown) {
          const pb = body.paymentBreakdown;
          const cashVal = parseFloat(pb.cash) || 0;
          const cardVal = parseFloat(pb.card) || 0;
          const transVal = parseFloat(pb.transfer) || 0;
          if (cashVal > 0) {
            updateData.totalSalesCash = { increment: cashVal };
            updateData.expectedCash = { increment: cashVal };
          }
          if (cardVal > 0) {
            updateData.totalSalesCard = { increment: cardVal };
          }
          if (transVal > 0) {
            updateData.totalSalesTransfer = { increment: transVal };
          }
        }

        if (Object.keys(updateData).length > 0) {
          await tx.cashRegister.update({
            where: { id: activeSession.id },
            data: updateData,
          });
        }
      }

      return createdSale;
    });

    let sale: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        sale = await runSaleTx();
        break;
      } catch (txErr: any) {
        if (txErr?.code === "P2002" && attempt < 2) {
          continue;
        }
        throw txErr;
      }
    }

    // 2. Facturación Electrónica SRI automática
    let facturaElectronicaRes: any = null;
    const debeEmitirFactura = body.emitirFacturaElectronica !== false;
    const rawTaxRate = Number.isFinite(Number(taxPercent)) ? Number(taxPercent) : 0.15;
    const tarifaIvaDinamica = rawTaxRate > 1 ? Math.round(rawTaxRate) : Math.round(rawTaxRate * 100);

    if (debeEmitirFactura) {
      try {
        facturaElectronicaRes = await emitirFacturaElectronica({
          clienteNombre: sale.customerName || "Consumidor Final",
          clienteIdentificacion: sale.customerIdentification || "9999999999999",
          clienteEmail: sale.customerEmail || undefined,
          clienteTelefono: sale.customerPhone || undefined,
          clienteDireccion: sale.customerAddress || undefined,
          items: (sale.items || []).map((it: any) => ({
            codigo: it.code || undefined,
            descripcion: it.name || "Producto / Servicio",
            cantidad: Number(it.quantity || 1),
            precioUnitario: Number(it.price || 0),
            descuento: 0,
            tarifaIva: tarifaIvaDinamica,
          })),
          metodoPago: sale.paymentMethod || "Efectivo",
          observaciones: `Venta POS #${sale.saleNumber}${sale.vehiclePlate ? ` • Placa: ${sale.vehiclePlate}` : ""}`,
          vehiculoInfo: sale.vehiclePlate ? `${sale.vehiclePlate}${sale.vehicleModel ? ` - ${sale.vehicleModel}` : ""}` : undefined,
          options: {
            saleId: sale.id,
            orderId: sale.sourceOrderNumber || undefined,
            enviarCorreo: Boolean(body.enviarCorreoCliente),
            enviarInmediatoSri: Boolean(body.enviarInmediatoSri),
          },
        });
      } catch (errFactura: any) {
        console.warn("Aviso: no se pudo completar la emisión electrónica automática SRI:", errFactura.message);
        facturaElectronicaRes = {
          success: false,
          error: errFactura.message,
        };
      }
    }

    emitRealtimeEvent({ channel: "ordenes", action: "created", entityId: sale.id });
    emitRealtimeEvent({ channel: "presupuestos", action: "updated" });
    emitRealtimeEvent({ channel: "taller", action: "updated" });

    void createAuditLog({
      location: targetBranch as "PRINCIPAL" | "SUCURSAL",
      module: "POS_VENTAS",
      action: `Venta registrada ${sale.saleNumber}`,
      entityName: "Sale",
      entityId: sale.id,
      details: `Cliente: ${sale.customerName} | Total: $${Number(sale.total).toFixed(2)} | Método: ${sale.paymentMethod}`,
      level: "INFO",
    });

    return NextResponse.json({
      success: true,
      venta: sale,
      factura: facturaElectronicaRes,
    }, { status: 201 });
  } catch (error: any) {
    const msg = String(error?.message || "");
    if (msg.startsWith("STOCK_INSUFICIENTE:")) {
      return NextResponse.json(
        { success: false, error: msg.replace("STOCK_INSUFICIENTE:", "") },
        { status: 400 }
      );
    }
    console.error("Error al registrar venta en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar venta en base de datos" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar venta (ej: editar cliente/método, items, o anular venta y restituir stock en Neon)
export async function PATCH(request: Request) {
  try {
    await ensureSaleInvoiceDetailsSchema();
    const body = await request.json();
    const {
      id,
      saleNumber,
      status,
      customerName,
      customerId,
      customerIdentification,
      customerPhone,
      customerEmail,
      customerAddress,
      vehiclePlate,
      vehicleModel,
      paymentMethod,
      subtotal,
      tax,
      discount,
      total,
      items,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de venta es obligatorio." },
        { status: 400 }
      );
    }

    const saleActual = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!saleActual) {
      return NextResponse.json(
        { success: false, error: "Venta no encontrada." },
        { status: 404 }
      );
    }

    const saleBranch = ((saleActual as any).branch || "").toString().toUpperCase().includes("SUCURSAL")
      ? "SUCURSAL"
      : "PRINCIPAL";

    // Si se anula la venta y antes estaba completada, devolver el stock a inventario de la sede correspondiente
    if (status === "Anulada" && saleActual.status !== "Anulada") {
      for (const item of saleActual.items) {
        if (item.productId) {
          try {
            const dbProduct = await prisma.product.findUnique({ where: { id: item.productId } });
            if (dbProduct) {
              const curPrincipal = Number(dbProduct.stock || 0);
              const curSucursal = Number((dbProduct as any).stockNorte || 0);
              const nextPrincipal = saleBranch === "SUCURSAL" ? curPrincipal : curPrincipal + item.quantity;
              const nextSucursal = saleBranch === "SUCURSAL" ? curSucursal + item.quantity : curSucursal;
              await prisma.product.update({
                where: { id: item.productId },
                data: saleBranch === "SUCURSAL"
                  ? {
                      stockNorte: nextSucursal,
                      status: calcularEstado(nextPrincipal + nextSucursal, dbProduct.minStock),
                    }
                  : {
                      stock: nextPrincipal,
                      status: calcularEstado(nextPrincipal + nextSucursal, dbProduct.minStock),
                    },
              });
            }
          } catch (e) {
            console.warn(`Error al reponer stock del producto ${item.productId}:`, e);
          }
        }
      }

      // Ajustar caja abierta SOLO si pertenece a la misma sede y al turno abierto actual
      try {
        const activeSession = await prisma.cashRegister.findFirst({
          where: { status: "ABIERTA", branch: saleBranch },
          orderBy: { openedAt: "desc" },
        });
        if (activeSession && new Date(saleActual.createdAt) >= new Date(activeSession.openedAt)) {
          const amount = Number(saleActual.total || 0);
          const cashUpdate: any = {};
          if (saleActual.paymentMethod === "Efectivo") {
            cashUpdate.totalSalesCash = Math.max(0, Number(activeSession.totalSalesCash || 0) - amount);
            cashUpdate.expectedCash = Math.max(0, Number(activeSession.expectedCash || 0) - amount);
          } else if (saleActual.paymentMethod === "Tarjeta") {
            cashUpdate.totalSalesCard = Math.max(0, Number(activeSession.totalSalesCard || 0) - amount);
          } else if (saleActual.paymentMethod === "Transferencia") {
            cashUpdate.totalSalesTransfer = Math.max(0, Number(activeSession.totalSalesTransfer || 0) - amount);
          }
          if (Object.keys(cashUpdate).length > 0) {
            await prisma.cashRegister.update({
              where: { id: activeSession.id },
              data: cashUpdate,
            });
          }
        }
      } catch (cErr) {
        console.warn("Error al ajustar caja por venta anulada:", cErr);
      }
    }

    // Si se reactiva una venta anulada a completada, descontar inventario de la sede correspondiente
    if (status === "Completada" && saleActual.status === "Anulada") {
      const itemsToDeduct = Array.isArray(items) && items.length > 0 ? items : saleActual.items;
      for (const item of itemsToDeduct) {
        const prodId = item.productId;
        if (prodId) {
          try {
            const dbProduct = await prisma.product.findUnique({ where: { id: prodId } });
            if (dbProduct) {
              const qty = Math.max(1, parseInt((item.qty || item.quantity || 1).toString(), 10));
              const curPrincipal = Number(dbProduct.stock || 0);
              const curSucursal = Number((dbProduct as any).stockNorte || 0);
              const nextPrincipal = saleBranch === "SUCURSAL" ? curPrincipal : Math.max(0, curPrincipal - qty);
              const nextSucursal = saleBranch === "SUCURSAL" ? Math.max(0, curSucursal - qty) : curSucursal;
              await prisma.product.update({
                where: { id: prodId },
                data: saleBranch === "SUCURSAL"
                  ? {
                      stockNorte: nextSucursal,
                      status: calcularEstado(nextPrincipal + nextSucursal, dbProduct.minStock),
                    }
                  : {
                      stock: nextPrincipal,
                      status: calcularEstado(nextPrincipal + nextSucursal, dbProduct.minStock),
                    },
              });
            }
          } catch (e) {
            console.warn(`Error al descontar stock para producto ${prodId}:`, e);
          }
        }
      }
    }

    // Opcional: Actualizar datos de cliente si se proveyeron
    if (customerId) {
      try {
        const custData: any = {};
        if (customerPhone) custData.phone = customerPhone.trim();
        if (customerEmail) custData.email = customerEmail.trim();
        if (customerAddress) custData.address = customerAddress.trim();
        if (Object.keys(custData).length > 0) {
          await prisma.customer.update({
            where: { id: customerId },
            data: custData,
          });
        }
      } catch (cErr) {
        console.warn("No se pudo actualizar el cliente asociado:", cErr);
      }
    }

    const updateData: any = {};
    if (saleNumber) updateData.saleNumber = saleNumber.trim();
    if (status) updateData.status = status;
    if (customerName) updateData.customerName = customerName.trim();
    if (customerId !== undefined) updateData.customerId = customerId || null;
    if (customerIdentification !== undefined) updateData.customerIdentification = customerIdentification || null;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone || null;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail || null;
    if (customerAddress !== undefined) updateData.customerAddress = customerAddress || null;
    if (vehiclePlate !== undefined) updateData.vehiclePlate = vehiclePlate || null;
    if (vehicleModel !== undefined) updateData.vehicleModel = vehicleModel || null;
    if (paymentMethod) updateData.paymentMethod = paymentMethod.trim();
    if (subtotal !== undefined) updateData.subtotal = Number(subtotal);
    if (tax !== undefined) updateData.tax = Number(tax);
    if (discount !== undefined) updateData.discount = Number(discount);
    if (total !== undefined) updateData.total = Number(total);

    // Si vienen items, actualizar las líneas de detalle
    if (Array.isArray(items) && items.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.saleItem.deleteMany({
          where: { saleId: id },
        });

        await tx.saleItem.createMany({
          data: items.map((it: any) => {
            const p = parseFloat((it.price ?? it.unitPrice ?? 0).toString()) || 0;
            const q = Math.max(1, parseInt((it.quantity ?? it.qty ?? 1).toString(), 10) || 1);
            const tot = parseFloat((it.total ?? p * q).toString()) || p * q;
            return {
              saleId: id,
              productId: it.productId || null,
              code: it.code || "SRV",
              name: it.name || it.description || "Producto",
              price: p,
              quantity: q,
              total: tot,
            };
          }),
        });

        await tx.sale.update({
          where: { id },
          data: updateData,
        });
      });
    } else {
      await prisma.sale.update({
        where: { id },
        data: updateData,
      });
    }

    const saleUpdated = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        customer: {
          include: {
            vehicles: true,
          },
        },
      },
    });

    emitRealtimeEvent({ channel: "ordenes", action: "updated", entityId: id });
    emitRealtimeEvent({ channel: "presupuestos", action: "updated" });

    if (status === "Anulada" && saleActual.status !== "Anulada" && saleUpdated) {
      void createAuditLog({
        module: "POS_VENTAS",
        action: `Venta anulada ${saleUpdated.saleNumber}`,
        entityName: "Sale",
        entityId: saleUpdated.id,
        details: `Cliente: ${saleUpdated.customerName} | Total: $${Number(saleUpdated.total).toFixed(2)}`,
        level: "ADVERTENCIA",
      });
    }

    return NextResponse.json({ success: true, venta: saleUpdated });
  } catch (error: any) {
    console.error("Error al actualizar venta en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar venta" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar venta de la base de datos y limpiar referencias asociadas
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de venta requerido." },
        { status: 400 }
      );
    }

    const saleActual = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    // Reponer stock por sede y ajustar sesión de caja abierta si la venta no estaba anulada
    if (saleActual && saleActual.status !== "Anulada") {
      const saleBranch = ((saleActual as any).branch || "").toString().toUpperCase().includes("SUCURSAL")
        ? "SUCURSAL"
        : "PRINCIPAL";

      for (const item of saleActual.items || []) {
        if (item.productId) {
          try {
            const dbProduct = await prisma.product.findUnique({ where: { id: item.productId } });
            if (dbProduct) {
              const curPrincipal = Number(dbProduct.stock || 0);
              const curSucursal = Number((dbProduct as any).stockNorte || 0);
              const nextPrincipal = saleBranch === "SUCURSAL" ? curPrincipal : curPrincipal + item.quantity;
              const nextSucursal = saleBranch === "SUCURSAL" ? curSucursal + item.quantity : curSucursal;
              await prisma.product.update({
                where: { id: item.productId },
                data: saleBranch === "SUCURSAL"
                  ? {
                      stockNorte: nextSucursal,
                      status: calcularEstado(nextPrincipal + nextSucursal, dbProduct.minStock),
                    }
                  : {
                      stock: nextPrincipal,
                      status: calcularEstado(nextPrincipal + nextSucursal, dbProduct.minStock),
                    },
              });
            }
          } catch (sErr) {
            console.warn(`Error al reponer stock al eliminar venta (${item.productId}):`, sErr);
          }
        }
      }

      const amount = Number(saleActual.total || 0);
      if (amount > 0) {
        try {
          const activeSession = await prisma.cashRegister.findFirst({
            where: {
              status: "ABIERTA",
              branch: saleBranch,
            },
            orderBy: { openedAt: "desc" },
          });
          if (activeSession && new Date(saleActual.createdAt) >= new Date(activeSession.openedAt)) {
            const updateData: any = {};
            if (saleActual.paymentMethod === "Efectivo") {
              updateData.totalSalesCash = Math.max(0, Number(activeSession.totalSalesCash || 0) - amount);
              updateData.expectedCash = Math.max(0, Number(activeSession.expectedCash || 0) - amount);
            } else if (saleActual.paymentMethod === "Tarjeta") {
              updateData.totalSalesCard = Math.max(0, Number(activeSession.totalSalesCard || 0) - amount);
            } else if (saleActual.paymentMethod === "Transferencia") {
              updateData.totalSalesTransfer = Math.max(0, Number(activeSession.totalSalesTransfer || 0) - amount);
            }
            if (Object.keys(updateData).length > 0) {
              await prisma.cashRegister.update({
                where: { id: activeSession.id },
                data: updateData,
              });
            }
          }
        } catch {}
      }
    }

    // Limpiar historial POS o solicitud despachada vinculada
    if (saleActual?.saleNumber) {
      await prisma.workshopHistory.deleteMany({
        where: { orderNumber: saleActual.saleNumber },
      }).catch(() => {});
    }
    if (saleActual?.sourceOrderNumber) {
      const rawNum = saleActual.sourceOrderNumber.trim().replace(/^OT-/i, "");
      await (prisma as any).orderRequest.deleteMany({
        where: { requestNumber: { in: [saleActual.sourceOrderNumber, rawNum, `OT-${rawNum}`] } },
      }).catch(() => {});
    }

    // Eliminar primero sus items asociados
    await prisma.saleItem.deleteMany({
      where: { saleId: id },
    });

    await prisma.sale.delete({
      where: { id },
    });

    emitRealtimeEvent({ channel: "ordenes", action: "deleted", entityId: id });
    emitRealtimeEvent({ channel: "presupuestos", action: "updated" });
    emitRealtimeEvent({ channel: "taller", action: "updated" });

    return NextResponse.json({ success: true, message: "Venta eliminada." });
  } catch (error: any) {
    console.error("Error al eliminar venta en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar venta" },
      { status: 500 }
    );
  }
}
