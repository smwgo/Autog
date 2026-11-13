import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST: Cambiar estado de propuesta/presupuesto (Pagado, Aprobar o Esperar/Pendiente)
 * Cuando se marca como Pagado, pasa al historial de POS/Propuesta y se retira de Taller.
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

    const qUpper = String(quoteStatus).trim().toUpperCase();
    const esPagado = qUpper === "PAGADO" || qUpper === "FACTURADO" || qUpper === "FACTURADA";
    const esPausado = qUpper === "PAUSA" || qUpper === "PAUSADA" || qUpper === "PAUSADO";
    const esAprobado =
      qUpper === "APROBADO" ||
      qUpper === "AUTORIZADO" ||
      qUpper === "TRABAJANDO" ||
      qUpper === "EN PROCESO";

    const estadoNormalizado = esPagado
      ? "Pagado"
      : esPausado
      ? "Pausada"
      : esAprobado
      ? "Aprobado"
      : "Pendiente";

    const approvedAt = esPagado || esAprobado ? new Date() : null;

    return await withRetry(async () => {
      if (esPagado) {
        // 1. Marcar como Pagado en WorkshopOrder para retirarla de Taller (autosEnPista)
        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "status" = 'Pagado',
               "quoteStatus" = 'Pagado',
               "deliveryStatus" = 'Facturado',
               "quoteApprovedAt" = COALESCE("quoteApprovedAt", $2::timestamp),
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1 OR "orderNumber" = $1`,
          orderId,
          approvedAt
        );

        // 2. Sincronizar con OrderRequest y WorkshopHistory
        try {
          const ordRows: any[] = await prisma.$queryRawUnsafe(
            `SELECT * FROM "WorkshopOrder" WHERE "id" = $1 OR "orderNumber" = $1 LIMIT 1`,
            orderId
          );
          const ord = ordRows?.[0];
          if (ord) {
            const normNum = String(ord.orderNumber || "").trim().replace(/^OT-/i, "");
            if (normNum) {
              await prisma.$executeRawUnsafe(
                `UPDATE "OrderRequest" SET "status" = 'DESPACHADO', "updatedAt" = CURRENT_TIMESTAMP WHERE "requestNumber" = $1 OR "requestNumber" = $2 OR "id" = $3`,
                normNum,
                `OT-${normNum}`,
                ord.posRequestId || ""
              ).catch(() => {});
            }

            const existingHist: any[] = await prisma.$queryRawUnsafe(
              `SELECT "id" FROM "WorkshopHistory" WHERE "orderNumber" = $1 LIMIT 1`,
              ord.orderNumber
            );
            if (!existingHist || existingHist.length === 0) {
              const hId = "hst_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
              const srvCode = `PROP-${Math.floor(1000 + Math.random() * 9000)}`;
              const todayStr = new Date().toISOString().split("T")[0];
              await prisma.$executeRawUnsafe(
                `INSERT INTO "WorkshopHistory" ("id", "serviceCode", "date", "vehicle", "plate", "client", "servicesJson", "cost", "mechanic", "mileage", "notes", "orderNumber", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Reciente', $10, $11, NOW(), NOW())`,
                hId,
                srvCode,
                todayStr,
                ord.vehicle || "Vehículo",
                ord.plate || "S/P",
                ord.client || "Cliente",
                ord.servicesJson || '["Servicio Taller"]',
                Number(ord.totalCost || 0),
                ord.mechanic || "Taller",
                ord.notes || "Propuesta pagada.",
                ord.orderNumber
              ).catch(() => {});
            }
          }
        } catch {}
      } else if (esPausado) {
        // Marcar como Pausada en WorkshopOrder (manteniendo fuera de Pagado para que aparezca en Taller como Pausada)
        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "status" = 'Pausada',
               "quoteStatus" = CASE WHEN "quoteStatus" IN ('Pagado', 'PAGADO', 'Facturado', 'FACTURADO') THEN 'Aprobado' ELSE COALESCE("quoteStatus", 'Pendiente') END,
               "deliveryStatus" = CASE WHEN "deliveryStatus" IN ('Facturado', 'FACTURADO', 'Pagado', 'PAGADO') THEN 'Pendiente' ELSE "deliveryStatus" END,
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1 OR "orderNumber" = $1`,
          orderId
        );
      } else {
        // Actualizar Aprobado (pasa a En Proceso / Trabajando) o Pendiente (En espera)
        await prisma.$executeRawUnsafe(
          `UPDATE "WorkshopOrder"
           SET "quoteStatus" = $2,
               "quoteApprovedAt" = $3::timestamp,
               "status" = CASE
                 WHEN $2 = 'Aprobado' THEN 'En Proceso'
                 WHEN "status" IN ('Pagado', 'PAGADO', 'Facturado', 'FACTURADO', 'Pausada', 'PAUSADA') THEN 'En Proceso'
                 ELSE "status"
               END,
               "deliveryStatus" = CASE WHEN "deliveryStatus" IN ('Facturado', 'FACTURADO', 'Pagado', 'PAGADO') THEN 'Pendiente' ELSE "deliveryStatus" END,
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = $1 OR "orderNumber" = $1`,
          orderId,
          estadoNormalizado,
          approvedAt
        );
      }

      // Si existe registro en clientQuote / ClientQuote, sincronizar también
      await prisma.$executeRawUnsafe(
        `UPDATE "clientQuote"
         SET "status" = $2,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1 OR "quoteNumber" = $1`,
        orderId,
        esPagado ? "Pagada" : esPausado ? "Pausada" : estadoNormalizado === "Aprobado" ? "Aprobada" : "Pendiente"
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        orderId,
        status: esPagado ? "Pagado" : esPausado ? "Pausada" : "En Proceso",
        quoteStatus: estadoNormalizado,
        quoteApprovedAt: approvedAt,
        message: esPagado
          ? "✓ Propuesta marcada como Pagada. Se retiró de Taller y quedó en el historial."
          : esPausado
          ? "⏸ Orden puesta en Pausa. Ya figura '● Pausada' en Taller."
          : estadoNormalizado === "Aprobado"
          ? "Propuesta aprobada con éxito. Ya figura '● Trabajando' en Taller."
          : "Propuesta puesta en espera. Ya figura '● En espera' en Taller.",
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
