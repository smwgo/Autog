import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { getVerifiedSessionFromRequest } from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

function getReadSettingId(req: Request): string {
  const session = getVerifiedSessionFromRequest(req);
  const key = (session?.id || session?.email || "global").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `notif_read_${key}`;
}

function hasPayments(paymentsJson: string | null | undefined): boolean {
  if (!paymentsJson || paymentsJson === "[]") return false;
  try {
    const parsed = JSON.parse(paymentsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    return parsed.some((p: any) => Number(p?.amount ?? p?.monto ?? 0) > 0);
  } catch {
    return false;
  }
}

function classifyOrderNotification(order: {
  status: string;
  paymentsJson: string | null;
  completedAt: Date | null;
}): {
  etapa: "Pagada" | "Atendida" | "Creada";
  type: "SUCCESS" | "INFO";
  icon: string;
} {
  const st = String(order.status || "").trim().toLowerCase();

  if (
    st.includes("pagad") ||
    st.includes("facturad") ||
    hasPayments(order.paymentsJson)
  ) {
    return { etapa: "Pagada", type: "SUCCESS", icon: "💳" };
  }

  if (
    order.completedAt ||
    st.includes("proceso") ||
    st.includes("reparaci") ||
    st.includes("terminad") ||
    st.includes("finalizad") ||
    st.includes("listo") ||
    st.includes("entregad") ||
    st.includes("atendid")
  ) {
    return { etapa: "Atendida", type: "SUCCESS", icon: "🔧" };
  }

  return { etapa: "Creada", type: "INFO", icon: "📋" };
}

function formatBranchLabel(branch: string | null | undefined): string {
  const b = String(branch || "PRINCIPAL").trim().toUpperCase();
  if (b.includes("SUCURSAL") || b.includes("NORTE")) return "Sucursal";
  return "Principal";
}

export async function GET(req: Request) {
  try {
    const settingId = getReadSettingId(req);

    return await withRetry(async () => {
      const [orders, pendingRequests, lowStockRows, readSetting] = await Promise.all([
        prisma.workshopOrder.findMany({
          select: {
            id: true,
            orderNumber: true,
            vehicle: true,
            plate: true,
            status: true,
            mechanic: true,
            branch: true,
            paymentsJson: true,
            completedAt: true,
            updatedAt: true,
          },
          take: 15,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.orderRequest.findMany({
          where: { status: "PENDIENTE", type: { in: ["TIENDA", "LANDING", "REPUESTO", "SERVICIO", "TALLER"] } },
          select: { id: true, requestNumber: true, type: true, customerName: true, createdAt: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        }).catch(() => []),
        prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
          `SELECT COUNT(*)::int AS cnt FROM "Product" WHERE ("stock" + "stockNorte") <= "minStock"`
        ).catch(() => [{ cnt: 0 }]),
        prisma.systemSetting.findUnique({ where: { id: settingId } }).catch(() => null),
      ]);

      let readIds = new Set<string>();
      if (readSetting?.configJson) {
        try {
          const parsed = JSON.parse(readSetting.configJson);
          if (Array.isArray(parsed)) readIds = new Set(parsed.map(String));
        } catch {}
      }

      const lowStockCount = Array.isArray(lowStockRows) && lowStockRows[0] ? Number(lowStockRows[0].cnt || 0) : 0;

      const orderItems = orders.map((o) => {
        const { etapa, type, icon } = classifyOrderNotification(o);
        const sedeLabel = formatBranchLabel(o.branch);
        const id = `ord-${o.id}`;
        return {
          id,
          type,
          icon,
          title: `${etapa} • ${sedeLabel}`,
          text: `${o.plate} • ${etapa} • ${sedeLabel}`,
          date: new Date(o.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          read: readIds.has(id),
          link: "/taller/ordenes",
        };
      });

      const requestItems = pendingRequests.map((r) => {
        const id = `req-${r.id}`;
        return {
          id,
          type: "INFO",
          icon: "📩",
          title: `Solicitud ${r.type}`,
          text: `${r.requestNumber} • ${r.customerName}`,
          date: new Date(r.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          read: readIds.has(id),
          link: "/pos",
        };
      });

      const stockItems =
        lowStockCount > 0
          ? [
              {
                id: `stock-alert-${lowStockCount}`,
                type: "WARNING",
                icon: "⚠️",
                title: "Alerta de Inventario",
                text: `${lowStockCount} producto(s) con stock igual o menor al mínimo.`,
                date: "Ahora",
                read: readIds.has(`stock-alert-${lowStockCount}`),
                link: "/gerencia/inventario",
              },
            ]
          : [];

      const items = [...stockItems, ...requestItems, ...orderItems];
      const unreadCount = items.filter((i) => !i.read).length;

      return NextResponse.json({
        success: true,
        notificaciones: items,
        unreadCount,
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

export async function POST(req: Request) {
  try {
    const settingId = getReadSettingId(req);
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: true });
    }

    const existing = await prisma.systemSetting.findUnique({ where: { id: settingId } }).catch(() => null);
    let prevIds: string[] = [];
    if (existing?.configJson) {
      try {
        const parsed = JSON.parse(existing.configJson);
        if (Array.isArray(parsed)) prevIds = parsed.map(String);
      } catch {}
    }

    const merged = Array.from(new Set([...prevIds, ...ids])).slice(-200);
    await prisma.systemSetting.upsert({
      where: { id: settingId },
      update: { configJson: JSON.stringify(merged) },
      create: { id: settingId, configJson: JSON.stringify(merged) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al marcar notificaciones" },
      { status: 500 }
    );
  }
}
