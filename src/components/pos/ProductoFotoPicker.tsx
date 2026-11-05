"use client";

import { useEffect, useRef, useState } from "react";

interface ProductoFotoPickerProps {
  imageUrl: string;
  uploading: boolean;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
  error?: string | null;
  size?: "large" | "compact";
}

export function ProductoFotoPicker({
  imageUrl,
  uploading,
  onFileSelected,
  onRemove,
  error,
  size = "large",
}: ProductoFotoPickerProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isCompact = size === "compact";

  useEffect(() => {
    if (!cameraStream || !videoRef.current) return;

    videoRef.current.srcObject = cameraStream;
    void videoRef.current.play().catch(() => {
      setCameraError("No se pudo iniciar la vista de la cámara.");
    });

    return () => {
      cameraStream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  const detenerCamara = () => {
    setCameraStream(null);
  };

  const abrirCamara = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setCameraStream(stream);
    } catch (cameraStartError) {
      console.error("No se pudo acceder a la cámara:", cameraStartError);
      setCameraError("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
    }
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("La cámara todavía no está lista. Inténtalo de nuevo.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("No se pudo procesar la foto capturada.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("No se pudo procesar la foto capturada.");
        return;
      }

      onFileSelected(new File([blob], `producto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      detenerCamara();
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-start gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={abrirCamara}
            disabled={uploading}
            aria-label="Tomar foto del producto con la cámara"
            className={`relative ${
              isCompact ? "w-20 h-20 rounded-xl" : "w-28 h-28 sm:w-32 sm:h-32 rounded-2xl"
            } bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-all ${
              uploading ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-blue-500"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 gap-1.5 p-2 text-center">
                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-[10px] font-bold">Subiendo...</span>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="Previsualización de producto; toca para cambiar"
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400 p-2 text-center">
                <span className={isCompact ? "text-xl" : "text-3xl"}>📷</span>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tomar foto</span>
              </div>
            )}
          </button>

          {imageUrl && !uploading && (
            <button
              type="button"
              onClick={onRemove}
              title="Quitar foto"
              aria-label="Quitar foto"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onFileSelected(file);
          }}
          className="sr-only"
          aria-label="Subir imagen del producto"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onFileSelected(file);
          }}
          className="sr-only"
          aria-label="Tomar foto del producto"
        />
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={uploading}
          title="Subir imagen desde el móvil o la computadora"
          aria-label="Subir imagen desde el móvil o la computadora"
          className="mt-1 flex min-h-10 min-w-10 flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-[10px] font-semibold text-zinc-600 shadow-sm transition-colors hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
          </svg>
          <span>Subir</span>
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ {error}</p>}
      {cameraError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ {cameraError}</p>}

      {cameraStream && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tomar foto del producto"
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-[70vh] w-full bg-black object-contain"
            />
            <div className="flex justify-end gap-3 p-4">
              <button
                type="button"
                onClick={detenerCamara}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={capturarFoto}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Capturar foto
              </button>
            </div>
            {cameraError && <p role="alert" className="px-4 pb-4 text-sm text-rose-600">{cameraError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
