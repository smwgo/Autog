/**
 * Procesador Universal de Audio para Taller y Propuestas (PC + Móvil Android/iOS).
 * - Convierte grabaciones WebM/MP4/OGG a WAV PCM 16-bit universal (100% compatible con Safari iOS, Android y PC).
 * - Normaliza automáticamente el volumen (Peak Gain + Soft Limiter) para que las voces bajas se escuchen fuertes y claras.
 * - Calcula la duración exacta real en segundos (evitando el bug de duración Infinity en WebM).
 */

export interface ProcessedAudioResult {
  blob: Blob;
  file: File;
  mimeType: string;
  extension: string;
  durationSeconds: number;
  normalized: boolean;
}

export function esDispositivoMovilAudio(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
  );
}

/**
 * Codifica muestras Float32 [-1, 1] en un archivo WAV RIFF PCM de 16 bits mono.
 */
export function codificarPcmAWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Normaliza la ganancia del audio eliminando offset DC y elevando voces bajas con limitador suave.
 */
function normalizarMuestrasVoz(samples: Float32Array): Float32Array {
  const len = samples.length;
  if (len === 0) return samples;

  // 1. Calcular y quitar DC offset
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += samples[i];
  }
  const mean = sum / len;

  let peak = 0;
  let sumSq = 0;
  const centered = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const v = samples[i] - mean;
    centered[i] = v;
    const abs = Math.abs(v);
    if (abs > peak) peak = abs;
    sumSq += v * v;
  }

  if (peak < 0.0005) return centered;

  const rms = Math.sqrt(sumSq / len);
  // Ganancia objetivo para que la voz suene clara y potente en altavoz de móvil y PC
  const targetPeak = 0.94;
  const gainByPeak = targetPeak / peak;
  const targetRms = 0.18;
  const gainByRms = rms > 0.001 ? targetRms / rms : gainByPeak;

  // Usar ganancia combinada (hasta 12x si se habló lejos del micrófono) con soft-clipping
  const gain = Math.min(12.0, Math.max(gainByPeak, Math.min(gainByRms, gainByPeak * 1.6)));

  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const amplified = centered[i] * gain;
    // Limitador suave cuando supera 0.85 para evitar distorsión digital
    if (Math.abs(amplified) > 0.85) {
      out[i] = Math.tanh(amplified) * 0.96;
    } else {
      out[i] = amplified;
    }
  }

  return out;
}

/**
 * Remuestrea un canal de audio a la frecuencia objetivo (por defecto 22050 Hz).
 */
function remuestrearCanal(input: Float32Array, srcRate: number, dstRate: number): Float32Array {
  if (!srcRate || srcRate === dstRate) return input;
  const ratio = srcRate / dstRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0;
    result[i] = s0 + frac * (s1 - s0);
  }
  return result;
}

/**
 * Procesa cualquier Blob de audio grabado en PC o Móvil:
 * 1. Lo decodifica en memoria.
 * 2. Mezcla a mono, remuestrea a 22.05 kHz y normaliza el volumen.
 * 3. Devuelve un archivo WAV universal compatible con iOS, Android, Windows y Mac.
 */
export async function procesarYNormalizarAudioBlob(
  inputBlob: Blob,
  nombreBase = `audio_${Date.now()}`,
  targetSampleRate = 22050
): Promise<ProcessedAudioResult> {
  const cleanBase = nombreBase.replace(/\.[^/.]+$/, "");

  if (typeof window === "undefined" || inputBlob.size < 120) {
    const fallbackMime = inputBlob.type || "audio/wav";
    const ext = fallbackMime.includes("mp4")
      ? "m4a"
      : fallbackMime.includes("ogg")
      ? "ogg"
      : fallbackMime.includes("webm")
      ? "webm"
      : "wav";
    const file = new File([inputBlob], `${cleanBase}.${ext}`, { type: fallbackMime });
    return {
      blob: inputBlob,
      file,
      mimeType: fallbackMime,
      extension: ext,
      durationSeconds: 1,
      normalized: false,
    };
  }

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) throw new Error("AudioContext no soportado");

    const arrayBuffer = await inputBlob.arrayBuffer();
    const audioCtx = new AudioCtx();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      await audioCtx.close().catch(() => {});
    }

    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const mono = new Float32Array(length);

    if (numChannels === 1) {
      mono.set(audioBuffer.getChannelData(0));
    } else {
      const ch0 = audioBuffer.getChannelData(0);
      const ch1 = audioBuffer.getChannelData(1);
      for (let i = 0; i < length; i++) {
        mono[i] = (ch0[i] + ch1[i]) * 0.5;
      }
    }

    const resampled = remuestrearCanal(mono, audioBuffer.sampleRate, targetSampleRate);
    const normalizedSamples = normalizarMuestrasVoz(resampled);
    const wavBlob = codificarPcmAWavBlob(normalizedSamples, targetSampleRate);
    const durationSeconds = Math.max(1, Math.round(audioBuffer.duration || resampled.length / targetSampleRate));
    const wavFile = new File([wavBlob], `${cleanBase}.wav`, {
      type: "audio/wav",
      lastModified: Date.now(),
    });

    return {
      blob: wavBlob,
      file: wavFile,
      mimeType: "audio/wav",
      extension: "wav",
      durationSeconds,
      normalized: true,
    };
  } catch (err) {
    console.warn("Conversión WAV omitida, usando blob original:", err);
    const fallbackMime = inputBlob.type || "audio/webm";
    const ext = fallbackMime.includes("wav")
      ? "wav"
      : fallbackMime.includes("mp4") || fallbackMime.includes("m4a")
      ? "m4a"
      : fallbackMime.includes("ogg")
      ? "ogg"
      : "webm";
    const file = new File([inputBlob], `${cleanBase}.${ext}`, {
      type: fallbackMime,
      lastModified: Date.now(),
    });
    return {
      blob: inputBlob,
      file,
      mimeType: fallbackMime,
      extension: ext,
      durationSeconds: 1,
      normalized: false,
    };
  }
}

/**
 * Asegura que las URLs internas de /api/storage/download se sirvan con streaming inline
 * para máxima compatibilidad en reproductores móviles (iOS Safari y Android Chrome).
 */
export function normalizarUrlAudioReproduccion(src: string): string {
  if (!src) return "";
  if (src.startsWith("/api/storage/download") && !src.includes("inline=")) {
    return `${src}${src.includes("?") ? "&" : "?"}inline=1`;
  }
  return src;
}
