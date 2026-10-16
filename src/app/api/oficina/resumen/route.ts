import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export async function GET() {
  try {
    const summary = await withRetry(async () => {
      let quotesCount = 0;
      let appointmentsCount = 0;
      let invoicesCount = 0;
      let suppliersCount = 0;

      try {
        const q: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "ClientQuote"`);
        quotesCount = q[0]?.cnt || 0;
      } catch {}

      try {
        const a: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "ClientAppointment"`);
        appointmentsCount = a[0]?.cnt || 0;
      } catch {}

      try {
        const i: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "ClientInvoice"`);
        invoicesCount = i[0]?.cnt || 0;
      } catch {}

      try {
        const s: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "Supplier"`);
        suppliersCount = s[0]?.cnt || 0;
      } catch {}

      const ordersCount = await prisma.workshopOrder.count();
      const openRegister = await prisma.cashRegister.findFirst({
        where: { status: "ABIERTA" },
      });

      return {
        ordenesTotal: quotesCount + ordersCount,
        citasHoy: appointmentsCount,
        facturasEmitidas: invoicesCount,
        proveedoresActivos: suppliersCount,
        cajaAbierta: !!openRegister,
      };
    });

    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
