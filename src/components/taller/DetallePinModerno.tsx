"use client";

import React, { useState } from "react";
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

  const [mostrarDropdown, setMostrarDropdown] = useState(false);

  // Valor actual del daño / síntoma
  const tipoActual = pin.tipo || tipoSeleccionado || chipsTipos[0]?.label || "Rayón / Abolladura";

  return (
    <div className="mt-3 rounded-2xl bg-[#031525]/95 dark:bg-[#031525]/95 text-white border border-cyan-900/60 p-4 sm:p-5 shadow-2xl space-y-4 animate-fade-in font-sans">
      {/* Título de la tarjeta y botón cerrar / acciones rápidas */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span>Registrar daños y trabajos</span>
          <span className="w-5 h-5 rounded-full bg-cyan-600/60 text-cyan-200 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
            #{mismoNumero}
          </span>
        </h3>

        <div className="flex items-center gap-1.5 shrink-0">
          {onReubicarPin && (
            <button
              type="button"
              onClick={onReubicarPin}
              className="h-7 px-2 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-700/50 text-cyan-300 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              title={`Mover Pin #${mismoNumero}`}
            >
              <span>📍</span>
              <span className="hidden sm:inline">Mover</span>
            </button>
          )}

          <button
            type="button"
            onClick={onEliminarPin}
            className="h-7 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/50 text-rose-300 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            title={`Eliminar Pin #${mismoNumero}`}
          >
            <span>🗑️</span>
            <span className="hidden sm:inline">Borrar</span>
          </button>

          <button
            type="button"
            onClick={onCerrar}
            className="h-7 w-7 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-zinc-400 hover:text-white text-xs font-bold flex items-center justify-center transition-all cursor-pointer border border-cyan-800/40"
            title="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Navegación si hay varios daños en el mismo pin */}
      {listaMismoPin.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-cyan-900/40">
          <span className="text-[10px] text-cyan-400/80 font-medium shrink-0">Punto #{mismoNumero}:</span>
          {listaMismoPin.map((h, idx) => {
            const activo = h.id === pin.id;
            return (
              <div key={h.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => onSeleccionarHallazgoPin?.(h.id)}
                  className={`h-6 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    activo
                      ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-300 font-bold"
                      : "bg-[#062038] text-cyan-300 hover:bg-[#0b2d4e]"
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
                    className="ml-0.5 w-4 h-4 rounded-full hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 text-[9px] flex items-center justify-center transition-all cursor-pointer"
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
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#041c33] border border-cyan-800/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 0h17.25m-17.25 0 2.25-6.75h12.75l2.25 6.75" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-200">Zona seleccionada</span>
          <span className="rounded-full bg-cyan-600/30 border border-cyan-500/40 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
            {pin.zona || pin.vistaLabel || pin.vista}
          </span>
        </div>
        <span className="text-zinc-400 text-sm font-bold">{">"}</span>
      </div>

      {/* 2. SECCIÓN DAÑO / SÍNTOMA (DROPDOWN ESTILO IMAGEN + CHIPS RÁPIDOS) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-300">Daño / Síntoma</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMostrarDropdown(!mostrarDropdown)}
            className="w-full flex items-center justify-between rounded-xl bg-[#041c33] border border-cyan-800/50 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-200 hover:border-cyan-500 transition-colors cursor-pointer"
          >
            <span className="font-medium truncate">{tipoActual}</span>
            <svg
              className={`w-4 h-4 text-cyan-400 transition-transform ${mostrarDropdown ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Menú desplegable */}
          {mostrarDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl bg-[#041c33] border border-cyan-700 shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto no-scrollbar">
              {chipsTipos.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    onToggleTipo(chip.id);
                    setMostrarDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    tipoActual === chip.id
                      ? "bg-cyan-600/30 text-cyan-300 font-bold"
                      : "text-zinc-200 hover:bg-[#08294a]"
                  }`}
                >
                  <span>{chip.label}</span>
                  {tipoActual === chip.id && <span className="text-cyan-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. SECCIÓN DESCRIPCIÓN DEL TRABAJO */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-zinc-300">Descripción del trabajo</label>
          {textoActual.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeObservacion("")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
        <textarea
          rows={2}
          value={textoActual}
          onChange={(e) => onChangeObservacion(e.target.value)}
          placeholder="Reparar rayón en parachoques delantero y pintura..."
          className="w-full rounded-xl bg-[#041c33] border border-cyan-800/50 px-3.5 py-2.5 text-zinc-100 text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
        />
      </div>

      {/* 4. BOTONERA DE MULTIMEDIA Y CAROUSEL DE FOTOS CON + AGREGAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {/* Botón Tomar foto */}
        <label
          className={`h-20 w-20 rounded-xl border flex flex-col items-center justify-center gap-1 shrink-0 transition-all cursor-pointer ${
            maxFotosAlcanzado || subiendoFotos
              ? "bg-[#041c33]/50 border-cyan-900/40 text-zinc-500 cursor-not-allowed"
              : "bg-[#041c33] hover:bg-[#072a4c] border-cyan-700/60 text-cyan-300 active:scale-95"
          }`}
        >
          <div className="text-cyan-400 text-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-center leading-tight">Tomar foto</span>
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

        {/* Botón Seleccionar foto */}
        <label
          className={`h-20 w-20 rounded-xl border flex flex-col items-center justify-center gap-1 shrink-0 transition-all cursor-pointer ${
            maxFotosAlcanzado || subiendoFotos
              ? "bg-[#041c33]/50 border-cyan-900/40 text-zinc-500 cursor-not-allowed"
              : "bg-[#041c33] hover:bg-[#072a4c] border-cyan-700/60 text-cyan-300 active:scale-95"
          }`}
        >
          <div className="text-cyan-400 text-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-center leading-tight">Seleccionar foto</span>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={maxFotosAlcanzado || subiendoFotos}
            onChange={onSubirFotos}
            className="hidden"
          />
        </label>

        {/* Botón Grabar video / Grabar voz */}
        <button
          type="button"
          onClick={onToggleVoz}
          className={`h-20 w-20 rounded-xl border flex flex-col items-center justify-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95 ${
            escuchandoVoz
              ? "bg-rose-900/60 border-rose-500 text-rose-300 animate-pulse"
              : "bg-[#041c33] hover:bg-[#072a4c] border-cyan-700/60 text-cyan-300"
          }`}
        >
          <div className={escuchandoVoz ? "text-rose-400" : "text-cyan-400"}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <span className="text-[10px] font-semibold text-center leading-tight">
            {escuchandoVoz ? "Grabando..." : "Grabar video"}
          </span>
        </button>

        {/* Miniaturas de fotos cargadas con botón de quitar (x) */}
        {fotos.map((url, idx) => (
          <div
            key={idx}
            className="relative h-20 w-20 rounded-xl overflow-hidden border border-cyan-700/60 shrink-0 bg-black shadow-md group"
          >
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
            <button
              type="button"
              onClick={(e) => onEliminarFoto(idx, e)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer shadow border border-white/20"
              title="Eliminar foto"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Botón + Agregar foto */}
        {!maxFotosAlcanzado && (
          <label
            className="h-20 w-20 rounded-xl border border-dashed border-cyan-700/70 bg-[#041c33]/40 hover:bg-[#072a4c] flex flex-col items-center justify-center gap-1 shrink-0 text-cyan-400 transition-all cursor-pointer active:scale-95"
          >
            <span className="text-xl font-light">+</span>
            <span className="text-[10px] font-semibold">Agregar</span>
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={subiendoFotos}
              onChange={onSubirFotos}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* 5. SECCIÓN OBSERVACIONES ADICIONALES (OPCIONAL) CON CONTADOR 0/500 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-zinc-300">
          Observaciones adicionales <span className="text-zinc-500 font-normal">(opcional)</span>
        </label>
        <div className="relative">
          <textarea
            rows={2}
            maxLength={500}
            value={textoActual}
            onChange={(e) => onChangeObservacion(e.target.value)}
            placeholder="Ej. color, pieza, tiempo estimado..."
            className="w-full rounded-xl bg-[#041c33] border border-cyan-800/50 px-3.5 py-2.5 pb-6 text-zinc-100 text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
          />
          <span className="absolute bottom-1.5 right-3 text-[10px] font-mono text-zinc-500">
            {textoActual.length}/500
          </span>
        </div>
      </div>

      {/* Botones auxiliares de voz / TTS */}
      <div className="flex items-center justify-between pt-1 border-t border-cyan-900/40">
        <button
          type="button"
          onClick={() => onReproducirAudio(textoParaAudio)}
          className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            reproduciendoAudio
              ? "bg-emerald-500 text-black border-emerald-300 animate-pulse"
              : "bg-cyan-950/60 border-cyan-800/50 text-cyan-300 hover:bg-cyan-900/60"
          }`}
        >
          <span>🔊</span>
          <span>{reproduciendoAudio ? "Sonando..." : "Escuchar audio"}</span>
        </button>

        {subiendoFotos && (
          <span className="text-xs font-semibold text-cyan-300 animate-pulse">
            Subiendo fotos...
          </span>
        )}
      </div>
    </div>
  );
}
