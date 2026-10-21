/**
 * Servicio desacoplado de transcripción para notas de voz en recepción de vehículos.
 * Soporta proveedores externos autorizados (Whisper, etc.) y fallback transparente a Web Speech API del navegador.
 */

export type TranscriptionStatus =
  | "pendiente"
  | "lista"
  | "no_disponible"
  | "error"
  | "corregida"
  | "manual";

export interface VoiceNoteRecord {
  id: string;
  orderId?: string;
  vehicleId?: string;
  plate?: string;
  audioUrl: string; // URL en Cloudflare R2
  storageKey?: string;
  durationSeconds: number;
  mimeType: string;
  fileSize?: number;
  text: string; // Texto transcrito o redactado
  transcriptionStatus: TranscriptionStatus;
  provider: "browser-speech-api" | "external-transcriber" | "manual";
  author: string; // Operador o técnico que registró la nota
  authorId?: string;
  createdAt: string; // ISO timestamp
}

export interface TranscriptionService {
  isSupported(): boolean;
  getProviderName(): string;
  startLiveRecognition?(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ): { stop: () => void };
  transcribeAudioBlob?(blob: Blob): Promise<{ text: string; status: TranscriptionStatus }>;
}

/**
 * Proveedor basado en Web Speech API del navegador (100% nativo, seguro y sin costos de APIs externas)
 */
export class BrowserSpeechRecognitionProvider implements TranscriptionService {
  private recognition: any = null;

  isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  getProviderName(): string {
    return "browser-speech-api";
  }

  startLiveRecognition(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ): { stop: () => void } {
    if (!this.isSupported()) {
      onError("El reconocimiento de voz automático no es compatible con este navegador.");
      return { stop: () => {} };
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.lang = "es-EC";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalStr += item[0].transcript + " ";
          } else {
            interimStr += item[0].transcript;
          }
        }
        const fullText = (finalStr + interimStr).trim();
        const hasFinal = Boolean(finalStr.trim());
        if (fullText) {
          onResult(fullText, hasFinal);
        }
      };

      rec.onerror = (event: any) => {
        // Ignorar "no-speech" normal si el usuario aún no habla
        if (event.error !== "no-speech") {
          onError(event.error || "Error en el reconocimiento de voz");
        }
      };

      rec.start();
      this.recognition = rec;

      return {
        stop: () => {
          try {
            rec.stop();
          } catch {}
          this.recognition = null;
        },
      };
    } catch (err: any) {
      onError(err?.message || "Fallo al iniciar el motor de dictado.");
      return { stop: () => {} };
    }
  }
}

/**
 * Obtener proveedor de transcripción configurado
 */
export function getTranscriptionService(): TranscriptionService {
  return new BrowserSpeechRecognitionProvider();
}

/**
 * Selecciona el mejor formato de audio soportado nativamente por el navegador
 */
export function getBestSupportedAudioMimeType(): string {
  if (typeof window === "undefined" || !window.MediaRecorder) {
    return "audio/webm";
  }

  const preferredTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/wav",
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "audio/webm";
}
