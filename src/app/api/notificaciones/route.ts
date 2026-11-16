import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let cachedNotifPayload: { notificaciones: any[]; unreadCount: number } | null = null;
let lastNotifCacheTime = 0;
const NOTIF_CACHE_TTL_MS = 15000;

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
      const orders = await prisma.workshopOrder.findMany({
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
      });

      const items = orders.map((o) => {
        const { etapa, type, icon } = classifyOrderNotification(o);
        const sedeLabel = formatBranchLabel(o.branch);
        return {
          id: `ord-${o.id}`,
          type,
          icon,
          title: `${etapa} • ${sedeLabel}`,
          text: `${o.plate} • ${etapa} • ${sedeLabel}`,
          date: new Date(o.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          read: false,
          link: "/taller/ordenes",
        };
      });

      const payload = {
        notificaciones: items,
        unreadCount: items.length,
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
