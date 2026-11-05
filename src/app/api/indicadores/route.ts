import { NextResponse } from "next/server";
import { getNeonPrismaClient, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const isOpenStatus = (status: string, closedWords: string[]) => {
  const normalized = status.trim().toLowerCase();
  return !closedWords.some((word) => normalized.includes(word));
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const startDate = desde ? new Date(`${desde}T00:00:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = hasta ? new Date(`${hasta}T23:59:59.999`) : new Date();

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      return NextResponse.json({ success: false, error: "El rango de fechas no es válido." }, { status: 400 });
    }

    const database = getNeonPrismaClient();
    const data = await withRetry(async () => {
      const salesWhere = {
        createdAt: { gte: startDate, lte: endDate },
        status: { not: "Anulada" },
      };
      const [
        salesCount,
        soldItems,
        customerCount,
        products,
        orders,
        tasks,
        appointments,
        quotes,
        employees,
        users,
      ] = await Promise.all([
        database.sale.count({ where: salesWhere }),
        database.saleItem.findMany({
          where: { sale: salesWhere },
          select: {
            name: true,
            productId: true,
            quantity: true,
            product: { select: { category: true, tipo: true } },
          },
        }),
        database.customer.count(),
        database.product.findMany({
          select: { stock: true, stockNorte: true, minStock: true },
        }),
        database.workshopOrder.findMany({ select: { status: true } }),
        database.workshopTask.findMany({ select: { status: true } }),
        database.clientAppointment.findMany({ select: { status: true } }),
        database.clientQuote.findMany({ select: { status: true } }),
        database.employee.findMany({ select: { status: true } }),
        database.appUserAccess.count(),
      ]);

      const closedOrderStatuses = ["entreg", "finaliz", "termin", "historial", "cancel"];
      const completedStatuses = ["complet", "finaliz", "termin", "cancel", "entreg"];
      const closedQuoteStatuses = ["aprob", "acept", "rechaz", "cancel", "vencid"];
      const inactiveEmployeeStatuses = ["inactiv", "suspend", "baja", "desactiv"];

      const bestSellerByType = (isProduct: boolean) => {
        const totals = new Map<string, { name: string; quantity: number }>();
        for (const item of soldItems) {
          const itemIsService =
            !item.productId ||
            /servicio|service|taller/i.test(`${item.product?.category ?? ""} ${item.product?.tipo ?? ""}`);
          if (itemIsService === isProduct) continue;
          const name = item.name.trim();
          if (!name) continue;
          const key = name.toLocaleLowerCase();
          const current = totals.get(key);
          totals.set(key, {
            name: current?.name ?? name,
            quantity: (current?.quantity ?? 0) + item.quantity,
          });
        }

        return [...totals.values()].sort((a, b) => b.quantity - a.quantity)[0] ?? null;
      };

      return {
        salesCount,
        bestSellers: {
          product: bestSellerByType(true),
          service: bestSellerByType(false),
        },
        customers: customerCount,
        inventory: {
          products: products.length,
          units: products.reduce((sum, product) => sum + product.stock + product.stockNorte, 0),
          lowStock: products.filter(
            (product) =>
              product.stock <= product.minStock || product.stockNorte <= product.minStock
          ).length,
        },
        workshop: {
          activeOrders: orders.filter((order) => isOpenStatus(order.status, closedOrderStatuses)).length,
          openTasks: tasks.filter((task) => isOpenStatus(task.status, completedStatuses)).length,
        },
        appointments: appointments.filter(
          (appointment) => isOpenStatus(appointment.status, completedStatuses)
        ).length,
        pendingQuotes: quotes.filter(
          (quote) => isOpenStatus(quote.status, closedQuoteStatuses)
        ).length,
        teamMembers: employees.filter(
          (employee) => isOpenStatus(employee.status, inactiveEmployeeStatuses)
        ).length,
        systemUsers: users,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error al cargar indicadores globales:", error);
    return NextResponse.json(
      { success: false, error: "No se pudieron cargar los indicadores de la aplicación." },
      { status: 500 }
    );
  }
}
