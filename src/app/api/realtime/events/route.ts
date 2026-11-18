import type { NextRequest } from "next/server";
import {
  getRealtimeVersions,
  getSharedRealtimeVersions,
  subscribeRealtime,
  type RealtimeChannel,
  type RealtimeEvent,
} from "@/lib/realtime";
import { getRealtimeFingerprintsFromDb } from "@/lib/realtime-db";

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

const SNAPSHOT_TTL_MS = 4000;
let cachedSnapshot: {
  versions: Record<RealtimeChannel, number>;
  fingerprints: Partial<Record<RealtimeChannel, string>>;
  fetchedAt: number;
} | null = null;
let snapshotInFlight: Promise<{
  versions: Record<RealtimeChannel, number>;
  fingerprints: Partial<Record<RealtimeChannel, string>>;
}> | null = null;

async function getCachedRealtimeSnapshot() {
  const now = Date.now();
  if (cachedSnapshot && now - cachedSnapshot.fetchedAt < SNAPSHOT_TTL_MS) {
    return {
      versions: cachedSnapshot.versions,
      fingerprints: cachedSnapshot.fingerprints,
    };
  }
  if (!snapshotInFlight) {
    snapshotInFlight = Promise.all([
      getSharedRealtimeVersions(),
      getRealtimeFingerprintsFromDb(),
    ])
      .then(([versions, fingerprints]) => {
        cachedSnapshot = { versions, fingerprints, fetchedAt: Date.now() };
        return { versions, fingerprints };
      })
      .finally(() => {
        snapshotInFlight = null;
      });
  }
  return snapshotInFlight;
}

/**
 * Endpoint SSE para sincronización en tiempo real entre sesiones, pestañas y dispositivos.
 * También responde ?versions=1 en JSON para verificación rápida al recuperar foco.
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("versions") === "1") {
    const { versions, fingerprints } = await getCachedRealtimeSnapshot();
    return Response.json(
      { versions, fingerprints },
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
      let lastKnownFingerprints: Partial<Record<RealtimeChannel, string>> = {};

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

      void getCachedRealtimeSnapshot().then(({ versions: sharedVersions, fingerprints: sharedFingerprints }) => {
        if (closed) return;
        lastKnownVersions = sharedVersions;
        lastKnownFingerprints = sharedFingerprints;
        sendEvent("ready", {
          versions: sharedVersions,
          fingerprints: sharedFingerprints,
          timestamp: Date.now(),
        });
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
        void getCachedRealtimeSnapshot().then(({ versions: sharedVersions, fingerprints: sharedFingerprints }) => {
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
            const prevFp = lastKnownFingerprints[ch];
            const currFp = sharedFingerprints[ch];
            const fpChanged =
              prevFp !== undefined && currFp !== undefined && currFp !== prevFp;
            if (curr > prev || fpChanged) {
              lastKnownVersions[ch] = Math.max(prev, curr);
              if (currFp !== undefined) lastKnownFingerprints[ch] = currFp;
              const syntheticEvent: RealtimeEvent = {
                id: `db-${ch}-${curr}-${Date.now()}`,
                channel: ch,
                action: "updated",
                timestamp: Date.now(),
                version: Math.max(prev, curr),
              };
              sendEvent("change", syntheticEvent, syntheticEvent.id);
            } else if (prevFp === undefined && currFp !== undefined) {
              lastKnownFingerprints[ch] = currFp;
            }
          }
          lastKnownVersions.all = Math.max(
            lastKnownVersions.all ?? 0,
            sharedVersions.all ?? 0
          );
          if (sharedFingerprints.all !== undefined) {
            lastKnownFingerprints.all = sharedFingerprints.all;
          }
        });
      }, 6000);

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
