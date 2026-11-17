import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { emitRealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/**
 * POST: Guardar borrador o actualización del presupuesto de una orden de trabajo.
 * Guarda repuestos con proveedor, costo de compra, PVP de venta y estado del pedido.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      items = [],
      services = [],
      notes,
      quoteStatus,
      quoteTaxRate,
      quoteDiscount,
      inspectionFindings,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "ID de orden requerido" },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      // Calcular total de la orden sumando los valores de la columna PVP de productos y servicios
      const totalRepuestos = items.reduce((acc: number, it: any) => acc + Number(it.price || 0), 0);
      const totalServicios = services.reduce((acc: number, sv: any) => acc + Number(sv.price || 0), 0);
      const subtotalCalculado = Number((totalRepuestos + totalServicios).toFixed(2));

      const taxRate = Number(quoteTaxRate !== undefined ? quoteTaxRate : 15);
      const discount = Number(quoteDiscount !== undefined ? quoteDiscount : 0);
      const valorDescuento = Number(((subtotalCalculado * discount) / 100).toFixed(2));
      const baseImponible = Math.max(0, subtotalCalculado - valorDescuento);
      const valorIva = Number(((baseImponible * taxRate) / 100).toFixed(2));
      const totalCalculado = Number((baseImponible + valorIva).toFixed(2));

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "itemsJson" = $2,
             "servicesJson" = $3,
             "totalCost" = $4,
             "notes" = COALESCE($5, "notes"),
             "quoteStatus" = COALESCE($6, "quoteStatus"),
             "quoteTaxRate" = COALESCE($7, "quoteTaxRate"),
             "quoteDiscount" = COALESCE($8, "quoteDiscount"),
             "inspectionFindingsJson" = COALESCE($9, "inspectionFindingsJson"),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1 OR "orderNumber" = $1`,
        orderId,
        JSON.stringify(items),
        JSON.stringify(services),
        totalCalculado,
        notes !== undefined ? notes : null,
        quoteStatus || "Cotizando",
        quoteTaxRate !== undefined ? Number(quoteTaxRate) : null,
        quoteDiscount !== undefined ? Number(quoteDiscount) : null,
        inspectionFindings !== undefined ? JSON.stringify(inspectionFindings) : null
      );

      emitRealtimeEvent({ channel: "presupuestos", action: "updated", entityId: orderId });
      emitRealtimeEvent({ channel: "taller", action: "updated", entityId: orderId });

      return NextResponse.json({
        success: true,
        message: "Presupuesto guardado correctamente en Neon PostgreSQL.",
        total: totalCalculado,
        subtotal: subtotalCalculado,
        itemCount: items.length,
        serviceCount: services.length,
        findingsCount: Array.isArray(inspectionFindings) ? inspectionFindings.length : undefined,
      });
    });
  } catch (error: any) {
    console.error("Error al guardar presupuesto:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar el presupuesto." },
      { status: 500 }
    );
  }
}
