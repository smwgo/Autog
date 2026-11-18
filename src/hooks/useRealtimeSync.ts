"use client";

import { useEffect, useRef } from "react";
import type {
  RealtimeAction,
  RealtimeChannel,
  RealtimeEvent,
} from "@/lib/realtime";

const BROADCAST_CHANNEL_NAME = "autog_realtime";

let cachedTabClientId: string | null = null;

function getTabClientId(): string {
  if (typeof window === "undefined") return "server";
  if (!cachedTabClientId) {
    cachedTabClientId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return cachedTabClientId;
}

/**
 * Notifica de inmediato a otras pestañas del mismo navegador vía BroadcastChannel
 * tras completar una mutación local exitosa.
 */
export function notifyLocalMutation(
  channel: Exclude<RealtimeChannel, "all">,
  action: RealtimeAction,
  entityId?: string
): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }
  try {
    const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    const payload: RealtimeEvent = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      channel,
      action,
      entityId,
      sourceClientId: getTabClientId(),
      timestamp: Date.now(),
      version: 0,
    };
    bc.postMessage(payload);
    bc.close();
  } catch {
    // Ignorar si BroadcastChannel no está disponible
  }
}

export interface UseRealtimeSyncOptions {
  channels: RealtimeChannel[];
  onRefresh: () => unknown;
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Suscribe una vista a cambios en tiempo real vía SSE + BroadcastChannel + verificación por foco.
 * Agrupa ráfagas de eventos con debounce para evitar recargas redundantes.
 */
export function useRealtimeSync({
  channels,
  onRefresh,
  onEvent,
  enabled = true,
  debounceMs = 200,
}: UseRealtimeSyncOptions): void {
  const onRefreshRef = useRef(onRefresh);
  const onEventRef = useRef(onEvent);
  onRefreshRef.current = onRefresh;
  onEventRef.current = onEvent;

  const channelsKey = channels.slice().sort().join(",");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const channelList = channelsKey
      .split(",")
      .filter(Boolean) as RealtimeChannel[];
    const channelSet = new Set<RealtimeChannel>(channelList);
    const clientId = getTabClientId();

    let disposed = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let eventSource: EventSource | null = null;
    let knownVersions: Record<string, number> | null = null;
    let knownFingerprints: Record<string, string> | null = null;
    let lastEventSignature = "";
    let lastEventAt = 0;
    let isCheckingVersions = false;
    let sseErrorCount = 0;

    const matchesChannel = (ch: RealtimeChannel) =>
      channelSet.has("all") || channelSet.has(ch);

    const scheduleRefresh = () => {
      if (disposed) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!disposed) {
          void onRefreshRef.current();
        }
      }, debounceMs);
    };

    const handleIncomingEvent = (ev: RealtimeEvent) => {
      if (disposed || !matchesChannel(ev.channel)) return;
      if (ev.sourceClientId && ev.sourceClientId === clientId) return;

      // Evitar procesar duplicado exacto si llega por BroadcastChannel y SSE casi a la vez
      const sig = `${ev.channel}:${ev.action}:${ev.entityId ?? ""}`;
      const now = Date.now();
      if (sig === lastEventSignature && now - lastEventAt < 400) {
        return;
      }
      lastEventSignature = sig;
      lastEventAt = now;

      if (ev.version > 0 && knownVersions) {
        knownVersions[ev.channel] = Math.max(
          knownVersions[ev.channel] ?? 0,
          ev.version
        );
      }

      onEventRef.current?.(ev);
      scheduleRefresh();
    };

    const checkVersionsChanged = (
      nextVersions?: Record<string, number>,
      nextFingerprints?: Record<string, string>
    ) => {
      let changed = false;

      if (nextVersions) {
        if (!knownVersions) {
          knownVersions = { ...nextVersions };
        } else {
          for (const ch of channelList) {
            const prev = knownVersions[ch] ?? 0;
            const curr = nextVersions[ch] ?? 0;
            if (curr > prev) {
              changed = true;
            }
          }
          if (channelSet.has("all") && (nextVersions.all ?? 0) > (knownVersions.all ?? 0)) {
            changed = true;
          }
          knownVersions = { ...nextVersions };
        }
      }

      if (nextFingerprints && Object.keys(nextFingerprints).length > 0) {
        if (!knownFingerprints) {
          knownFingerprints = { ...nextFingerprints };
        } else {
          for (const ch of channelList) {
            const prevFp = knownFingerprints[ch];
            const currFp = nextFingerprints[ch];
            if (prevFp !== undefined && currFp !== undefined && currFp !== prevFp) {
              changed = true;
            }
          }
          if (
            channelSet.has("all") &&
            knownFingerprints.all !== undefined &&
            nextFingerprints.all !== undefined &&
            nextFingerprints.all !== knownFingerprints.all
          ) {
            changed = true;
          }
          knownFingerprints = { ...knownFingerprints, ...nextFingerprints };
        }
      }

      return changed;
    };

    const connectSSE = () => {
      if (disposed) return;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      const query = encodeURIComponent(channelsKey || "all");
      const es = new EventSource(`/api/realtime/events?channels=${query}`);
      eventSource = es;

      es.addEventListener("ready", (rawEvent) => {
        sseErrorCount = 0;
        try {
          const parsed = JSON.parse((rawEvent as MessageEvent).data) as {
            versions?: Record<string, number>;
            fingerprints?: Record<string, string>;
          };
          if (checkVersionsChanged(parsed.versions, parsed.fingerprints)) {
            scheduleRefresh();
          }
        } catch {
          // Ignorar payload inválido
        }
      });

      es.addEventListener("change", (rawEvent) => {
        sseErrorCount = 0;
        try {
          const parsed = JSON.parse((rawEvent as MessageEvent).data) as RealtimeEvent;
          handleIncomingEvent(parsed);
        } catch {
          // Ignorar payload inválido
        }
      });

      es.onerror = () => {
        if (disposed) return;
        sseErrorCount += 1;
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          if (reconnectTimer) clearTimeout(reconnectTimer);
          const delay = sseErrorCount >= 3 ? 15000 : sseErrorCount === 2 ? 8000 : 3000;
          reconnectTimer = setTimeout(connectSSE, delay);
        }
      };
    };

    connectSSE();

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (msg: MessageEvent<RealtimeEvent>) => {
          if (msg.data) {
            handleIncomingEvent(msg.data);
          }
        };
      } catch {
        bc = null;
      }
    }

    const verifyOnFocusOrVisible = async () => {
      if (disposed || isCheckingVersions || document.visibilityState === "hidden") return;
      isCheckingVersions = true;
      try {
        const res = await fetch("/api/realtime/events?versions=1", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          versions?: Record<string, number>;
          fingerprints?: Record<string, string>;
        };
        if (checkVersionsChanged(data.versions, data.fingerprints)) {
          scheduleRefresh();
        }
      } catch {
        // Ignorar errores de red transitorios al enfocar
      } finally {
        isCheckingVersions = false;
      }
    };

    // Solo hacer polling de respaldo si el SSE no está abierto (p.ej. proxy/serverless que cierre streams)
    pollTimer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (eventSource && eventSource.readyState === EventSource.OPEN) return;
      void verifyOnFocusOrVisible();
    }, 20000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void verifyOnFocusOrVisible();
      }
    };
    const handleFocus = () => {
      void verifyOnFocusOrVisible();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      disposed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (eventSource) eventSource.close();
      if (bc) bc.close();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [channelsKey, enabled, debounceMs]);
}
