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
  onToggleVoz: (textoActual?: string, modo?: "dictado" | "audio") => void;
  transcribiendoVoz?: boolean;
  reproduciendoAudio: boolean;
  onReproducirAudio?: (text: string) => void;
  onEliminarAudio?: (idx?: number) => void;
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
  onChangeZona?: (nuevaZona: string) => void;
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
  transcribiendoVoz = false,
  onToggleVoz,
  reproduciendoAudio,
  onReproducirAudio,
  onEliminarAudio,
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
  onChangeZona,
}: DetallePinModernoProps) {
  const fotos = pin.photoUrls || (pin.photoUrl ? [pin.photoUrl] : []);
  const maxFotosAlcanzado = fotos.length >= 5;

  const textoActual = observacionTexto !== "" ? observacionTexto : (pin.descripcion || "");
  const inputDescripcionRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (escuchandoVoz && inputDescripcionRef.current) {
      inputDescripcionRef.current.scrollLeft = inputDescripcionRef.current.scrollWidth;
    }
  }, [textoActual, escuchandoVoz]);

  const mismoNumero = pin.pinNumber || 1;
  const listaMismoPin = hallazgosDelMismoPin.filter(
    (h) => (h.pinNumber || 1) === mismoNumero && h.vista === pin.vista
  );

  const [tipoTexto, setTipoTexto] = useState(pin.tipo || tipoSeleccionado || "");
  const [editandoZona, setEditandoZona] = useState(false);
  const [zonaTexto, setZonaTexto] = useState(pin.zona || pin.vistaLabel || pin.vista || "");

  // Modales para ver fotos ampliadas y reproducir videos en ventana propia
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [fotoModalUrl, setFotoModalUrl] = useState<string | null>(null);
  const [audioClipReproduciendoUrl, setAudioClipReproduciendoUrl] = useState<string | null>(null);
  const [filtroGaleria, setFiltroGaleria] = useState<"todas" | "fotos" | "videos" | "audios">("todas");
  const audioClipPlayerRef = React.useRef<HTMLAudioElement | null>(null);

  // Clasificación y separación de evidencias: Fotos, Videos y Audios
  const esVideoUrl = (url: string) =>
    /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url) ||
    url.includes("taller_video") ||
    url.toLowerCase().includes("video");

  const soloFotosConIdx = fotos
    .map((url, originalIdx) => ({ url, originalIdx }))
    .filter((item) => !esVideoUrl(item.url));

  const soloVideosConIdx = fotos
    .map((url, originalIdx) => ({ url, originalIdx }))
    .filter((item) => esVideoUrl(item.url));

  const soloAudios =
    pin.audioUrls && pin.audioUrls.length > 0
      ? pin.audioUrls
      : pin.audioUrl
      ? [pin.audioUrl]
      : [];

  const totalEvidencias = soloFotosConIdx.length + soloVideosConIdx.length + soloAudios.length;

  React.useEffect(() => {
    return () => {
      if (audioClipPlayerRef.current) {
        audioClipPlayerRef.current.pause();
        audioClipPlayerRef.current = null;
      }
    };
  }, []);

  const handleTogglePlayAudioClip = (url: string) => {
    if (audioClipPlayerRef.current) {
      if (audioClipReproduciendoUrl === url && !audioClipPlayerRef.current.paused) {
        audioClipPlayerRef.current.pause();
        setAudioClipReproduciendoUrl(null);
        return;
      }
      audioClipPlayerRef.current.pause();
      audioClipPlayerRef.current = null;
    }
    const audio = new Audio(url);
    audioClipPlayerRef.current = audio;
    audio.onended = () => setAudioClipReproduciendoUrl(null);
    audio.onerror = () => setAudioClipReproduciendoUrl(null);
    audio
      .play()
      .then(() => setAudioClipReproduciendoUrl(url))
      .catch(() => setAudioClipReproduciendoUrl(null));
  };

  React.useEffect(() => {
    setTipoTexto(pin.tipo || tipoSeleccionado || "");
    setZonaTexto(pin.zona || pin.vistaLabel || pin.vista || "");
  }, [pin.id, pin.tipo, pin.zona, pin.vistaLabel, pin.vista, tipoSeleccionado]);

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
          <span suppressHydrationWarning translate="no" className="w-5 h-5 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
            {`#${mismoNumero}`}
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

      {/* 1. SECCIÓN ZONA / SUBCATEGORÍA (EDITABLE MANUALMENTE) */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 0h17.25m-17.25 0 2.25-6.75h12.75l2.25 6.75" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
            Zona / Subcategoría
          </span>
          {editandoZona ? (
            <input
              type="text"
              autoFocus
              value={zonaTexto}
              onChange={(e) => {
                const val = e.target.value;
                setZonaTexto(val);
                onChangeZona?.(val);
              }}
              onBlur={() => setEditandoZona(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditandoZona(false);
              }}
              placeholder="Zona manual..."
              className="flex-1 min-w-0 rounded-lg bg-white dark:bg-black/40 border border-blue-400 px-2 py-0.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditandoZona(true)}
              title="Toca para editar la zona / subcategoría manualmente"
              className="rounded-full bg-blue-500/10 dark:bg-blue-400/10 hover:bg-blue-500/20 border border-blue-500/25 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 truncate flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="truncate">{zonaTexto || pin.zona || pin.vistaLabel || pin.vista}</span>
              <span className="text-[10px] opacity-70">✏️</span>
            </button>
          )}
        </div>
        {!editandoZona && (
          <button
            type="button"
            onClick={() => setEditandoZona(true)}
            className="text-xs text-blue-500 dark:text-blue-400 font-bold hover:underline shrink-0"
          >
            Editar
          </button>
        )}
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

      {/* 3. SECCIÓN DESCRIPCIÓN CON DICTADO POR VOZ A TEXTO */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <span>Descripción</span>
            {escuchandoVoz && (
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Grabando voz a texto...
              </span>
            )}
          </label>
          {textoActual.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeObservacion("")}
              className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-rose-500/15 dark:bg-white/[0.04] dark:hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Limpiar texto"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Input con botón de Dictado por Voz integrado en la derecha (PC y Móvil) */}
        <div className="relative flex items-center">
          <input
            type="text"
            ref={inputDescripcionRef}
            value={textoActual}
            onChange={(e) => onChangeObservacion(e.target.value)}
            placeholder={
              escuchandoVoz
                ? "🎙️ Habla ahora... escuchando en tiempo real"
                : "Reparar rayón o toca Dictar voz..."
            }
            className={`w-full rounded-xl bg-zinc-50 dark:bg-white/[0.03] border pl-3.5 pr-28 sm:pr-32 py-2.5 sm:py-3 text-zinc-900 dark:text-white text-xs sm:text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
              escuchandoVoz
                ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 dark:bg-rose-500/10 placeholder:text-rose-600 dark:placeholder:text-rose-400 font-medium"
                : "border-zinc-200 dark:border-white/10 focus:border-blue-500/50"
            }`}
          />
          <button
            type="button"
            onClick={() => onToggleVoz(textoActual)}
            className={`absolute right-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs touch-manipulation select-none ${
              escuchandoVoz
                ? "bg-rose-600 text-white border-rose-600 animate-pulse shadow-rose-600/30 font-bold"
                : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
            }`}
            title={escuchandoVoz ? "Detener dictado" : "Dictar voz (convierte a texto y sigue acumulando)"}
          >
            {escuchandoVoz ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span className="text-[11px] font-bold">Detener</span>
              </>
            ) : (
              <>
                <span className="text-sm">🎙️</span>
                <span className="text-[11px] font-bold">Dictar voz</span>
              </>
            )}
          </button>
        </div>

        {escuchandoVoz && (
          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium px-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>Convirtiendo voz a texto en tiempo real. Toca &quot;Detener&quot; al terminar.</span>
          </p>
        )}
      </div>

      {/* 4. BOTONERA DE CAPTURA (ARRIBA) Y GALERÍA DE EVIDENCIAS (ABAJO) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs px-0.5">
          <span className="font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <span>Agregar Evidencia:</span>
            <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
              (Fotos, videos y audio)
            </span>
          </span>
          {subiendoFotos && (
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              Guardando en la nube...
            </span>
          )}
        </div>

        {/* Fila superior de botones de captura */}
        <div className="flex items-center gap-2">
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

          {/* Botón Grabar Nota de Audio / Dictado */}
          <button
            type="button"
            onClick={() => onToggleVoz(textoActual)}
            title={escuchandoVoz ? "Detener grabación de audio" : "Grabar nota de audio"}
            className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden active:scale-95 shadow-sm touch-manipulation select-none ${
              escuchandoVoz
                ? "bg-rose-500 text-white border-rose-600 animate-pulse ring-2 ring-rose-400/50"
                : "bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
            }`}
          >
            {escuchandoVoz ? (
              <div className="flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping mb-0.5" />
                <span className="text-[9px] font-bold">Parar</span>
              </div>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            )}
          </button>
        </div>

        {/* Indicador activo si está grabando voz */}
        {escuchandoVoz && (
          <div className="h-10 px-3 rounded-xl border border-rose-400/50 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-between animate-pulse shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <span className="text-xs font-bold">Grabando nota de audio / dictado... habla al micrófono</span>
            </div>
            <button
              type="button"
              onClick={() => onToggleVoz(textoActual)}
              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
            >
              Finalizar
            </button>
          </div>
        )}

        {/* GALERÍA DE EVIDENCIAS SEPARADAS EN ORDEN (FOTOS, VIDEOS Y AUDIOS) */}
        {(totalEvidencias > 0 || subiendoFotos) && (
          <div className="mt-2 pt-2.5 border-t border-zinc-200 dark:border-white/10 space-y-3">
            {/* Cabecera y Filtros de Categoría */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs px-0.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <span>📁 Evidencias Guardadas:</span>
                <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                  ({totalEvidencias} en total)
                </span>
              </span>
              {totalEvidencias > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ✓ Todo guardado en la nube
                </span>
              )}
            </div>

            {/* Pestañas para filtrar por tipo */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setFiltroGaleria("todas")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  filtroGaleria === "todas"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Todas ({totalEvidencias})
              </button>
              <button
                type="button"
                onClick={() => setFiltroGaleria("fotos")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  filtroGaleria === "fotos"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                📷 Fotos ({soloFotosConIdx.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroGaleria("videos")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  filtroGaleria === "videos"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                📹 Videos ({soloVideosConIdx.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroGaleria("audios")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  filtroGaleria === "audios"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                🎙️ Audios ({soloAudios.length})
              </button>
            </div>

            {/* SECCIÓN 1: FOTOS E IMÁGENES */}
            {(filtroGaleria === "todas" || filtroGaleria === "fotos") && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs px-0.5">
                  <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-[11px]">
                    <span>📷</span>
                    <span>Fotos e Imágenes ({soloFotosConIdx.length})</span>
                  </span>
                </div>

                {soloFotosConIdx.length === 0 && !subiendoFotos ? (
                  filtroGaleria === "fotos" && (
                    <div className="p-3 text-center rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200 dark:border-white/10 text-xs text-zinc-400 dark:text-zinc-500">
                      No hay fotos guardadas en este pin.
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {soloFotosConIdx.map((item, fIdx) => (
                      <div
                        key={item.originalIdx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-black/10 dark:bg-black shadow-sm group"
                      >
                        <div
                          className="w-full h-full relative cursor-pointer"
                          onClick={() => setFotoModalUrl(item.url)}
                          title="Ampliar foto guardada"
                        >
                          <img
                            src={item.url}
                            alt={`Foto #${fIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-xs text-white">🔍</span>
                          </div>
                          <div className="absolute top-1 left-1 z-10 pointer-events-none">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[8px] font-black tracking-tight shadow-sm flex items-center gap-0.5">
                              ✓ Guardado
                            </span>
                          </div>
                          <div className="absolute bottom-1 inset-x-1 flex justify-center z-10 pointer-events-none">
                            <span className="px-1.5 py-0.2 rounded bg-black/75 text-blue-200 text-[8px] font-bold tracking-tight">
                              Foto #{fIdx + 1}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => onEliminarFoto(item.originalIdx, e)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer shadow border border-white/20 z-20"
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {subiendoFotos && (
                      <div className="aspect-square rounded-xl border-2 border-dashed border-blue-400/60 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center p-2 text-center animate-pulse">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent rounded-full animate-spin shrink-0 mb-1" />
                        <span className="text-[10px] font-bold leading-tight">Guardando...</span>
                        <span className="text-[8px] text-zinc-500 dark:text-zinc-400">Subiendo a R2</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN 2: VIDEOS DE EVIDENCIA */}
            {(filtroGaleria === "todas" || filtroGaleria === "videos") && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs px-0.5">
                  <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-[11px]">
                    <span>📹</span>
                    <span>Videos de Evidencia ({soloVideosConIdx.length})</span>
                  </span>
                </div>

                {soloVideosConIdx.length === 0 ? (
                  filtroGaleria === "videos" && (
                    <div className="p-3 text-center rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200 dark:border-white/10 text-xs text-zinc-400 dark:text-zinc-500">
                      No hay videos grabados aún. Usa el botón 📹 Video arriba para agregar uno.
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {soloVideosConIdx.map((item, vIdx) => (
                      <div
                        key={item.originalIdx}
                        className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-black shadow-sm group"
                      >
                        <div
                          onClick={() => setVideoModalUrl(item.url)}
                          className="w-full h-full relative flex items-center justify-center bg-zinc-900 cursor-pointer"
                          title="Reproducir video guardado"
                        >
                          <video
                            src={item.url}
                            className="w-full h-full object-cover opacity-80"
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                            <span className="w-8 h-8 rounded-full bg-white/95 text-zinc-900 flex items-center justify-center text-xs font-bold shadow pl-0.5">
                              ▶
                            </span>
                          </div>
                          <div className="absolute top-1 left-1 z-10 pointer-events-none">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[8px] font-black tracking-tight shadow-sm flex items-center gap-0.5">
                              ✓ Guardado
                            </span>
                          </div>
                          <div className="absolute bottom-1 inset-x-1 flex justify-center z-10 pointer-events-none">
                            <span className="px-2 py-0.5 rounded bg-black/75 text-rose-300 text-[9px] font-bold tracking-tight">
                              Video #{vIdx + 1}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => onEliminarFoto(item.originalIdx, e)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer shadow border border-white/20 z-20"
                          title="Eliminar video"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN 3: AUDIOS Y DICTADOS EN ORDEN */}
            {(filtroGaleria === "todas" || filtroGaleria === "audios") && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs px-0.5">
                  <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-[11px]">
                    <span>🎙️</span>
                    <span>Audios y Dictados en Orden ({soloAudios.length})</span>
                  </span>
                </div>

                {soloAudios.length === 0 ? (
                  filtroGaleria === "audios" && (
                    <div className="p-3 text-center rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200 dark:border-white/10 text-xs text-zinc-400 dark:text-zinc-500">
                      No hay audios grabados en este pin. Usa el botón 🎙️ Audio arriba o Dictar voz para grabar uno.
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    {soloAudios.map((audioUrl, aIdx) => (
                      <div
                        key={aIdx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 text-amber-900 dark:text-amber-100 shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-base font-bold">
                            🎙️
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                Audio #{aIdx + 1}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold">
                                ✓ Guardado
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                              Grabación de voz #{aIdx + 1} guardada en la nube
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePlayAudioClip(audioUrl)}
                            className={`h-7 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs ${
                              audioClipReproduciendoUrl === audioUrl
                                ? "bg-amber-600 text-white ring-2 ring-amber-400/50 animate-pulse"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            }`}
                          >
                            <span>
                              {audioClipReproduciendoUrl === audioUrl ? "⏸ Pausar" : "▶ Escuchar"}
                            </span>
                          </button>
                          {onEliminarAudio && (
                            <button
                              type="button"
                              onClick={() => onEliminarAudio(aIdx)}
                              className="w-7 h-7 rounded-lg bg-black/10 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                              title={`Eliminar Audio #${aIdx + 1}`}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>



      {/* Modal para reproducir video de evidencia sin salir */}
      {videoModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={() => setVideoModalUrl(null)}
        >
          <div
            className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-3 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>📹</span> Video de Evidencia
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-bold">
                  ✓ Guardado
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={videoModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Abrir enlace
                </a>
                <button
                  type="button"
                  onClick={() => setVideoModalUrl(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                src={videoModalUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal para ampliar foto de evidencia */}
      {fotoModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={() => setFotoModalUrl(null)}
        >
          <div
            className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-3 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>📷</span> Foto de Evidencia
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-bold">
                  ✓ Guardado
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={fotoModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Abrir enlace
                </a>
                <button
                  type="button"
                  onClick={() => setFotoModalUrl(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={fotoModalUrl}
                alt="Evidencia ampliada"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
