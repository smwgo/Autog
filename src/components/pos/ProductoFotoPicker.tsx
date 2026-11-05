"use client";

import { useRef, type ChangeEventHandler } from "react";

interface ProductoFotoPickerProps {
  imageUrl: string;
  uploading: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onRemove: () => void;
  error?: string | null;
  size?: "large" | "compact";
}

export function ProductoFotoPicker({
  imageUrl,
  uploading,
  onChange,
  onRemove,
  error,
  size = "large",
}: ProductoFotoPickerProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const isCompact = size === "compact";

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-start gap-3">
        <div className="relative">
          <label
            className={`relative ${
              isCompact ? "w-20 h-20 rounded-xl" : "w-28 h-28 sm:w-32 sm:h-32 rounded-2xl"
            } bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-all ${
              uploading ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-blue-500"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={onChange}
              className="sr-only"
              aria-label="Tomar o elegir foto del producto"
            />

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
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Agrega una foto</span>
              </div>
            )}
          </label>

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
          onChange={onChange}
          className="sr-only"
          aria-label="Subir imagen del producto"
        />
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={uploading}
          title="Subir imagen"
          aria-label="Subir imagen"
          className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:border-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
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
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ {error}</p>}
    </div>
  );
}
