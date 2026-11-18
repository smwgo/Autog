import "server-only";

const ensuredKeys = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

/**
 * Ejecuta DDL de inicialización una sola vez por proceso (y se omite en producción
 * salvo que RUN_RUNTIME_DDL="true"), evitando bloqueos y round-trips en cada petición.
 */
export async function ensureSchemaOnce(
  key: string,
  runner: () => Promise<void>
): Promise<void> {
  if (ensuredKeys.has(key)) return;
  if (process.env.NODE_ENV === "production" && process.env.RUN_RUNTIME_DDL !== "true") {
    ensuredKeys.add(key);
    return;
  }

  let pending = inFlight.get(key);
  if (!pending) {
    pending = runner()
      .then(() => {
        ensuredKeys.add(key);
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, pending);
  }

  await pending;
}
