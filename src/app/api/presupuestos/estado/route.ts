import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST: Cambiar estado de propuesta/presupuesto (Aprobar o Esperar/Pendiente)
 * Esto se sincroniza inmediatamente con el Panel de Taller.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, quoteStatus } = body;

    if (!orderId || !quoteStatus) {
      return NextResponse.json(
        { success: false, error: "ID de orden y estado requeridos." },
        { status: 400 }
      );
    }

    const estadoNormalizado =
      quoteStatus === "Aprobado" || quoteStatus === "AUTORIZADO"
        ? "Aprobado"
        : "Pendiente";

    const approvedAt = estadoNormalizado === "Aprobado" ? new Date().toISOString() : null;

    return await withRetry(async () => {
      // 1. Actualizar en WorkshopOrder
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopOrder"
         SET "quoteStatus" = $2,
             "quoteApprovedAt" = $3,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1 OR "orderNumber" = $1`,
        orderId,
        estadoNormalizado,
        approvedAt
      );

      // 2. Si existe registro en clientQuote / ClientQuote, sincronizar también
      await prisma.$executeRawUnsafe(
        `UPDATE "clientQuote"
         SET "status" = $2,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1 OR "quoteNumber" = $1`,
        orderId,
        estadoNormalizado === "Aprobado" ? "Aprobada" : "Pendiente"
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        orderId,
        quoteStatus: estadoNormalizado,
        quoteApprovedAt: approvedAt,
        message:
          estadoNormalizado === "Aprobado"
            ? "Propuesta aprobada con éxito. Ya figura '✓ Aprobado' en Taller."
            : "Propuesta puesta en espera. Ya figura '● Enviado' en Taller.",
      });
    });
  } catch (error: any) {
    console.error("Error al actualizar estado de propuesta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar estado." },
      { status: 500 }
    );
  }
}
