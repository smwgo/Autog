"use client";

import React, { useState } from "react";
import type { InspectionFinding } from "@/app/taller/page";
import CatalogoProductosServiciosTaller from "./CatalogoProductosServiciosTaller";

interface CatalogoItemPropuesta {
  id: string;
  name: string;
  code?: string;
  category?: string;
  brand?: string;
  type: "SERVICE" | "PART";
  price?: number;
  imageUrl?: string | null;
  qty?: number;
}

interface CatalogoItemFuente {
  id?: string | number;
  name?: string;
  title?: string;
  code?: string;
  category?: string;
  brand?: string;
  price?: number | string;
  stock?: number;
  imageUrl?: string | null;
  viscosity?: string;
}

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
  onTranscribirAudio?: (audioUrl: string, targetPinId: string) => void;
  reproduciendoAudio: boolean;
  onReproducirAudio?: (text: string) => void;
  onEliminarAudio?: (idx?: number, targetPinId?: string) => void;
  onEditarNotaKanban?: (noteIndex: number, nuevoTexto: string, targetPinId?: string) => void;
  onEliminarNotaKanban?: (noteIndex: number, targetPinId?: string) => void;
  onAgregarNotaKanban?: (texto: string, targetPinId?: string) => void;
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
  serviciosCatalogo?: CatalogoItemFuente[];
  productosCatalogo?: CatalogoItemFuente[];
  onAgregarItemPin?: (item: any, targetPinId?: string, deltaQty?: number) => void;
  onEliminarItemPin?: (itemId: string, targetPinId?: string) => void;
  onToggleSolicitaRepuesto?: (targetPinId: string, tipo: "repuesto" | "servicio", checked: boolean) => void;
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
  onTranscribirAudio,
  reproduciendoAudio: _reproduciendoAudio,
  onReproducirAudio: _onReproducirAudio,
  onEliminarAudio,
  onEditarNotaKanban,
  onEliminarNotaKanban,
  onAgregarNotaKanban,
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
  serviciosCatalogo = [],
  productosCatalogo = [],
  onAgregarItemPin,
  onEliminarItemPin,
  onToggleSolicitaRepuesto,
}: DetallePinModernoProps) {
  const mismoNumero = pin.pinNumber || 1;
  const listaMismoPin = hallazgosDelMismoPin.filter(
    (h) => (h.pinNumber || 1) === mismoNumero && h.vista === pin.vista
  );
  const bloquesEvidencia = listaMismoPin.length > 0 ? listaMismoPin : [pin];

  const limpiarTipoInicial = (t?: string) => (!t || t.trim() === "Daño" ? "" : t);
  const [tipoTexto, setTipoTexto] = useState(() => limpiarTipoInicial(pin.tipo));
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
  const [camaraPcBloqueId, setCamaraPcBloqueId] = useState<string | null>(null);
  const videoCamaraPcRef = React.useRef<HTMLVideoElement | null>(null);
  const streamCamaraPcRef = React.useRef<MediaStream | null>(null);
  const inputCamaraFallbackRef = React.useRef<HTMLInputElement | null>(null);

  // Estado para formulario de producto o servicio manual
  const [manualBloqueId, setManualBloqueId] = useState<string | null>(null);
  const [manualTipo, setManualTipo] = useState<"PART" | "SERVICE">("PART");
  const [manualNombre, setManualNombre] = useState<string>("");
  const [manualCant, setManualCant] = useState<number>(1);

  const handleAgregarManual = (bloqueId: string) => {
    const nombreLimpio = manualNombre.trim();
    if (!nombreLimpio) return;

    const manualId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const manualCode = `MANUAL-${manualTipo === "PART" ? "PRD" : "SRV"}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    if (onAgregarItemPin) {
      onAgregarItemPin(
        {
          id: manualId,
          name: nombreLimpio,
          code: manualCode,
          category: "Manual",
          type: manualTipo,
          qty: manualCant,
          price: 0,
        },
        bloqueId,
        manualCant
      );
    }

    setManualNombre("");
    setManualCant(1);
  };

  const detenerCamaraPc = () => {
    if (streamCamaraPcRef.current) {
      streamCamaraPcRef.current.getTracks().forEach((t) => t.stop());
      streamCamaraPcRef.current = null;
    }
    setCamaraPcBloqueId(null);
  };

  const abrirCamaraPcOMovil = async (targetBloqueId: string) => {
    const esMovil =
      typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (esMovil || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      inputCamaraFallbackRef.current?.setAttribute("data-bloque-id", targetBloqueId);
      inputCamaraFallbackRef.current?.click();
      return;
    }
    try {
      detenerCamaraPc();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamCamaraPcRef.current = stream;
      setCamaraPcBloqueId(targetBloqueId);
      setTimeout(() => {
        if (videoCamaraPcRef.current) {
          videoCamaraPcRef.current.srcObject = stream;
          videoCamaraPcRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      inputCamaraFallbackRef.current?.setAttribute("data-bloque-id", targetBloqueId);
      inputCamaraFallbackRef.current?.click();
    }
  };

  const capturarFotoDesdeCamaraPc = () => {
    const video = videoCamaraPcRef.current;
    const targetBloqueId = camaraPcBloqueId;
    if (!video || !targetBloqueId) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camara_${Date.now()}.jpg`, { type: "image/jpeg" });
        const fakeEvent = {
          target: { files: [file], value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onSubirFotos(fakeEvent, targetBloqueId);
        detenerCamaraPc();
      },
      "image/jpeg",
      0.9
    );
  };
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");

  const catalogoParaPropuesta = React.useMemo<CatalogoItemPropuesta[]>(() => {
    const servicios: CatalogoItemPropuesta[] = serviciosCatalogo
      .map((item) => ({
        id: String(item.id || item.code || item.name || ""),
        name: String(item.name || item.title || "").trim(),
        code: item.code ? String(item.code) : undefined,
        category: item.category ? String(item.category) : undefined,
        brand: item.brand ? String(item.brand) : undefined,
        type: "SERVICE" as const,
      }))
      .filter((item) => item.id && item.name);
    const productos: CatalogoItemPropuesta[] = productosCatalogo
      .map((item) => ({
        id: String(item.id || item.code || item.name || ""),
        name: String(item.name || item.title || "").trim(),
        code: item.code ? String(item.code) : undefined,
        category: item.category ? String(item.category) : undefined,
        brand: item.brand ? String(item.brand) : undefined,
        type: "PART" as const,
      }))
      .filter((item) => item.id && item.name);

    return [...servicios, ...productos];
  }, [productosCatalogo, serviciosCatalogo]);

  const resultadosCatalogo = React.useMemo(() => {
    const query = busquedaCatalogo.trim().toLocaleLowerCase();
    if (!query) return [];
    return catalogoParaPropuesta
      .filter((item) =>
        [item.name, item.code, item.category, item.brand]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [busquedaCatalogo, catalogoParaPropuesta]);

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
    setTipoTexto(limpiarTipoInicial(pin.tipo));
  }, [pin.id]);

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
      {/* Título de la tarjeta: Etiqueta Evidencia */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-blue-600 dark:bg-blue-500/15 text-white dark:text-blue-300 border border-transparent dark:border-blue-400/30 text-xs sm:text-sm font-bold tracking-tight flex items-center gap-1.5 shadow-xs">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.607-10.607a3 3 0 0 1 4.243 4.243L8.914 17.958a1.5 1.5 0 0 1-2.122-2.121l9.9-9.9" />
            </svg>
            <span>Evidencia #{mismoNumero}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
        <label className="block text-xs sm:text-sm font-normal text-zinc-900 dark:text-zinc-100 tracking-tight">Daño</label>
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

          const notasAudioBloque: string[] = Array.isArray((bloque as any).audioNotes)
            ? (bloque as any).audioNotes
            : [];
          const rawKanbanBloque: {
            id: string;
            text: string;
            createdAt?: string;
            source?: "audio" | "manual";
            audioIndex?: number;
          }[] = Array.isArray((bloque as any).kanbanNotes) ? (bloque as any).kanbanNotes : [];

          const notasKanbanBloque: {
            id: string;
            text: string;
            createdAt?: string;
            source?: "audio" | "manual";
            audioIndex?: number;
          }[] = (() => {
            const list = [...rawKanbanBloque];
            soloAudiosBloque.forEach((_audioUrl, aIdx) => {
              const yaExiste = list.some((n) => n.audioIndex === aIdx);
              if (!yaExiste) {
                const textoAudio = (notasAudioBloque[aIdx] || "").trim();
                if (textoAudio) {
                  list.push({
                    id: `kn-${bloque.id}-${aIdx}`,
                    text: textoAudio,
                    source: "audio",
                    audioIndex: aIdx,
                  });
                }
              }
            });
            return list;
          })();

          const totalEvidenciasBloque =
            soloFotosBloque.length +
            soloVideosBloque.length +
            soloAudiosBloque.length +
            notasKanbanBloque.length;

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
                  {bloquesEvidencia.length > 1 && (
                    <span className="px-2.5 py-1 rounded-md bg-blue-600 dark:bg-blue-500/15 text-white dark:text-blue-300 border border-transparent dark:border-blue-400/30 text-xs sm:text-sm font-bold tracking-tight flex items-center gap-1.5 shadow-xs">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.607-10.607a3 3 0 0 1 4.243 4.243L8.914 17.958a1.5 1.5 0 0 1-2.122-2.121l9.9-9.9" />
                      </svg>
                      <span>Evidencia #{numBloque}</span>
                    </span>
                  )}

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

              {/* Campo Descripción asociado a las fotos de este bloque */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-normal text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                    <span>Descripción</span>
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

                <div className="grid w-full">
                  <div
                    aria-hidden="true"
                    className="invisible [grid-area:1/1/2/2] w-full rounded-xl border border-transparent pl-3.5 pr-3 py-2.5 sm:py-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words min-h-[2.75rem]"
                  >
                    {(textoBloque || "Escribe una descripción...") + "\n"}
                  </div>
                  <textarea
                    rows={1}
                    value={textoBloque}
                    onChange={(e) => onChangeObservacion(e.target.value, bloque.id)}
                    placeholder="Escribe una descripción..."
                    className="[grid-area:1/1/2/2] w-full h-full overflow-hidden resize-none rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 focus:border-blue-500/50 pl-3.5 pr-3 py-2.5 sm:py-3 text-zinc-900 dark:text-white text-sm sm:text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all leading-relaxed whitespace-pre-wrap break-words"
                  />
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
                  {/* Botón Tomar foto con la cámara (PC Webcam en vivo + Móvil Cámara trasera) */}
                  <button
                    type="button"
                    title={`Tomar foto con cámara para Evidencia #${numBloque}`}
                    disabled={maxFotosBloque || subiendoEsteBloque}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (maxFotosBloque || subiendoEsteBloque) return;
                      abrirCamaraPcOMovil(bloque.id);
                    }}
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
                  </button>

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

                  {/* Botón Agregar Producto o Servicio Manual */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManualBloqueId((prev) => (prev === bloque.id ? null : bloque.id));
                    }}
                    title={`Agregar producto o servicio manual para Evidencia #${numBloque}`}
                    className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden active:scale-95 shadow-sm touch-manipulation select-none ${
                      manualBloqueId === bloque.id
                        ? "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/50 shadow-md"
                        : "bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                      />
                    </svg>
                  </button>
                </div>

                {/* Formulario para agregar Producto o Servicio Manualmente (Diseño Moderno y Minimalista) */}
                {manualBloqueId === bloque.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] backdrop-blur-xs space-y-2.5 animate-fade-in shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                          Agregar manual
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualBloqueId(null)}
                        className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-white/10 text-xs transition-colors cursor-pointer"
                        title="Cerrar"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Segmented Control Minimalista: Producto / Servicio con filos no tan redondos */}
                    <div className="inline-flex p-0.5 rounded-md bg-zinc-200/60 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 w-full">
                      <button
                        type="button"
                        onClick={() => setManualTipo("PART")}
                        className={`flex-1 py-1.5 px-3 rounded text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          manualTipo === "PART"
                            ? "bg-white dark:bg-white/15 text-zinc-900 dark:text-white shadow-2xs font-semibold"
                            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-normal"
                        }`}
                      >
                        <span className="text-[11px]">📦</span>
                        <span>Producto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualTipo("SERVICE")}
                        className={`flex-1 py-1.5 px-3 rounded text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          manualTipo === "SERVICE"
                            ? "bg-white dark:bg-white/15 text-zinc-900 dark:text-white shadow-2xs font-semibold"
                            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-normal"
                        }`}
                      >
                        <span className="text-[11px]">🔧</span>
                        <span>Servicio</span>
                      </button>
                    </div>

                    {/* Input, Stepper y Botón con bordes suaves no tan redondos */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={manualNombre}
                        onChange={(e) => setManualNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAgregarManual(bloque.id);
                          }
                        }}
                        placeholder={
                          manualTipo === "PART"
                            ? "Nombre del producto..."
                            : "Descripción del servicio..."
                        }
                        className="flex-1 h-9 rounded-md bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 px-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white/30 shadow-2xs transition-colors"
                        autoFocus
                      />

                      {/* Contador de Cantidad */}
                      <div className="h-9 px-1 inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-md bg-white dark:bg-white/[0.04] shadow-2xs shrink-0">
                        <button
                          type="button"
                          onClick={() => setManualCant((prev) => Math.max(1, prev - 1))}
                          className="w-6 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer transition-colors"
                          title="Restar 1"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs font-semibold text-zinc-800 dark:text-zinc-200 select-none">
                          {manualCant}
                        </span>
                        <button
                          type="button"
                          onClick={() => setManualCant((prev) => prev + 1)}
                          className="w-6 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer transition-colors"
                          title="Sumar 1"
                        >
                          +
                        </button>
                      </div>

                      {/* Botón Agregar */}
                      <button
                        type="button"
                        onClick={() => handleAgregarManual(bloque.id)}
                        disabled={!manualNombre.trim()}
                        className="h-9 px-3.5 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium flex items-center justify-center cursor-pointer transition-all shadow-2xs shrink-0 active:scale-95"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                )}

                {/* Indicador activo con diseño moderno de ondas al grabar audio en este bloque */}
                {escuchandoEsteBloque && (
                  <div className="relative overflow-hidden p-3.5 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-amber-500/10 dark:from-rose-500/20 dark:via-zinc-900/90 dark:to-amber-500/15 text-rose-700 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-500/10 animate-fade-in">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30 shrink-0">
                        <span className="animate-ping absolute inset-0 rounded-xl bg-rose-500 opacity-30"></span>
                        <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-mono font-black tracking-wider shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {formatearSegundos(segundosGrabandoAudio)}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                            Grabando...
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1 h-3">
                          {[0.35, 0.85, 0.55, 1, 0.45, 0.9, 0.6, 0.95, 0.4, 0.75, 0.5, 0.8, 0.65, 0.35].map((h, idx) => (
                            <span
                              key={idx}
                              style={{
                                height: `${Math.max(25, Math.round(h * 100))}%`,
                                animationDelay: `${idx * 90}ms`,
                              }}
                              className="w-1 rounded-full bg-gradient-to-t from-rose-500 to-amber-400 animate-pulse"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVoz(textoBloque, "audio", bloque.id);
                      }}
                      className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shrink-0 shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span className="w-2.5 h-2.5 rounded-xs bg-white inline-block" />
                      <span>Detener</span>
                    </button>
                  </div>
                )}

                {!escuchandoEsteBloque && transcribiendoEsteBloque && (
                  <div className="p-3 rounded-xl border border-amber-400/40 bg-amber-50/70 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2.5 text-xs font-semibold animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
                      <span>Transcribiendo...</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20">
                      IA Voz
                    </span>
                  </div>
                )}

                {/* TARJETA DE CONTENIDO ASOCIADO DE ESTE BLOQUE (FOTOS + DESCRIPCIÓN + AUDIOS JUNTOS) */}
                {(totalEvidenciasBloque > 0 || subiendoEsteBloque) && (
                  <div className="mt-2 pt-2.5 border-t border-zinc-200 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2 px-0.5">
                      <span className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5">
                        <span>🔗 Asociado a Evidencia #{numBloque}:</span>
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

                    {/* Audios asociados a este bloque (Rediseño moderno + minimalista) */}
                    {soloAudiosBloque.length > 0 && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {soloAudiosBloque.map((audioUrl, aIdx) => {
                            const notaAsociadaAudio =
                              notasKanbanBloque.find((n) => n.audioIndex === aIdx)?.text ||
                              notasAudioBloque[aIdx] ||
                              "";
                            const reproduciendoEste = audioClipReproduciendoUrl === audioUrl;

                            return (
                              <div
                                key={aIdx}
                                className="relative flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 hover:border-amber-400/50 dark:hover:border-amber-500/30 text-zinc-900 dark:text-zinc-100 shadow-xs transition-all backdrop-blur-xs"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePlayAudioClip(audioUrl);
                                    }}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-xs ${
                                      reproduciendoEste
                                        ? "bg-amber-500 text-white shadow-amber-500/20 animate-pulse"
                                        : "bg-zinc-100 dark:bg-white/10 hover:bg-amber-500 hover:text-white text-zinc-700 dark:text-zinc-300"
                                    }`}
                                    title={reproduciendoEste ? "Pausar" : "Escuchar"}
                                  >
                                    {reproduciendoEste ? "⏸" : "▶"}
                                  </button>

                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                      Audio #{aIdx + 1}
                                    </span>
                                    <div className="flex items-center gap-0.5 h-2.5">
                                      {[0.4, 0.8, 0.5, 0.9, 0.6, 0.45, 0.7].map((bar, bIdx) => (
                                        <span
                                          key={bIdx}
                                          style={{ height: `${Math.round(bar * 100)}%` }}
                                          className={`w-0.5 rounded-full transition-all ${
                                            reproduciendoEste
                                              ? "bg-amber-500 animate-pulse"
                                              : "bg-zinc-300 dark:bg-zinc-600"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {onTranscribirAudio && (
                                    <button
                                      type="button"
                                      disabled={transcribiendoEsteBloque}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTranscribirAudio(audioUrl, bloque.id);
                                      }}
                                      className={`h-6 px-2 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                                        notaAsociadaAudio
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                      }`}
                                      title={notaAsociadaAudio ? "Nota guardada" : "Crear nota"}
                                    >
                                      {transcribiendoEsteBloque
                                        ? "..."
                                        : notaAsociadaAudio
                                          ? "✓ Guardada"
                                          : "+ Nota"}
                                    </button>
                                  )}
                                  {onEliminarAudio && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEliminarAudio(aIdx, bloque.id);
                                      }}
                                      className="w-6 h-6 rounded-md hover:bg-rose-500/15 text-zinc-400 hover:text-rose-600 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                                      title={`Eliminar`}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TABLERO DE NOTAS TIPO KANBAN (TEXTO TRANSFORMADO DEL AUDIO - GUARDADO AUTOMÁTICO) */}
                    {notasKanbanBloque.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                            <span>Notas</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start">
                          {notasKanbanBloque.map((notaItem, nIdx) => (
                            <div
                              key={notaItem.id || nIdx}
                              onClick={(e) => e.stopPropagation()}
                              className="group relative rounded-2xl border-l-4 border-l-amber-500 border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-zinc-900/90 p-3 shadow-sm hover:shadow-md transition-all flex flex-col gap-2 h-auto"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm font-normal text-zinc-700 dark:text-zinc-300">
                                  Nota #{nIdx + 1}
                                </span>
                                {onEliminarNotaKanban && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEliminarNotaKanban(nIdx, bloque.id);
                                    }}
                                    className="w-6 h-6 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                                    title="Eliminar tarjeta de nota"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              <div className="grid w-full">
                                <div
                                  aria-hidden="true"
                                  className="invisible [grid-area:1/1/2/2] w-full rounded-xl border border-transparent px-2.5 py-2 text-xs font-normal leading-relaxed whitespace-pre-wrap break-words min-h-[2.5rem]"
                                >
                                  {((notaItem.text || "").replace(/\s*\(escribe o edita aquí el detalle\)/gi, "") || "Escribe una nota...") + "\n"}
                                </div>
                                <textarea
                                  rows={1}
                                  value={(notaItem.text || "").replace(/\s*\(escribe o edita aquí el detalle\)/gi, "")}
                                  onChange={(e) =>
                                    onEditarNotaKanban?.(nIdx, e.target.value, bloque.id)
                                  }
                                  placeholder="Escribe una nota..."
                                  className="[grid-area:1/1/2/2] w-full h-full overflow-hidden rounded-xl bg-white/80 dark:bg-black/40 border border-amber-200/80 dark:border-white/10 px-2.5 py-2 text-xs font-normal text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-amber-500 resize-none leading-relaxed whitespace-pre-wrap break-words"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="pt-2 border-t border-zinc-200/70 dark:border-white/10 space-y-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CatalogoProductosServiciosTaller
                    itemsSeleccionados={bloque.linkedItems || []}
                    onAgregarItem={(item, delta) => onAgregarItemPin?.(item, bloque.id, delta)}
                    onEliminarItem={(itemId) => onEliminarItemPin?.(itemId, bloque.id)}
                    serviciosCatalogo={serviciosCatalogo}
                    productosCatalogo={productosCatalogo}
                    titulo="Catálogo"
                    siempreAbierto={true}
                    mostrarChipsSeleccionados={true}
                  />
                </div>
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

      {/* Input oculto para cámara nativa en móvil o fallback en PC */}
      <input
        ref={inputCamaraFallbackRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const bId = e.currentTarget.getAttribute("data-bloque-id") || pin.id;
          onSubirFotos(e, bId);
        }}
        className="hidden"
      />

      {/* Modal de Cámara en Vivo para PC */}
      {camaraPcBloqueId && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={detenerCamaraPc}
        >
          <div
            className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-3.5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cámara en Vivo</span>
              </span>
              <button
                type="button"
                onClick={detenerCamaraPc}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/10">
              <video
                ref={videoCamaraPcRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const bId = camaraPcBloqueId;
                  detenerCamaraPc();
                  if (bId) {
                    inputCamaraFallbackRef.current?.setAttribute("data-bloque-id", bId);
                    inputCamaraFallbackRef.current?.click();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Elegir archivo...
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={detenerCamaraPc}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={capturarFotoDesdeCamaraPc}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95"
                >
                  <span>📸</span>
                  <span>Capturar Foto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default DetallePinModerno;

