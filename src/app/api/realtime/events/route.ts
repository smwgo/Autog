import type { NextRequest } from "next/server";
import {
  getRealtimeVersions,
  getSharedRealtimeVersions,
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
    const versions = await getSharedRealtimeVersions();
    return Response.json(
      { versions },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }

  const subscribed = parseChannels(request.nextUrl.searchParams.get("channels"));
  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let lastKnownVersions: Record<RealtimeChannel, number> = getRealtimeVersions();

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

      void getSharedRealtimeVersions().then((sharedVersions) => {
        if (closed) return;
        lastKnownVersions = sharedVersions;
        sendEvent("ready", { versions: sharedVersions, timestamp: Date.now() });
      });

      const unsubscribe = subscribeRealtime((event: RealtimeEvent) => {
        if (!subscribed.has("all") && !subscribed.has(event.channel)) {
          return;
        }
        lastKnownVersions[event.channel] = Math.max(
          lastKnownVersions[event.channel] ?? 0,
          event.version
        );
        sendEvent("change", event, event.id);
      });

      const dbPollInterval = setInterval(() => {
        if (closed) return;
        void getSharedRealtimeVersions().then((sharedVersions) => {
          if (closed) return;
          const channelsToCheck: Exclude<RealtimeChannel, "all">[] = [
            "taller",
            "presupuestos",
            "clientes",
            "vehiculos",
            "ordenes",
          ];
          for (const ch of channelsToCheck) {
            if (!subscribed.has("all") && !subscribed.has(ch)) continue;
            const prev = lastKnownVersions[ch] ?? 0;
            const curr = sharedVersions[ch] ?? 0;
            if (curr > prev) {
              lastKnownVersions[ch] = curr;
              const syntheticEvent: RealtimeEvent = {
                id: `db-${ch}-${curr}-${Date.now()}`,
                channel: ch,
                action: "updated",
                timestamp: Date.now(),
                version: curr,
              };
              sendEvent("change", syntheticEvent, syntheticEvent.id);
            }
          }
          lastKnownVersions.all = Math.max(
            lastKnownVersions.all ?? 0,
            sharedVersions.all ?? 0
          );
        });
      }, 4000);

      const heartbeat = setInterval(() => {
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      }, 25000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(dbPollInterval);
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
