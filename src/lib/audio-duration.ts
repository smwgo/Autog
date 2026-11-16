const durationCache = new Map<string, number>();

export function getCachedAudioDuration(src: string): number {
  return durationCache.get(src) || 0;
}

export function setCachedAudioDuration(src: string, seconds: number): void {
  if (!src || !Number.isFinite(seconds) || seconds <= 0) return;
  durationCache.set(src, seconds);
}

/**
 * Resolves the real duration (in seconds) of an audio URL, including WebM/MediaRecorder
 * blobs where HTMLAudioElement reports `Infinity` on `loadedmetadata`.
 */
export async function resolveAudioDuration(src: string): Promise<number> {
  if (!src || typeof window === "undefined") return 0;
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
      const res = await fetch(src);
      if (!res.ok) return 0;
      arrayBuffer = await res.arrayBuffer();
    }

    const ctx = new AudioCtx();
    try {
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const dur = decoded?.duration;
      if (Number.isFinite(dur) && dur > 0) {
        durationCache.set(src, dur);
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
