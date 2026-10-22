import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

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
    const { orderId, items = [], services = [], notes, registrarOrdenesCompra = true } = body;

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

      // 2. Consolidar ítems para POS
      const totalRepuestos = items.reduce((acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0);
      const totalServicios = services.reduce((acc: number, sv: any) => acc + Number(sv.price || 0), 0);
      const totalCalculado = Number((totalRepuestos + totalServicios).toFixed(2));

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
          qty: 1,
          isService: true,
          empleado_nombre: sv.mechanic || order.mechanic || "Taller",
        });
      });

      const itemsSummary = [
        ...items.map((i: any) => `${i.qty || 1}x ${i.name}`),
        ...services.map((s: any) => `1x ${s.name}`),
      ].join(", ");

      const requestNumber = order.orderNumber.startsWith("OT-")
        ? order.orderNumber
        : `OT-${order.orderNumber}`;

      // 3. Crear o actualizar la solicitud en OrderRequest para que POS la reciba
      const posNotes = `[PRESUPUESTO AUTORIZADO] Orden #${order.orderNumber} | Placa: ${order.plate} | Vehículo: ${order.vehicle} | Mecánico: ${order.mechanic} | Tel: ${order.clientPhone || "N/A"}${notes ? ` | Nota: ${notes}` : ""}`;

      const existingReq = await (prisma as any).orderRequest
        .findUnique({ where: { requestNumber } })
        .catch(() => null);

      let posRequest: any;
      if (existingReq) {
        posRequest = await (prisma as any).orderRequest.update({
          where: { id: existingReq.id },
          data: {
            customerName: order.client,
            customerPhone: order.clientPhone || null,
            vehicleInfo: `${order.vehicle} [${order.plate}]`,
            itemsSummary,
            itemsJson: JSON.stringify(posItemsPayload),
            totalEstimated: totalCalculado,
            notes: posNotes,
            status: "PENDIENTE",
          },
        });
      } else {
        posRequest = await (prisma as any).orderRequest.create({
          data: {
            requestNumber,
            type: "TALLER",
            customerName: order.client,
            customerPhone: order.clientPhone || null,
            vehicleInfo: `${order.vehicle} [${order.plate}]`,
            itemsSummary,
            itemsJson: JSON.stringify(posItemsPayload),
            totalEstimated: totalCalculado,
            notes: posNotes,
            status: "PENDIENTE",
          },
        });
      }

      // 4. Actualizar la orden de trabajo
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "status" = 'EN_CAJA',
             "quoteStatus" = 'Aprobado',
             "quoteApprovedAt" = CURRENT_TIMESTAMP,
             "totalCost" = $2,
             "itemsJson" = $3,
             "servicesJson" = $4,
             "posRequestId" = $5,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1`,
        order.id,
        totalCalculado,
        JSON.stringify(items),
        JSON.stringify(services),
        posRequest.id
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

        for (const [supName, repuestos] of Object.entries(gruposPorProveedor)) {
          const totalCompra = repuestos.reduce((acc, it) => acc + (Number(it.costPrice || 0) * Number(it.qty || 1)), 0);
          const poNumber = `OC-${order.orderNumber}-${Date.now().toString().slice(-4)}`;

          await prisma.$executeRawUnsafe(
            `INSERT INTO "PurchaseOrder" 
              ("id", "orderNumber", "supplierName", "expectedDate", "itemsJson", "total", "status", "notes", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, 'Inmediato', $4, $5, 'Solicitado', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT ("orderNumber") DO NOTHING`,
            `po_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            poNumber,
            supName,
            JSON.stringify(repuestos),
            Number(totalCompra.toFixed(2)),
            `Compra automática para Orden #${order.orderNumber} - Placa ${order.plate}`
          ).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: "¡Presupuesto autorizado con éxito! La orden ya está disponible en el POS de venta para cobro.",
        posRequestId: posRequest.id,
        orderNumber: order.orderNumber,
        total: totalCalculado,
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
