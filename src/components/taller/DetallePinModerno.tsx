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
  onChangeObservacion: (text: string, targetPinId?: string) => void;
  // Audio
  escuchandoVoz: boolean;
  transcribiendoVoz?: boolean;
  segundosGrabandoAudio?: number;
  pinAccionActivaId?: string | null;
  onToggleVoz: (textoActual?: string, modo?: "dictado" | "audio", targetPinId?: string) => void;
  onSubirAudio?: (e: React.ChangeEvent<HTMLInputElement>, targetPinId?: string) => void;
  reproduciendoAudio: boolean;
  onReproducirAudio?: (text: string) => void;
  onEliminarAudio?: (idx?: number, targetPinId?: string) => void;
  // Fotos (hasta 5 por bloque)
  subiendoFotos: boolean;
  onSubirFotos: (e: React.ChangeEvent<HTMLInputElement>, targetPinId?: string) => void;
  onEliminarFoto: (idx: number, e?: React.MouseEvent, targetPinId?: string) => void;
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
  chipsTipos: _chipsTipos,
  tipoSeleccionado,
  onToggleTipo,
  onChangeTipo,
  observacionTexto,
  onChangeObservacion,
  escuchandoVoz,
  transcribiendoVoz = false,
  segundosGrabandoAudio = 0,
  pinAccionActivaId = null,
  onToggleVoz,
  onSubirAudio,
  reproduciendoAudio: _reproduciendoAudio,
  onReproducirAudio: _onReproducirAudio,
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
}: DetallePinModernoProps) {
  const mismoNumero = pin.pinNumber || 1;
  const listaMismoPin = hallazgosDelMismoPin.filter(
    (h) => (h.pinNumber || 1) === mismoNumero && h.vista === pin.vista
  );
  const bloquesEvidencia = listaMismoPin.length > 0 ? listaMismoPin : [pin];

  const [tipoTexto, setTipoTexto] = useState(pin.tipo || tipoSeleccionado || "");
  const zonaActual = pin.zona || pin.vistaLabel || pin.vista || "";
  const [zonaPrincipal, ...subcategoriaParts] = zonaActual.split("·").map((parte) => parte.trim());
  const subcategoria = subcategoriaParts.join(" · ");

  // Modales para ver fotos ampliadas y reproducir videos en ventana propia
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [fotoModalData, setFotoModalData] = useState<{
    url: string;
    bloqueNum: number;
    fotoNum: number;
    descripcion: string;
  } | null>(null);
  const [audioClipReproduciendoUrl, setAudioClipReproduciendoUrl] = useState<string | null>(null);
  const audioClipPlayerRef = React.useRef<HTMLAudioElement | null>(null);

  // Clasificación de evidencias: Fotos vs Videos
  const esVideoUrl = (url: string) =>
    /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url) ||
    url.includes("taller_video") ||
    url.toLowerCase().includes("video");

  const formatearSegundos = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

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
          <span
            suppressHydrationWarning
            translate="no"
            className="w-5 h-5 rounded-full bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 font-mono text-[11px] font-bold flex items-center justify-center shrink-0"
          >
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
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

      {/* 1. ZONA / SUBCATEGORÍA */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 0h17.25m-17.25 0 2.25-6.75h12.75l2.25 6.75"
              />
            </svg>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm font-bold">
            <span className="truncate rounded-full bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/25 px-2.5 py-1 text-blue-700 dark:text-blue-300">
              {zonaPrincipal}
            </span>
            {subcategoria && (
              <span className="truncate rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                {subcategoria}
              </span>
            )}
          </div>
        </div>
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

      {/* 3. BLOQUES DE EVIDENCIA ASOCIADOS (CADA BLOQUE VINCULA SU PROPIA DESCRIPCIÓN + FOTOS + AUDIO) */}
      <div className="space-y-3.5">
        {bloquesEvidencia.map((bloque, bIdx) => {
          const numBloque = bIdx + 1;
          const esPinPrincipal = bloque.id === pin.id;
          const textoBloque = esPinPrincipal
            ? observacionTexto !== ""
              ? observacionTexto
              : bloque.descripcion || ""
            : bloque.descripcion || "";

          const fotosRaw = bloque.photoUrls || (bloque.photoUrl ? [bloque.photoUrl] : []);
          const maxFotosBloque = fotosRaw.length >= 5;

          const soloFotosBloque = fotosRaw
            .map((url, originalIdx) => ({ url, originalIdx }))
            .filter((item) => !esVideoUrl(item.url));

          const soloVideosBloque = fotosRaw
            .map((url, originalIdx) => ({ url, originalIdx }))
            .filter((item) => esVideoUrl(item.url));

          const soloAudiosBloque =
            bloque.audioUrls && bloque.audioUrls.length > 0
              ? bloque.audioUrls
              : bloque.audioUrl
              ? [bloque.audioUrl]
              : [];

          const totalEvidenciasBloque =
            soloFotosBloque.length + soloVideosBloque.length + soloAudiosBloque.length;

          const esteBloqueActivo =
            pinAccionActivaId === bloque.id || (!pinAccionActivaId && esPinPrincipal);
          const escuchandoEsteBloque = escuchandoVoz && esteBloqueActivo;
          const transcribiendoEsteBloque = transcribiendoVoz && esteBloqueActivo;
          const subiendoEsteBloque = subiendoFotos && esteBloqueActivo;

          return (
            <div
              key={bloque.id}
              onClick={() => {
                if (!esPinPrincipal && onSeleccionarHallazgoPin) {
                  onSeleccionarHallazgoPin(bloque.id);
                }
              }}
              className={`rounded-2xl border p-3.5 sm:p-4 space-y-3 transition-all ${
                bloquesEvidencia.length > 1
                  ? esPinPrincipal
                    ? "bg-blue-50/20 dark:bg-blue-500/[0.04] border-blue-300 dark:border-blue-500/30 shadow-xs"
                    : "bg-zinc-50/60 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10"
                  : "bg-zinc-50/40 dark:bg-white/[0.02] border-zinc-200/80 dark:border-white/10"
              }`}
            >
              {/* Cabecera del Bloque Asociado (identifica a qué foto/grupo pertenece el texto y audio) */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-200/70 dark:border-white/10 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md bg-blue-600 dark:bg-blue-500/15 text-white dark:text-blue-300 border border-transparent dark:border-blue-400/30 text-xs sm:text-sm font-bold tracking-tight flex items-center gap-1.5 shadow-xs">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.607-10.607a3 3 0 0 1 4.243 4.243L8.914 17.958a1.5 1.5 0 0 1-2.122-2.121l9.9-9.9" />
                    </svg>
                    <span>Evidencia #{numBloque}</span>
                  </span>

                  {soloFotosBloque.length > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs sm:text-sm font-semibold">
                      📷 {soloFotosBloque.length} {soloFotosBloque.length === 1 ? "foto" : "fotos"}
                    </span>
                  )}
                  {soloAudiosBloque.length > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs sm:text-sm font-semibold">
                      🎙️ {soloAudiosBloque.length} {soloAudiosBloque.length === 1 ? "audio" : "audios"}
                    </span>
                  )}
                  {textoBloque.trim().length > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs sm:text-sm font-semibold">
                      📝 Texto asociado
                    </span>
                  )}
                </div>

                {bloquesEvidencia.length > 1 && onEliminarHallazgoEspecifico && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminarHallazgoEspecifico(bloque.id);
                    }}
                    className="h-7 px-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title={`Quitar Evidencia #${numBloque}`}
                  >
                    <span>✕</span>
                    <span>Quitar #{numBloque}</span>
                  </button>
                )}
              </div>

              {/* Campo Descripción asociado a las fotos y audios de este bloque */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <span>Descripción</span>
                    {escuchandoEsteBloque && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        Grabando ({formatearSegundos(segundosGrabandoAudio)})...
                      </span>
                    )}
                    {!escuchandoEsteBloque && transcribiendoEsteBloque && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        Convirtiendo tu voz a texto...
                      </span>
                    )}
                  </label>
                  {textoBloque.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeObservacion("", bloque.id);
                      }}
                      className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-rose-50 dark:bg-white/[0.06] dark:hover:bg-rose-500/20 text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-semibold transition-colors cursor-pointer"
                      title="Limpiar texto de esta evidencia"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={textoBloque}
                    onChange={(e) => onChangeObservacion(e.target.value, bloque.id)}
                    placeholder={
                      escuchandoEsteBloque
                        ? "🎙️ Habla ahora al micrófono..."
                        : transcribiendoEsteBloque
                        ? "⏳ Convirtiendo tu voz a texto..."
                        : "Escribe una descripción..."
                    }
                    className={`w-full rounded-xl bg-white dark:bg-white/[0.03] border pl-3.5 pr-28 sm:pr-3.5 py-2.5 sm:py-3 text-zinc-900 dark:text-white text-sm sm:text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all ${
                      escuchandoEsteBloque
                        ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 dark:bg-rose-500/10 placeholder:text-rose-600 dark:placeholder:text-rose-400 font-medium"
                        : "border-zinc-200 dark:border-white/10 focus:border-blue-500/50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVoz(textoBloque, "dictado", bloque.id);
                    }}
                    className={`btn-dictar-solo-movil sm:hidden sm:!hidden md:!hidden absolute right-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs touch-manipulation select-none ${
                      escuchandoEsteBloque
                        ? "bg-rose-600 text-white border-rose-600 animate-pulse shadow-rose-600/30 font-bold"
                        : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                    }`}
                    title={escuchandoEsteBloque ? "Detener dictado" : "Dictar voz"}
                  >
                    {escuchandoEsteBloque ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span className="text-[11px] font-bold">Detener</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">🎙️</span>
                        <span className="text-[11px] font-bold">
                          {transcribiendoEsteBloque ? "Procesando..." : "Dictar voz"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Botonera de Captura asociada a este bloque */}
              <div className="space-y-2.5">
                {subiendoEsteBloque && (
                  <div className="flex items-center justify-end text-xs px-0.5">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      Guardando en la nube...
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Botón Tomar foto con la cámara */}
                  <label
                    title={`Tomar foto para Evidencia #${numBloque}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden ${
                      maxFotosBloque || subiendoEsteBloque
                        ? "bg-zinc-100 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        : "bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 active:scale-95 shadow-sm"
                    }`}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={maxFotosBloque || subiendoEsteBloque}
                      onChange={(e) => onSubirFotos(e, bloque.id)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </label>

                  {/* Botón Seleccionar foto de galería */}
                  <label
                    title={`Seleccionar foto de galería para Evidencia #${numBloque}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden ${
                      maxFotosBloque || subiendoEsteBloque
                        ? "bg-zinc-100 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        : "bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 active:scale-95 shadow-sm"
                    }`}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                      />
                    </svg>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={maxFotosBloque || subiendoEsteBloque}
                      onChange={(e) => onSubirFotos(e, bloque.id)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </label>

                  {/* Botón Grabar Nota de Audio asociada a esta evidencia (PC y Móvil) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVoz(textoBloque, "audio", bloque.id);
                    }}
                    title={
                      escuchandoEsteBloque
                        ? "Detener y guardar grabación de audio"
                        : `Grabar nota de audio en PC/Móvil para Evidencia #${numBloque}`
                    }
                    className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden active:scale-95 shadow-sm touch-manipulation select-none ${
                      escuchandoEsteBloque
                        ? "bg-rose-600 text-white border-rose-700 animate-pulse ring-2 ring-rose-400/50"
                        : "bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {escuchandoEsteBloque ? (
                      <div className="flex flex-col items-center">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping mb-0.5" />
                        <span className="text-[9px] font-mono font-bold">
                          {formatearSegundos(segundosGrabandoAudio)}
                        </span>
                      </div>
                    ) : (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Indicador activo con cronómetro en tiempo real si está grabando voz en este bloque */}
                {escuchandoEsteBloque && (
                  <div className="h-11 px-3 rounded-xl border border-rose-400/50 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                      </span>
                      <span className="text-xs font-mono font-black px-1.5 py-0.5 rounded bg-rose-600/15 text-rose-700 dark:text-rose-300 shrink-0">
                        {formatearSegundos(segundosGrabandoAudio)}
                      </span>
                      <span className="text-xs font-bold truncate">
                        Grabando audio para Evidencia #{numBloque}...
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVoz(textoBloque, "audio", bloque.id);
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shrink-0 shadow-xs"
                    >
                      ⏹ Guardar Audio
                    </button>
                  </div>
                )}

                {/* TARJETA DE CONTENIDO ASOCIADO DE ESTE BLOQUE (FOTOS + DESCRIPCIÓN + AUDIOS JUNTOS) */}
                {(totalEvidenciasBloque > 0 || subiendoEsteBloque) && (
                  <div className="mt-2 pt-2.5 border-t border-zinc-200 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs px-0.5">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <span>🔗 Asociado a Evidencia #{numBloque}:</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ✓ Vinculado en la nube
                      </span>
                    </div>

                    {/* Resumen de texto asociado a estas fotos/audios */}
                    {textoBloque.trim().length > 0 && (
                      <div className="px-3 py-2 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/25 text-xs text-zinc-800 dark:text-zinc-200 flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0">📝 Nota:</span>
                        <span className="font-medium break-words">{textoBloque}</span>
                      </div>
                    )}

                    {/* Fotos asociadas a este bloque */}
                    {(soloFotosBloque.length > 0 || subiendoEsteBloque) && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {soloFotosBloque.map((item, fIdx) => (
                          <div
                            key={item.originalIdx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-black/10 dark:bg-black shadow-sm group"
                          >
                            <div
                              className="w-full h-full relative cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFotoModalData({
                                  url: item.url,
                                  bloqueNum: numBloque,
                                  fotoNum: fIdx + 1,
                                  descripcion: textoBloque,
                                });
                              }}
                              title="Ampliar foto asociada"
                            >
                              <img
                                src={item.url}
                                alt={`Evidencia #${numBloque} - Foto #${fIdx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-xs text-white">🔍</span>
                              </div>
                              <div className="absolute top-1 left-1 z-10 pointer-events-none">
                                <span className="px-1.5 py-0.5 rounded bg-blue-600/90 text-white text-[8px] font-black tracking-tight shadow-sm">
                                  Evid. #{numBloque}
                                </span>
                              </div>
                              <div className="absolute bottom-1 inset-x-1 flex justify-center z-10 pointer-events-none">
                                <span className="px-1.5 py-0.2 rounded bg-black/75 text-blue-200 text-[8px] font-bold tracking-tight truncate max-w-full">
                                  Foto #{fIdx + 1}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => onEliminarFoto(item.originalIdx, e, bloque.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer shadow border border-white/20 z-20"
                              title="Eliminar foto"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {subiendoEsteBloque && (
                          <div className="aspect-square rounded-xl border-2 border-dashed border-blue-400/60 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center p-2 text-center animate-pulse">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent dark:border-blue-400 dark:border-t-transparent rounded-full animate-spin shrink-0 mb-1" />
                            <span className="text-[10px] font-bold leading-tight">Guardando...</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Videos asociados a este bloque (si existen) */}
                    {soloVideosBloque.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {soloVideosBloque.map((item, vIdx) => (
                          <div
                            key={item.originalIdx}
                            className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-black shadow-sm group"
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setVideoModalUrl(item.url);
                              }}
                              className="w-full h-full relative flex items-center justify-center bg-zinc-900 cursor-pointer"
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
                              <div className="absolute bottom-1 inset-x-1 flex justify-center z-10 pointer-events-none">
                                <span className="px-2 py-0.5 rounded bg-black/75 text-rose-300 text-[9px] font-bold">
                                  Evid. #{numBloque} • Video #{vIdx + 1}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => onEliminarFoto(item.originalIdx, e, bloque.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer shadow border border-white/20 z-20"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Audios asociados a las fotos y descripción de este bloque (con reproductor nativo para PC) */}
                    {soloAudiosBloque.length > 0 && (
                      <div className="space-y-2">
                        {soloAudiosBloque.map((audioUrl, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex flex-col gap-2 p-2.5 rounded-xl border border-amber-300/80 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 text-amber-900 dark:text-amber-100 shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-base font-bold">
                                  🎙️
                                </div>
                                <div className="flex flex-col text-left min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                      Audio #{aIdx + 1} (de Evidencia #{numBloque})
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold">
                                      ✓ Asociado
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                    {textoBloque
                                      ? `Nota: "${textoBloque}"`
                                      : soloFotosBloque.length > 0
                                      ? `Vinculado a ${soloFotosBloque.length} ${soloFotosBloque.length === 1 ? "foto" : "fotos"} de Evidencia #${numBloque}`
                                      : `Grabación de voz de Evidencia #${numBloque}`}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePlayAudioClip(audioUrl);
                                  }}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEliminarAudio(aIdx, bloque.id);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-black/10 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                                    title={`Eliminar Audio #${aIdx + 1}`}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Barra de reproducción nativa en PC y móvil */}
                            <audio
                              src={audioUrl}
                              controls
                              preload="metadata"
                              onClick={(e) => e.stopPropagation()}
                              className="w-full h-8 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Botón para crear otro bloque separado si se desea subir otra foto con su propio texto o audio */}
        <button
          type="button"
          onClick={onDuplicarPin}
          className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-sky-400/40 dark:border-sky-500/30 bg-sky-50/50 hover:bg-sky-100/60 dark:bg-sky-500/[0.08] dark:hover:bg-sky-500/[0.16] text-sky-700 dark:text-sky-300 text-sm font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99] shadow-xs"
        >
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-sky-200/60 dark:bg-sky-400/20 text-sky-600 dark:text-sky-300 text-base font-black">＋</span>
          <span>
            Evidencia #{bloquesEvidencia.length + 1}
          </span>
        </button>
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
              <video src={videoModalUrl} controls autoPlay className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Modal para ampliar foto de evidencia mostrando su texto asociado */}
      {fotoModalData && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={() => setFotoModalData(null)}
        >
          <div
            className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-3 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>📷</span> Evidencia #{fotoModalData.bloqueNum} • Foto #{fotoModalData.fotoNum}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-bold">
                  ✓ Asociado
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={fotoModalData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Abrir enlace
                </a>
                <button
                  type="button"
                  onClick={() => setFotoModalData(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            {fotoModalData.descripcion && (
              <div className="px-3 py-2 rounded-xl bg-white/10 text-xs text-white">
                <span className="font-bold text-blue-300">Descripción asociada: </span>
                <span>{fotoModalData.descripcion}</span>
              </div>
            )}
            <div className="rounded-xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={fotoModalData.url}
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
