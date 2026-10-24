"use client";

import React, { useState } from "react";
import type { InspectionFinding } from "@/app/taller/page";

export interface DetallePinModernoProps {
  pin: InspectionFinding;
  chipsTipos: { id: string; label: string; color: string }[];
  tipoSeleccionado: string;
  onToggleTipo: (tipoId: string) => void;
  onChangeTipo?: (nuevoTipo: string) => void;
  observacionTexto: string;
  onChangeObservacion: (text: string) => void;
  // Audio
  escuchandoVoz: boolean;
  onToggleVoz: () => void;
  reproduciendoAudio: boolean;
  onReproducirAudio: (text: string) => void;
  // Fotos (hasta 5)
  subiendoFotos: boolean;
  onSubirFotos: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEliminarFoto: (idx: number, e?: React.MouseEvent) => void;
  // Navegación multi-hallazgos en el mismo pin
  hallazgosDelMismoPin?: InspectionFinding[];
  onSeleccionarHallazgoPin?: (hallazgoId: string) => void;
  onEliminarHallazgoEspecifico?: (hallazgoId: string) => void;
  // Acciones
  onDuplicarPin: () => void;
  onEliminarPin: () => void;
  onReubicarPin?: () => void;
  onCerrar: () => void;
  // Props opcionales de compatibilidad
  serviciosCatalogo?: any[];
  productosCatalogo?: any[];
  onAgregarItemPin?: (item: any) => void;
  onEliminarItemPin?: (itemId: string) => void;
}

