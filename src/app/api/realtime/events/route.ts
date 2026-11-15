import type { NextRequest } from "next/server";
import {
  getRealtimeVersions,
  subscribeRealtime,
  type RealtimeChannel,
  type RealtimeEvent,
} from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_CHANNELS = new Set<RealtimeChannel>([
  "taller",
  "presupuestos",
  "clientes",
  "vehiculos",
  "ordenes",
  "all",
]);

function parseChannels(raw: string | null): Set<RealtimeChannel> {
  if (!raw) return new Set<RealtimeChannel>(["all"]);
  const parts = raw
    .split(",")
    .map((c) => c.trim())
    .filter((c): c is RealtimeChannel => VALID_CHANNELS.has(c as RealtimeChannel));
  if (parts.length === 0 || parts.includes("all")) {
    return new Set<RealtimeChannel>(["all"]);
  }
  return new Set(parts);
}

/**
 * Endpoint SSE para sincronización en tiempo real entre sesiones, pestañas y dispositivos.
 * También responde ?versions=1 en JSON para verificación rápida al recuperar foco.
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("versions") === "1") {
    return Response.json(
      { versions: getRealtimeVersions() },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  const subscribed = parseChannels(request.nextUrl.searchParams.get("channels"));
  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
          cleanup?.();
        }
      };

      const sendEvent = (eventName: string, data: unknown, id?: string) => {
        const lines: string[] = [];
        if (id) lines.push(`id: ${id}`);
        lines.push(`event: ${eventName}`);
        lines.push(`data: ${JSON.stringify(data)}`);
        lines.push("");
        safeEnqueue(`${lines.join("\n")}\n`);
      };

      sendEvent("ready", { versions: getRealtimeVersions(), timestamp: Date.now() });

      const unsubscribe = subscribeRealtime((event: RealtimeEvent) => {
        if (!subscribed.has("all") && !subscribed.has(event.channel)) {
          return;
        }
        sendEvent("change", event, event.id);
      });

      const heartbeat = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, 25000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Stream ya cerrado
        }
      };

      request.signal.addEventListener("abort", () => {
        cleanup?.();
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
