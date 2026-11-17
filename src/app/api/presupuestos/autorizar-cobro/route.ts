import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { emitRealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/**
 * POST: Autorizar el cobro del presupuesto y enviarlo al POS de Venta (Caja de Oficina).
 * - Marca la orden de trabajo como "Aprobado" y "EN_CAJA".
 * - Genera/actualiza la solicitud en OrderRequest con los precios autorizados.
 * - Registra compras con proveedores en PurchaseOrder si corresponde.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      items = [],
      services = [],
      notes,
      quoteTaxRate,
      quoteDiscount,
      registrarOrdenesCompra = true,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "ID de orden requerido" },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      // 1. Obtener la orden de trabajo
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

      const order = rows[0];

      // 2. Consolidar ítems para POS aplicando los valores de la columna PVP, descuento e IVA de forma consistente
      const totalRepuestos = items.reduce(
        (acc: number, it: any) => acc + Number(it.price || 0),
        0
      );
      const totalServicios = services.reduce(
        (acc: number, sv: any) => acc + Number(sv.price || 0),
        0
      );
      const subtotalCalculado = Number((totalRepuestos + totalServicios).toFixed(2));
      const taxRate = Number(
        quoteTaxRate !== undefined ? quoteTaxRate : (order.quoteTaxRate ?? 15)
      );
      const discount = Number(
        quoteDiscount !== undefined ? quoteDiscount : (order.quoteDiscount ?? 0)
      );
      const valorDescuento = Number(((subtotalCalculado * discount) / 100).toFixed(2));
      const baseImponible = Math.max(0, subtotalCalculado - valorDescuento);
      const valorIva = Number(((baseImponible * taxRate) / 100).toFixed(2));
      const totalCalculado = Number((baseImponible + valorIva).toFixed(2));

      if (items.length === 0 && services.length === 0) {
        return NextResponse.json(
          { success: false, error: "Debes agregar al menos un repuesto o servicio antes de autorizar el cobro." },
          { status: 400 }
        );
      }

      // Preparar payload de ítems para el POS (compatible con /pos/venta)
      const posItemsPayload: any[] = [];

      items.forEach((it: any) => {
        posItemsPayload.push({
          id: it.productId || it.id || `pos_rep_${Date.now()}`,
          code: it.code || "REP",
          name: it.name,
          brand: `⚙️ Repuesto • ${it.supplierName || "Proveedor"} • ${order.plate}`,
          category: "Repuestos",
          price: Number(it.price) || 0,
          costPrice: Number(it.costPrice) || 0,
          qty: Number(it.qty) || 1,
          isService: false,
          empleado_nombre: order.mechanic || "Taller",
        });
      });

      services.forEach((sv: any) => {
        posItemsPayload.push({
          id: sv.id || `pos_srv_${Date.now()}`,
          code: sv.code || "SRV",
          name: sv.name,
          brand: `👤 ${sv.mechanic || order.mechanic || "Taller"} • ${order.plate}`,
          category: sv.category || "Servicio Taller",
          price: Number(sv.price) || 0,
          qty: Number(sv.qty) || 1,
          isService: true,
          empleado_nombre: sv.mechanic || order.mechanic || "Taller",
        });
      });

      const itemsSummary = [
        ...items.map((i: any) => `${Number(i.qty) || 1}x ${i.name}`),
        ...services.map((s: any) => `${Number(s.qty) || 1}x ${s.name}`),
      ].join(", ");

      const requestNumber = order.orderNumber.startsWith("OT-")
        ? order.orderNumber
        : `OT-${order.orderNumber}`;

      // 3. Crear o actualizar la solicitud en OrderRequest para que POS la reciba
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "OrderRequest"
          ADD COLUMN IF NOT EXISTS "customerId" TEXT,
          ADD COLUMN IF NOT EXISTS "customerIdentification" TEXT,
          ADD COLUMN IF NOT EXISTS "customerAddress" TEXT,
          ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT,
          ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT
      `);
      const posNotes = `[PRESUPUESTO AUTORIZADO] Orden #${order.orderNumber} | Placa: ${order.plate} | Vehículo: ${order.vehicle} | Mecánico: ${order.mechanic} | Tel: ${order.clientPhone || "N/A"}${notes ? ` | Nota: ${notes}` : ""}`;

      const PAID_REQ_STATUSES = new Set(["DESPACHADO", "PAGADO", "COBRADO", "FACTURADO"]);
      let existingReq: any = null;
      if (order.posRequestId) {
        existingReq = await (prisma as any).orderRequest
          .findUnique({ where: { id: order.posRequestId } })
          .catch(() => null);
      }
      if (!existingReq) {
        existingReq = await (prisma as any).orderRequest
          .findUnique({ where: { requestNumber } })
          .catch(() => null);
      }
      const existingReqPaid = Boolean(
        existingReq && PAID_REQ_STATUSES.has(String(existingReq.status || "").toUpperCase())
      );

      let linkedCustomer = order.customerId
        ? await prisma.customer.findUnique({
            where: { id: order.customerId },
            select: { id: true, identification: true, address: true },
          })
        : null;
      if (!linkedCustomer && order.clientIdDoc) {
        linkedCustomer = await prisma.customer.findUnique({
          where: { identification: order.clientIdDoc },
          select: { id: true, identification: true, address: true },
        });
      }
      const requestCustomerData = {
        customerId: order.customerId || linkedCustomer?.id || null,
        customerIdentification: order.clientIdDoc || linkedCustomer?.identification || null,
        customerPhone: order.clientPhone || null,
        customerEmail: order.clientEmail || null,
        customerAddress: linkedCustomer?.address || null,
        vehicleInfo: `${order.vehicle} [${order.plate}]`,
        vehicleModel: order.vehicle || null,
        vehiclePlate: order.plate || null,
      };
      let posRequest: any;
      if (existingReq && !existingReqPaid) {
        posRequest = await (prisma as any).orderRequest.update({
          where: { id: existingReq.id },
          data: {
            customerName: order.client,
            ...requestCustomerData,
            itemsSummary,
            itemsJson: JSON.stringify(posItemsPayload),
            totalEstimated: totalCalculado,
            notes: posNotes,
            status: "PENDIENTE",
          },
        });
      } else {
        let nextRequestNumber = requestNumber;
        if (existingReq) {
          let suffix = 2;
          while (suffix < 100) {
            const candidate = `${requestNumber}-${suffix}`;
            const taken = await (prisma as any).orderRequest
              .findUnique({ where: { requestNumber: candidate } })
              .catch(() => null);
            if (!taken) {
              nextRequestNumber = candidate;
              break;
            }
            if (!PAID_REQ_STATUSES.has(String(taken.status || "").toUpperCase())) {
              posRequest = await (prisma as any).orderRequest.update({
                where: { id: taken.id },
                data: {
                  customerName: order.client,
                  ...requestCustomerData,
                  itemsSummary,
                  itemsJson: JSON.stringify(posItemsPayload),
                  totalEstimated: totalCalculado,
                  notes: posNotes,
                  status: "PENDIENTE",
                },
              });
              break;
            }
            suffix++;
          }
        }
        if (!posRequest) {
          posRequest = await (prisma as any).orderRequest.create({
            data: {
              requestNumber: nextRequestNumber,
              type: "TALLER",
              customerName: order.client,
              ...requestCustomerData,
              itemsSummary,
              itemsJson: JSON.stringify(posItemsPayload),
              totalEstimated: totalCalculado,
              notes: posNotes,
              status: "PENDIENTE",
            },
          });
        }
      }

      // 4. Actualizar la orden de trabajo e incrementar contador de envíos a POS
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "WorkshopOrder" ADD COLUMN IF NOT EXISTS "posSendCount" INTEGER DEFAULT 0`
      ).catch(() => {});

      const allOrderReqs = (await prisma.$queryRawUnsafe(
        `SELECT "id", "status" FROM "OrderRequest" WHERE "requestNumber" = $1 OR "requestNumber" LIKE $2`,
        requestNumber,
        `${requestNumber}-%`
      ).catch(() => [])) as any[];

      const alreadyPaidInPos =
        existingReqPaid ||
        String(order.quoteStatus || "").toLowerCase() === "pagado" ||
        allOrderReqs.some((r: any) => PAID_REQ_STATUSES.has(String(r.status || "").toUpperCase()));

      const nextSendCount = Math.max(
        Number((order as any).posSendCount || 0) + 1,
        allOrderReqs.length || 1
      );

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "status" = $8,
             "quoteStatus" = $9,
             "quoteApprovedAt" = CURRENT_TIMESTAMP,
             "quoteTaxRate" = $6,
             "quoteDiscount" = $7,
             "totalCost" = $2,
             "itemsJson" = $3,
             "servicesJson" = $4,
             "posRequestId" = $5,
             "posSendCount" = $10,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1`,
        order.id,
        totalCalculado,
        JSON.stringify(items),
        JSON.stringify(services),
        posRequest.id,
        taxRate,
        discount,
        alreadyPaidInPos ? "Trabajando" : "EN_CAJA",
        alreadyPaidInPos ? "Pagado" : "Aprobado",
        nextSendCount
      );

      // 5. Opcional: Registrar órdenes de compra en PurchaseOrder agrupadas por proveedor
      if (registrarOrdenesCompra) {
        const itemsConProveedor = items.filter((it: any) => it.supplierName && it.supplierName !== "Proveedor General" && Number(it.costPrice || 0) > 0);
        const gruposPorProveedor: Record<string, any[]> = {};

        itemsConProveedor.forEach((it: any) => {
          const sup = it.supplierName;
          if (!gruposPorProveedor[sup]) gruposPorProveedor[sup] = [];
          gruposPorProveedor[sup].push(it);
        });

        const normOrderNum = String(order.orderNumber || order.id).replace(/^OT-/i, "");
        for (const [supName, repuestos] of Object.entries(gruposPorProveedor)) {
          const totalCompra = repuestos.reduce((acc, it) => acc + (Number(it.costPrice || 0) * Number(it.qty || 1)), 0);
          const supSlug = supName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 24) || "prov";
          const poNumber = `OC-${normOrderNum}-${supSlug}`;

          await prisma.$executeRawUnsafe(
            `INSERT INTO "PurchaseOrder" 
              ("id", "orderNumber", "supplierName", "expectedDate", "itemsJson", "total", "status", "notes", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, 'Inmediato', $4, $5, 'Solicitado', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT ("orderNumber") DO UPDATE SET
               "itemsJson" = EXCLUDED."itemsJson",
               "total" = EXCLUDED."total",
               "notes" = EXCLUDED."notes",
               "updatedAt" = CURRENT_TIMESTAMP`,
            `po_${normOrderNum}_${supSlug}`,
            poNumber,
            supName,
            JSON.stringify(repuestos),
            Number(totalCompra.toFixed(2)),
            `Compra automática para Orden #${order.orderNumber} - Placa ${order.plate}`
          ).catch(() => {});
        }
      }

      emitRealtimeEvent({ channel: "presupuestos", action: "status_changed", entityId: order.id });
      emitRealtimeEvent({ channel: "taller", action: "status_changed", entityId: order.id });
      emitRealtimeEvent({ channel: "ordenes", action: "created", entityId: posRequest.id });

      return NextResponse.json({
        success: true,
        message: "¡Presupuesto autorizado con éxito! La orden ya está disponible en el POS de venta para cobro.",
        posRequestId: posRequest.id,
        orderNumber: order.orderNumber,
        total: totalCalculado,
        posSendCount: nextSendCount,
        isPaidInPos: alreadyPaidInPos,
      });
    });
  } catch (error: any) {
    console.error("Error al autorizar presupuesto y enviar a POS:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al autorizar presupuesto hacia POS." },
      { status: 500 }
    );
  }
}
