import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const results = await withRetry(async () => {
      const [customers, orders, products, sales] = await Promise.all([
        prisma.customer.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { identification: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 4,
          include: { vehicles: true },
        }),
        (prisma as any).workshopOrder.findMany({
          where: {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { vehicle: { contains: q, mode: "insensitive" } },
              { plate: { contains: q, mode: "insensitive" } },
              { client: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 4,
        }),
        prisma.product.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 4,
        }),
        prisma.sale.findMany({
          where: {
            OR: [
              { saleNumber: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 4,
        }),
      ]);

      const items: any[] = [];

      customers.forEach((c) => {
        const plates = c.vehicles.map((v) => v.plate).join(", ");
        items.push({
          id: `cust-${c.id}`,
          title: c.name,
          subtitle: `Cliente • Tel: ${c.phone}${plates ? ` • Placas: ${plates}` : ""}`,
          badge: "Cliente",
          badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
          href: "/pos/clientes",
        });
      });

      orders.forEach((o: any) => {
        items.push({
          id: `ord-${o.id}`,
          title: `Orden #${o.orderNumber}`,
          subtitle: `Taller • ${o.vehicle} (${o.plate}) • ${o.status}`,
          badge: "Taller",
          badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
          href: "/taller/ordenes",
        });
      });

      products.forEach((p) => {
        items.push({
          id: `prod-${p.id}`,
          title: p.name,
          subtitle: `Producto (${p.code}) • $${Number(p.price).toFixed(2)} • Stock: ${p.stock}`,
          badge: "Inventario",
          badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
          href: "/pos/catalogo",
        });
      });

      sales.forEach((s) => {
        items.push({
          id: `sale-${s.id}`,
          title: `Factura ${s.saleNumber}`,
          subtitle: `${s.customerName} • Total: $${Number(s.total).toFixed(2)} • ${s.status}`,
          badge: "Factura",
          badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
          href: "/pos/facturas",
        });
      });

      return items;
    });

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Error en búsqueda global:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al buscar en base de datos", results: [] },
      { status: 500 }
    );
  }
}
