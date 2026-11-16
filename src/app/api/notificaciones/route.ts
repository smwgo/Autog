import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let cachedNotifPayload: { notificaciones: any[]; unreadCount: number } | null = null;
let lastNotifCacheTime = 0;
const NOTIF_CACHE_TTL_MS = 15000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedNotifPayload && now - lastNotifCacheTime < NOTIF_CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        ...cachedNotifPayload,
      });
    }

    return await withRetry(async () => {
      const companyConfig = await (prisma as any).companyConfig
        ?.findUnique({
          where: { id: "default" },
          select: { alertasStockBajo: true, umbralStockBajo: true },
        })
        .catch(() => null);
      const alertasStockActivas = companyConfig ? companyConfig.alertasStockBajo !== false : true;
      const umbralStock = Number(companyConfig?.umbralStockBajo ?? 5);

      const [lowStockProducts, pendingRequests, activeWorkshopOrders, urgentTasks] =
        await Promise.all([
          alertasStockActivas
            ? prisma.product.findMany({
                where: {
                  OR: [{ status: "Bajo Stock" }, { status: "Agotado" }, { stock: { lte: umbralStock } }],
                },
                select: { id: true, name: true, code: true, stock: true },
                take: 3,
                orderBy: { stock: "asc" },
              })
            : Promise.resolve([]),
          (prisma as any).orderRequest.findMany({
            where: { status: "PENDIENTE" },
            select: { id: true, type: true, customerName: true, itemsSummary: true, createdAt: true },
            take: 3,
            orderBy: { createdAt: "desc" },
          }),
          (prisma as any).workshopOrder.findMany({
            select: {
              id: true,
              orderNumber: true,
              vehicle: true,
              plate: true,
              status: true,
              mechanic: true,
              updatedAt: true,
            },
            take: 3,
            orderBy: { updatedAt: "desc" },
          }),
          (prisma as any).managementTask
            ?.findMany({
              where: { status: "PENDIENTE" },
              select: {
                id: true,
                title: true,
                priority: true,
                area: true,
                assignee: true,
                dueDateLabel: true,
              },
              take: 3,
              orderBy: { createdAt: "desc" },
            })
            .catch(() => []),
        ]);

      // Construir notificaciones en tiempo real basadas en la base de datos
      const items: any[] = [];

      (urgentTasks || []).forEach((t: any) => {
        items.push({
          id: `task-${t.id}`,
          type: t.priority === "URGENTE" ? "WARNING" : "INFO",
          icon: t.priority === "URGENTE" ? "⚡" : "📋",
          title: `Tarea Pendiente (${t.area || "Gerencia"})`,
          text: `${t.title}${t.assignee ? ` — ${t.assignee}` : ""}`,
          date: t.dueDateLabel || "Pendiente",
          read: false,
          link: "/gerencia/tareas",
        });
      });

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

      const payload = {
        notificaciones: items,
        unreadCount: items.filter((i) => !i.read).length,
      };
      cachedNotifPayload = payload;
      lastNotifCacheTime = Date.now();

      return NextResponse.json({
        success: true,
        ...payload,
      });
    });
  } catch (error: any) {
    console.error("Error al consultar notificaciones en base de datos:", error);
    return NextResponse.json(
      { success: false, notificaciones: [], unreadCount: 0, error: error.message },
      { status: 500 }
    );
  }
}