export function DetallePinModerno({
  pin,
  chipsTipos,
  tipoSeleccionado,
  onToggleTipo,
  onChangeTipo,
  observacionTexto,
  onChangeObservacion,
  escuchandoVoz,
  onToggleVoz,
  reproduciendoAudio,
  onReproducirAudio,
  subiendoFotos,
  onSubirFotos,
  onEliminarFoto,
  onDuplicarPin,
  onEliminarPin,
  onReubicarPin,
  onCerrar,
  hallazgosDelMismoPin = [],
  onSeleccionarHallazgoPin,
  onEliminarHallazgoEspecifico,
}: DetallePinModernoProps) {
  const fotos = pin.photoUrls || (pin.photoUrl ? [pin.photoUrl] : []);
  const maxFotosAlcanzado = fotos.length >= 5;

  const textoActual = observacionTexto;
  const textoParaAudio =
    textoActual.trim() ||
    `${pin.tipo || "Hallazgo"} en ${pin.zona || pin.vistaLabel || "vehículo"}.`;

  const mismoNumero = pin.pinNumber || 1;
  const listaMismoPin = hallazgosDelMismoPin.filter(
    (h) => (h.pinNumber || 1) === mismoNumero && h.vista === pin.vista
  );

  const [tipoTexto, setTipoTexto] = useState(pin.tipo || tipoSeleccionado || "");

  React.useEffect(() => {
    setTipoTexto(pin.tipo || tipoSeleccionado || "");
  }, [pin.id, pin.tipo, tipoSeleccionado]);

  const handleCambiarTipo = (val: string) => {
    setTipoTexto(val);
    if (onChangeTipo) {
      onChangeTipo(val);
    } else {
      onToggleTipo(val);
    }
  };

  return (
    <div className="mt-3 rounded-2xl bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/10 p-4 sm:p-5 shadow-xl space-y-4 animate-fade-in font-sans">
      {/* Título de la tarjeta y botón cerrar / acciones rápidas */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Registrar</span>
          <span className="w-5 h-5 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
            #{mismoNumero}
          </span>
        </h3>

        <div className="flex items-center gap-1.5 shrink-0">
          {onReubicarPin && (
            <button
              type="button"
              onClick={onReubicarPin}
              className="h-7 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title={`Mover Pin #${mismoNumero}`}
            >
              <span>📍</span>
              <span className="hidden sm:inline">Mover</span>
            </button>
          )}

          <button
            type="button"
            onClick={onEliminarPin}
            className="h-7 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title={`Eliminar Pin #${mismoNumero}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            <span className="hidden sm:inline">Borrar</span>
          </button>

          <button
            type="button"
            onClick={onCerrar}
            className="h-7 w-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs font-bold flex items-center justify-center transition-all cursor-pointer border border-zinc-200 dark:border-white/10"
            title="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Navegación si hay varios daños en el mismo pin */}
      {listaMismoPin.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-zinc-200 dark:border-white/10">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium shrink-0">Punto #{mismoNumero}:</span>
          {listaMismoPin.map((h, idx) => {
            const activo = h.id === pin.id;
            return (
              <div key={h.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => onSeleccionarHallazgoPin?.(h.id)}
                  className={`h-6 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    activo
                      ? "bg-blue-600 text-white shadow-sm font-bold"
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10"
                  }`}
                >
                  <span>#{idx + 1}</span>
                  <span className="opacity-90 font-normal truncate max-w-[90px]">
                    {h.tipo || "Daño"}
                  </span>
                </button>
                {onEliminarHallazgoEspecifico && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminarHallazgoEspecifico(h.id);
                    }}
                    className="ml-0.5 w-4 h-4 rounded-full hover:bg-rose-500/20 text-zinc-400 hover:text-rose-500 text-[9px] flex items-center justify-center transition-all cursor-pointer"
                    title="Quitar este daño"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 1. SECCIÓN ZONA SELECCIONADA */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 0h17.25m-17.25 0 2.25-6.75h12.75l2.25 6.75" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">Zona seleccionada</span>
          <span className="rounded-full bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/25 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
            {pin.zona || pin.vistaLabel || pin.vista}
          </span>
        </div>
        <span className="text-zinc-400 dark:text-zinc-500 text-xs font-bold">{">"}</span>
      </div>

      {/* 2. SECCIÓN DAÑO (ENTRADA MANUAL PURA) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Daño</label>
        <input
          type="text"
          value={tipoTexto}
          onChange={(e) => handleCambiarTipo(e.target.value)}
          placeholder="Ej. Rayón, Golpe, Desgaste..."
          className="w-full rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
        />
      </div>

      {/* 3. SECCIÓN DESCRIPCIÓN */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Descripción</label>
          {textoActual.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeObservacion("")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-rose-500/15 dark:bg-white/[0.04] dark:hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
        <input
          type="text"
          value={textoActual}
          onChange={(e) => onChangeObservacion(e.target.value)}
          placeholder="Reparar rayón..."
          className="w-full rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-zinc-900 dark:text-white text-xs sm:text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
        />
      </div>

      {/* 4. BOTONERA DE MULTIMEDIA Y CAROUSEL DE EVIDENCIAS (FOTOS Y VIDEOS) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {/* Botón Tomar foto con la cámara (Móvil y Escritorio) */}
        <label
          title="Tomar foto con la cámara"
          className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden ${
            maxFotosAlcanzado || subiendoFotos
              ? "bg-zinc-100 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              : "bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 active:scale-95 shadow-sm"
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={maxFotosAlcanzado || subiendoFotos}
            onChange={onSubirFotos}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </label>

        {/* Botón Seleccionar foto de galería */}
        <label
          title="Seleccionar foto de galería"
          className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden ${
            maxFotosAlcanzado || subiendoFotos
              ? "bg-zinc-100 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              : "bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 active:scale-95 shadow-sm"
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={maxFotosAlcanzado || subiendoFotos}
            onChange={onSubirFotos}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </label>

        {/* Botón Grabar / Subir Video */}
        <label
          title="Grabar o subir video de evidencia"
          className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden ${
            maxFotosAlcanzado || subiendoFotos
              ? "bg-zinc-100 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              : "bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 active:scale-95 shadow-sm"
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <input
            type="file"
            accept="video/*"
            capture="environment"
            disabled={maxFotosAlcanzado || subiendoFotos}
            onChange={onSubirFotos}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </label>

        {/* Miniaturas de fotos o videos cargados con botón de quitar (x) */}
        {fotos.map((url, idx) => {
          const esVideo =
            /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url) ||
            url.includes("taller_video") ||
            url.toLowerCase().includes("video");

          return (
            <div
              key={idx}
              className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 shrink-0 bg-black/10 dark:bg-black shadow-sm group"
            >
              {esVideo ? (
                <div className="w-full h-full relative flex items-center justify-center bg-zinc-900">
                  <video
                    src={url}
                    className="w-full h-full object-cover opacity-80"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                    <span className="w-6 h-6 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center text-[10px] font-bold shadow pl-0.5">
                      ▶
                    </span>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0"
                    title="Reproducir video de evidencia"
                  />
                </div>
              ) : (
                <>
                  <img src={url} alt={`Evidencia #${idx + 1}`} className="w-full h-full object-cover" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    title="Ampliar foto"
                  >
                    <span className="text-[10px] text-white">🔍</span>
                  </a>
                </>
              )}

              <button
                type="button"
                onClick={(e) => onEliminarFoto(idx, e)}
                className="absolute top-0.5 right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/75 hover:bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center cursor-pointer shadow border border-white/20 z-20"
                title="Eliminar evidencia"
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* Botón + Agregar evidencia (foto o video) */}
        {!maxFotosAlcanzado && (
          <label
            title="Agregar foto o video"
            className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-100/60 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 group shadow-xs overflow-hidden"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              disabled={subiendoFotos}
              onChange={onSubirFotos}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </label>
        )}
      </div>

      {/* Botonera de audio: Dictar por voz y Escuchar TTS */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleVoz}
            className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              escuchandoVoz
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 animate-pulse"
                : "bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10"
            }`}
          >
            <span>🎙️</span>
            <span>{escuchandoVoz ? "Dictando..." : "Dictar voz"}</span>
          </button>

          <button
            type="button"
            onClick={() => onReproducirAudio(textoParaAudio)}
            className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              reproduciendoAudio
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse"
                : "bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10"
            }`}
          >
            <span>🔊</span>
            <span>{reproduciendoAudio ? "Sonando..." : "Escuchar audio"}</span>
          </button>
        </div>

        {subiendoFotos && (
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
            Subiendo a R2...
          </span>
        )}
      </div>
    </div>
  );
}
