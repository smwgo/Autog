const STORAGE_KEY = "autog_audio_durations_v1";
const durationCache = new Map<string, number>();
let storageLoaded = false;

function loadStorageCache() {
  if (storageLoaded || typeof window === "undefined") return;
  storageLoaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [k, v] of Object.entries(parsed)) {
        const num = Number(v);
        if (k && Number.isFinite(num) && num > 0) {
          durationCache.set(k, num);
        }
      }
    }
  } catch {
    // Ignorar errores de localStorage
  }
}

function persistStorageCache() {
  if (typeof window === "undefined") return;
  try {
    const entries = Array.from(durationCache.entries()).slice(-200);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignorar errores de cuota de localStorage
  }
}

export function getCachedAudioDuration(src: string): number {
  if (!src) return 0;
  loadStorageCache();
  return durationCache.get(src) || 0;
}

export function setCachedAudioDuration(src: string, seconds: number): void {
  if (!src || !Number.isFinite(seconds) || seconds <= 0) return;
  loadStorageCache();
  durationCache.set(src, seconds);
  persistStorageCache();
}

function buildInlineAudioUrl(src: string): string {
  try {
    if (src.startsWith("data:") || src.startsWith("blob:")) return src;
    const u = new URL(src, window.location.origin);
    if (u.pathname === "/api/storage/download" && u.searchParams.has("key")) {
      u.searchParams.set("inline", "1");
      return u.toString();
    }
  } catch {
    // Usar src original
  }
  return src;
}

/**
 * Resolves the real duration (in seconds) of an audio URL, including WebM/MediaRecorder
 * blobs where HTMLAudioElement reports `Infinity` on `loadedmetadata`.
 */
export async function resolveAudioDuration(src: string): Promise<number> {
  if (!src || typeof window === "undefined") return 0;
  loadStorageCache();
  const cached = durationCache.get(src);
  if (cached && cached > 0) return cached;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return 0;

    let arrayBuffer: ArrayBuffer;
    if (src.startsWith("data:")) {
      const commaIdx = src.indexOf(",");
      const bin = atob(commaIdx >= 0 ? src.slice(commaIdx + 1) : src);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      const fetchUrl = buildInlineAudioUrl(src);
      const res = await fetch(fetchUrl);
      if (!res.ok) return 0;
      arrayBuffer = await res.arrayBuffer();
    }

    const ctx = new AudioCtx();
    try {
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const dur = decoded?.duration;
      if (Number.isFinite(dur) && dur > 0) {
        setCachedAudioDuration(src, dur);
        return dur;
      }
    } finally {
      await ctx.close().catch(() => {});
    }
  } catch {
    // Ignorar errores de decodificación si el formato no es soportado
  }

  return 0;
}
