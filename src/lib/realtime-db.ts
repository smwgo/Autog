import "server-only";
import prisma from "@/lib/prisma";

const CHANNELS = [
  "taller",
  "presupuestos",
  "clientes",
  "vehiculos",
  "ordenes",
  "all",
] as const;

export type RealtimeChannelKey = (typeof CHANNELS)[number];

let tableEnsured = false;
let ensurePromise: Promise<void> | null = null;

async function ensureRealtimeVersionsTable(): Promise<void> {
  if (tableEnsured) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS autog_realtime_versions (
            channel TEXT PRIMARY KEY,
            version BIGINT NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        tableEnsured = true;
      } catch {
        // Ignorar si la BD no está disponible o está en modo mirror local
      } finally {
        ensurePromise = null;
      }
    })();
  }
  await ensurePromise;
}

/**
 * Incrementa la versión compartida en PostgreSQL para el canal afectado y "all",
 * permitiendo que otras máquinas o instancias serverless detecten cambios.
 */
export async function bumpRealtimeVersionInDb(
  channel: Exclude<RealtimeChannelKey, "all">
): Promise<void> {
  try {
    await ensureRealtimeVersionsTable();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO autog_realtime_versions (channel, version, updated_at)
      VALUES ($1, 1, NOW()), ('all', 1, NOW())
      ON CONFLICT (channel)
      DO UPDATE SET
        version = autog_realtime_versions.version + 1,
        updated_at = NOW()
      `,
      channel
    );
  } catch {
    // Fallback silencioso a memoria local si falla Neon
  }
}

/**
 * Obtiene las versiones compartidas desde PostgreSQL combinadas con las de memoria.
 */
export async function getRealtimeVersionsFromDb(
  memoryVersions: Record<RealtimeChannelKey, number>
): Promise<Record<RealtimeChannelKey, number>> {
  const merged: Record<RealtimeChannelKey, number> = { ...memoryVersions };
  try {
    await ensureRealtimeVersionsTable();
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT channel, version::text AS version FROM autog_realtime_versions`
    )) as Array<{ channel: string; version: string }>;

    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row && row.channel in merged) {
          const ch = row.channel as RealtimeChannelKey;
          const dbVer = Number(row.version) || 0;
          merged[ch] = Math.max(merged[ch] ?? 0, dbVer);
        }
      }
    }
  } catch {
    // Si falla la consulta, devolver las versiones en memoria
  }
  return merged;
}
