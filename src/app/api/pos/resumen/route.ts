import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await withRetry(async () => {
      const safeCount = async (tableName: string, whereClause = "") => {
        try {
          const res: any[] = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int as cnt FROM "${tableName}" ${whereClause}`
          );
          return res[0]?.cnt ?? 0;
        } catch {
          return 0;
        }
      };

      const [
        sales,
        customers,
        products,
        services,
        cashSessions,
        quotes,
        credits,
        pendingOrders,
      ] = await Promise.all([
        safeCount("Sale"),
        safeCount("Customer"),
        safeCount("Product"),
        safeCount("WorkshopService"),
        safeCount("CashRegister"),
        safeCount("OrderRequest", `WHERE "type" = 'COTIZACION'`),
        safeCount("PosCreditAccount"),
        safeCount("OrderRequest", `WHERE "status" = 'PENDIENTE'`),
      ]);

      return {
        venta: pendingOrders,
        facturas: sales,
        clientes: customers,
        catalogo: products,
        servicios: services,
        caja: cashSessions,
        cotizaciones: quotes,
        creditos: credits,
      };
    });

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error("Error GET /api/pos/resumen:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error cargando resumen POS" },
      { status: 500 }
    );
  }
}
