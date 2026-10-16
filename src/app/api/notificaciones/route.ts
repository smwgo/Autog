import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return await withRetry(async () => {
      // 1. Obtener productos con stock bajo o agotados en Neon
      const lowStockProducts = await prisma.product.findMany({
        where: {
          OR: [{ status: "Bajo Stock" }, { status: "Agotado" }, { stock: { lte: 5 } }],
        },
        take: 3,
        orderBy: { stock: "asc" },
      });

      // 2. Obtener solicitudes web pendientes en Neon
      const pendingRequests = await (prisma as any).orderRequest.findMany({
        where: { status: "PENDIENTE" },
        take: 3,
        orderBy: { createdAt: "desc" },
      });

      // 3. Obtener órdenes de taller activas en Neon
      const activeWorkshopOrders = await (prisma as any).workshopOrder.findMany({
        take: 3,
        orderBy: { updatedAt: "desc" },
      });

      // Construir notificaciones en tiempo real basadas en la base de datos
      const items: any[] = [];

      lowStockProducts.forEach((p) => {
        items.push({
          id: `stock-${p.id}`,
          type: "WARNING",
          icon: "⚠️",
          title: "Stock Crítico en Inventario",
          text: `El producto ${p.name} (${p.code}) cuenta con solo ${p.stock} unidad(es) disponibles.`,
          date: "Reciente",
          read: false,
          link: "/pos/catalogo",
        });
      });

      pendingRequests.forEach((r: any) => {
        items.push({
          id: `req-${r.id}`,
          type: "INFO",
          icon: "🛒",
          title: `Nueva Solicitud: ${r.type}`,
          text: `Cliente ${r.customerName} solicitó ${r.itemsSummary}.`,
          date: new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: false,
          link: "/pos/venta",
        });
      });

      activeWorkshopOrders.forEach((o: any) => {
        items.push({
          id: `ord-${o.id}`,
          type: "SUCCESS",
          icon: "🔧",
          title: `Orden Taller ${o.orderNumber}`,
          text: `Vehículo ${o.vehicle} (${o.plate}) en estado: ${o.status}. Mecánico: ${o.mechanic}.`,
          date: new Date(o.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: o.status === "Terminado" || o.status === "Facturado",
          link: "/taller/ordenes",
        });
      });

      return NextResponse.json({
        success: true,
        notificaciones: items,
        unreadCount: items.filter((i) => !i.read).length,
      });
    });
  } catch (error: any) {
    console.error("Error al consultar notificaciones en Neon DB:", error);
    return NextResponse.json(
      { success: false, notificaciones: [], unreadCount: 0, error: error.message },
      { status: 500 }
    );
  }
}
