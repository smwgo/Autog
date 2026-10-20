"use client";

import React from "react";
import type { InspectionFinding } from "@/app/taller/page";

export interface DetallePinModernoProps {
  pin: InspectionFinding;
  chipsTipos: { id: string; label: string; color: string }[];
  tipoSeleccionado: string;
  onToggleTipo: (tipoId: string) => void;
  observacionTexto: string;
  onChangeObservacion: (text: string) => void;
  // Audio
  escuchandoVoz: boolean;
  onToggleVoz: () => void;
  reproduciendoAudio: boolean;
  onReproducirAudio: (text: string) => void;
  // Fotos (hasta 3)
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
  onCerrar,
  hallazgosDelMismoPin = [],
  onSeleccionarHallazgoPin,
  onEliminarHallazgoEspecifico,
}: DetallePinModernoProps) {
  const fotos = pin.photoUrls || (pin.photoUrl ? [pin.photoUrl] : []);
  const maxFotosAlcanzado = fotos.length >= 3;

  const textoParaAudio =
    observacionTexto.trim() ||
    pin.descripcion?.trim() ||
    `${pin.tipo} en ${pin.zona || pin.vistaLabel || "vehículo"}.`;

  const tiposSeleccionados = (pin.tipo || tipoSeleccionado || "")
    .split(",")
    .map((t) => t.trim());

  const mismoNumero = pin.pinNumber || 1;
  const listaMismoPin = hallazgosDelMismoPin.filter(
    (h) => (h.pinNumber || 1) === mismoNumero && h.vista === pin.vista
  );

  return (
    <div className="mt-3 rounded-2xl bg-[#0c0d12]/95 backdrop-blur-xl border border-white/10 p-3 sm:p-4 shadow-2xl space-y-3 animate-fade-in transition-all">
      {/* 1. CABECERA COMPACTA: PIN #, ZONA Y ACCIONES RÁPIDAS */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 text-white font-mono text-[11px] font-black flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30 ring-1 ring-white/30">
            #{mismoNumero}
          </span>
          <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
            {pin.vistaLabel || pin.vista}
          </span>
          {listaMismoPin.length > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
              {listaMismoPin.findIndex((h) => h.id === pin.id) + 1}/{listaMismoPin.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botón que agrega hallazgo AL MISMO PIN sin generar un número nuevo */}
          <button
            type="button"
            onClick={onDuplicarPin}
            className="h-7 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-sm"
            title={`Añadir otro hallazgo o daño a este mismo Pin #${mismoNumero}`}
          >
            <span className="text-xs font-black">+</span>
            <span>Hallazgo #{mismoNumero}</span>
          </button>
          <button
            type="button"
            onClick={onEliminarPin}
            className="h-7 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            title={`Eliminar Pin #${mismoNumero}`}
          >
            <span>✕</span>
            <span className="hidden sm:inline">Eliminar</span>
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
            title="Cerrar detalle"
          >
            ✕
          </button>
        </div>
      </div>

      {/* PESTAÑAS SI EL PIN TIENE MÁS DE 1 DAÑO REGISTRADO */}
      {listaMismoPin.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-white/[0.05]">
          <span className="text-[10px] text-zinc-400 font-medium shrink-0">Daños en #{mismoNumero}:</span>
          {listaMismoPin.map((h, idx) => {
            const activo = h.id === pin.id;
            return (
              <div key={h.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => onSeleccionarHallazgoPin?.(h.id)}
                  className={`h-6 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    activo
                      ? "bg-rose-500 text-white shadow-sm ring-1 ring-white/30 font-bold"
                      : "bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]"
                  }`}
                >
                  <span>Daño {idx + 1}</span>
                  <span className="opacity-75 font-normal">({h.tipo || "Sin tipo"})</span>
                </button>
                {listaMismoPin.length > 1 && onEliminarHallazgoEspecifico && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminarHallazgoEspecifico(h.id);
                    }}
                    className="ml-0.5 w-4 h-4 rounded-full hover:bg-rose-500/20 text-zinc-500 hover:text-rose-300 text-[9px] flex items-center justify-center transition-all cursor-pointer"
                    title={`Eliminar solo Daño #${idx + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. CHIPS DE TIPO DE DAÑO (COMPACTOS Y RÁPIDOS) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {chipsTipos.map((chip) => {
          const sel = tiposSeleccionados.includes(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onToggleTipo(chip.id)}
              className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                sel
                  ? `${chip.color} ring-1 ring-white/30 font-bold shadow-sm scale-105`
                  : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {sel && <span className="text-[10px]">✓</span>}
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. BARRA MULTIMEDIA: INPUT + DICTAR AUDIO + ESCUCHAR AUDIO + CÁMARA */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Campo de texto de la observación */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={observacionTexto !== "" ? observacionTexto : (pin.descripcion || "")}
            onChange={(e) => onChangeObservacion(e.target.value)}
            placeholder={
              escuchandoVoz
                ? "🎙 Escuchando voz... habla ahora"
                : "Escribe o dicta la observación..."
            }
            className={`w-full h-9 pl-3 pr-2 rounded-xl bg-black/60 border text-white text-xs placeholder:text-zinc-500 transition-all focus:outline-none ${
              escuchandoVoz
                ? "border-rose-500 ring-2 ring-rose-500/30 placeholder:text-rose-400"
                : "border-white/10 focus:border-cyan-500/50"
            }`}
          />
        </div>

        {/* Botón Micrófono: Grabar / Dictar Voz a Texto */}
        <button
          type="button"
          onClick={onToggleVoz}
          className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 ${
            escuchandoVoz
              ? "bg-rose-500 text-white border-rose-400 animate-pulse shadow-md shadow-rose-500/50"
              : "bg-white/[0.04] hover:bg-white/[0.1] border-white/10 text-zinc-300 hover:text-white"
          }`}
          title={escuchandoVoz ? "Detener dictado" : "Dictar por voz (convierte audio a texto)"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v7.5a3 3 0 0 1-3 3Z" />
          </svg>
        </button>

        {/* Botón Altavoz: Escuchar en Voz Alta (Texto a Audio) */}
        <button
          type="button"
          onClick={() => onReproducirAudio(textoParaAudio)}
          className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 ${
            reproduciendoAudio
              ? "bg-emerald-500 text-white border-emerald-400 animate-pulse shadow-md shadow-emerald-500/50"
              : "bg-white/[0.04] hover:bg-white/[0.1] border-white/10 text-zinc-300 hover:text-white"
          }`}
          title={reproduciendoAudio ? "Detener reproducción" : "Escuchar observación en audio"}
        >
          {reproduciendoAudio ? (
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.08-1.64.222-2.426.234-.847 1.058-1.354 1.938-1.354h2.24Z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.08-1.64.222-2.426.234-.847 1.058-1.354 1.938-1.354h2.24Z" />
            </svg>
          )}
        </button>

        {/* Botón Cámara: Subir hasta 3 fotos con contador */}
        <label
          className={`h-9 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95 ${
            maxFotosAlcanzado
              ? "bg-white/[0.02] border-white/5 text-zinc-500 cursor-not-allowed"
              : "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-300"
          }`}
          title={maxFotosAlcanzado ? "Máximo 3 fotos subidas" : "Subir hasta 3 fotos de evidencia"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          <span className="text-[11px] font-mono font-bold">
            {subiendoFotos ? "..." : `${fotos.length}/3`}
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            disabled={maxFotosAlcanzado || subiendoFotos}
            onChange={onSubirFotos}
            className="hidden"
          />
        </label>
      </div>

      {/* 4. TIRA DE HASTA 3 FOTOS CON PREVIEW Y BOTÓN ELIMINAR ✕ */}
      {fotos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.05]">
          <span className="text-[10px] text-zinc-400 font-medium">Fotos:</span>
          {fotos.map((url, idx) => (
            <div
              key={idx}
              className="relative group w-11 h-11 rounded-lg overflow-hidden border border-white/20 shrink-0 bg-black shadow-sm"
            >
              <img src={url} alt={`Evidencia #${idx + 1}`} className="w-full h-full object-cover" />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                title="Ampliar foto"
              >
                <span className="text-[10px] text-white">🔍</span>
              </a>
              <button
                type="button"
                onClick={(e) => onEliminarFoto(idx, e)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center cursor-pointer shadow"
                title="Eliminar foto"
              >
                ✕
              </button>
            </div>
          ))}
          {pin.capturedAt && (
            <span className="text-[10px] text-zinc-500 font-mono ml-auto">
              {pin.capturedAt}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
