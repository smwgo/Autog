import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST: Guardar borrador o actualización del presupuesto de una orden de trabajo.
 * Guarda repuestos con proveedor, costo de compra, PVP de venta y estado del pedido.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, items = [], services = [], notes, quoteStatus } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "ID de orden requerido" },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      // Calcular total de la orden
      const totalRepuestos = items.reduce((acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0);
      const totalServicios = services.reduce((acc: number, sv: any) => acc + Number(sv.price || 0), 0);
      const totalCalculado = Number((totalRepuestos + totalServicios).toFixed(2));

      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "itemsJson" = $2,
             "servicesJson" = $3,
             "totalCost" = $4,
             "notes" = COALESCE($5, "notes"),
             "quoteStatus" = COALESCE($6, "quoteStatus"),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1 OR "orderNumber" = $1`,
        orderId,
        JSON.stringify(items),
        JSON.stringify(services),
        totalCalculado,
        notes !== undefined ? notes : null,
        quoteStatus || "Cotizando"
      );

      return NextResponse.json({
        success: true,
        message: "Presupuesto guardado correctamente.",
        total: totalCalculado,
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
