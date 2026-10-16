import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await withRetry(async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "FinancialTransaction" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "dateLabel" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "category" TEXT NOT NULL DEFAULT 'Ventas',
          "reference" TEXT NOT NULL,
          "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
          "isIncome" BOOLEAN NOT NULL DEFAULT true,
          "method" TEXT NOT NULL DEFAULT 'Efectivo',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const [sales, orders, customersCount, productsCount] = await Promise.all([
        prisma.sale.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.workshopOrder.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
        prisma.customer.count(),
        prisma.product.count(),
      ]);

      const txs: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "FinancialTransaction"`);

      const salesRevenue = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
      const txIncome = txs.filter(t => t.isIncome).reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const txExpenses = txs.filter(t => !t.isIncome).reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const totalIncome = salesRevenue + txIncome;
      const activeOrdersCount = orders.length;
      const avgTicket = activeOrdersCount > 0
        ? orders.reduce((acc, o) => acc + Number(o.totalCost || 0), 0) / activeOrdersCount
        : 0;

      let employeesCount = 0;
      try {
        const emp: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "Employee"`);
        if (emp[0]?.cnt != null) employeesCount = emp[0].cnt;
      } catch {}

      let logsCount = 0;
      try {
        const lg: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "AuditLog"`);
        if (lg[0]?.cnt != null) logsCount = lg[0].cnt;
      } catch {}

      return {
        ingresosHoy: totalIncome,
        egresosTotal: txExpenses,
        ordenesActivas: activeOrdersCount,
        ticketPromedio: avgTicket,
        clientesTotal: customersCount,
        productosTotal: productsCount,
        empleadosTotal: employeesCount,
        eventosAuditoria: logsCount,
        ultimasOrdenes: orders.slice(0, 6).map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          client: o.client,
          vehicle: o.vehicle,
          amount: Number(o.totalCost || 0),
        })),
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al cargar resumen gerencial" }, { status: 500 });
  }
}
