export type RealtimeChannel =
  | "taller"
  | "presupuestos"
  | "clientes"
  | "vehiculos"
  | "ordenes"
  | "all";

export type RealtimeAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed";

export interface RealtimeEvent {
  id: string;
  channel: RealtimeChannel;
  action: RealtimeAction;
  entityId?: string;
  sourceClientId?: string;
  timestamp: number;
  version: number;
}

type RealtimeListener = (event: RealtimeEvent) => void;

interface RealtimeStore {
  listeners: Set<RealtimeListener>;
  versions: Record<RealtimeChannel, number>;
  seq: number;
}

const globalForRealtime = globalThis as typeof globalThis & {
  __autogRealtimeStore?: RealtimeStore;
};

function getStore(): RealtimeStore {
  if (!globalForRealtime.__autogRealtimeStore) {
    globalForRealtime.__autogRealtimeStore = {
      listeners: new Set<RealtimeListener>(),
      versions: {
        taller: 0,
        presupuestos: 0,
        clientes: 0,
        vehiculos: 0,
        ordenes: 0,
        all: 0,
      },
      seq: 0,
    };
  }
  return globalForRealtime.__autogRealtimeStore;
}

/**
 * Emite un evento en tiempo real a todas las sesiones SSE conectadas
 * e incrementa la versión del canal afectado y del canal global "all".
 */
export function emitRealtimeEvent(input: {
  channel: Exclude<RealtimeChannel, "all">;
  action: RealtimeAction;
  entityId?: string;
  sourceClientId?: string;
}): RealtimeEvent {
  const store = getStore();
  store.seq += 1;
  store.versions[input.channel] = (store.versions[input.channel] ?? 0) + 1;
  store.versions.all = (store.versions.all ?? 0) + 1;

  const event: RealtimeEvent = {
    id: `${Date.now()}-${store.seq}`,
    channel: input.channel,
    action: input.action,
    entityId: input.entityId,
    sourceClientId: input.sourceClientId,
    timestamp: Date.now(),
    version: store.versions[input.channel],
  };

  for (const listener of store.listeners) {
    try {
      listener(event);
    } catch {
      // Ignorar errores de listeners individuales desconectados
    }
  }

  return event;
}

/**
 * Suscribe un listener al bus de eventos en memoria y devuelve la función de limpieza.
 */
export function subscribeRealtime(listener: RealtimeListener): () => void {
  const store = getStore();
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

/**
 * Retorna las versiones actuales por canal para detección rápida de cambios tras reconexión.
 */
export function getRealtimeVersions(): Record<RealtimeChannel, number> {
  return { ...getStore().versions };
}
