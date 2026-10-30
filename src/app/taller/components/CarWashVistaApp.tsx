"use client";

import React, { useMemo, useRef } from "react";

// ============================================================================
// VISTA "APP" DE CAR WASH (se activa/desactiva con el botón engranaje)
// Diseño oscuro tipo aplicación móvil: héroe con vehículo detectado,
// inspección con interruptores, combos rápidos y carrusel de servicios.
// ============================================================================

export type NivelAfeccionApp = "NORMAL" | "MODERADO" | "EXTREMO";

export interface CarWashAppItem {
  id: string;
  kind: "SERVICE" | "PRODUCT" | "PACKAGE" | "ADDON";
  name: string;
  code: string;
  price: number;
  durationMinutes?: number;
  keyword: string;
  itemIcon: string;
  imageUrl?: string;
  brand?: string;
}

export interface CarWashAppCombo {
  id: string;
  label: string;
  keywords: string[];
}

export interface CarWashVistaAppProps {
  vehiculoLabel: string;
  vehiculoIcon: string;
  minutos: number;
  estadoAfecciones: Record<string, NivelAfeccionApp>;
  objetosVerificados: boolean;
  fotosEstado: string[];
  subiendoFoto: boolean;
  combos: CarWashAppCombo[];
  comboSeleccionado: string;
  items: CarWashAppItem[];
  totalUnidades: number;
  totalMonto: number;
  obtenerCantidad: (item: CarWashAppItem) => number;
  onAjustarItem: (item: CarWashAppItem, delta: number) => void;
  onCiclarAfeccion: (clave: string) => void;
  onToggleObjetos: () => void;
  onSubirFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAplicarCombo: (combo: CarWashAppCombo) => void;
  onAbrirConfig: () => void;
  onSiguiente: () => void;
}

const colorNivel = (nivel: NivelAfeccionApp) =>
  nivel === "EXTREMO"
    ? { dot: "bg-rose-500", glow: "shadow-[0_0_14px_4px_rgba(244,63,94,0.55)]", text: "text-rose-400", track: "bg-rose-500" }
    : nivel === "MODERADO"
    ? { dot: "bg-amber-400", glow: "shadow-[0_0_14px_4px_rgba(251,191,36,0.55)]", text: "text-amber-300", track: "bg-amber-400" }
    : { dot: "bg-teal-400", glow: "shadow-[0_0_14px_4px_rgba(45,212,191,0.55)]", text: "text-zinc-400", track: "bg-zinc-600" };

const textoNivel = (nivel: NivelAfeccionApp) =>
  nivel === "EXTREMO" ? "Extremo" : nivel === "MODERADO" ? "Moderado" : "Normal";

// Ilustración SVG de SUV blanca (vista 3/4) para la tarjeta principal
function SuvIlustracion() {
  return (
    <svg viewBox="0 0 400 200" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="cwSuvBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e5e9ef" />
          <stop offset="100%" stopColor="#b8c0cc" />
        </linearGradient>
        <linearGradient id="cwSuvGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="cwSuvShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="172" rx="175" ry="16" fill="url(#cwSuvShadow)" />
      {/* Carrocería */}
      <path
        d="M40 140 L44 112 Q50 98 70 94 L118 88 L150 58 Q160 50 178 49 L292 49 Q312 50 324 62 L348 90 Q368 94 372 108 L376 138 Q376 150 364 152 L40 152 Q34 150 40 140 Z"
        fill="url(#cwSuvBody)"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />
      {/* Ventanas */}
      <path d="M128 90 L156 62 Q163 57 176 57 L226 57 L226 90 Z" fill="url(#cwSuvGlass)" />
      <path d="M234 57 L288 57 Q302 58 312 68 L332 90 L234 90 Z" fill="url(#cwSuvGlass)" />
      <rect x="226" y="57" width="8" height="33" fill="#cbd5e1" />
      {/* Línea de puertas y manijas */}
      <path d="M230 92 L230 146" stroke="#94a3b8" strokeWidth="1" />
      <path d="M150 94 L148 146" stroke="#94a3b8" strokeWidth="1" />
      <rect x="196" y="102" width="16" height="3" rx="1.5" fill="#94a3b8" />
      <rect x="276" y="102" width="16" height="3" rx="1.5" fill="#94a3b8" />
      {/* Faros y parrilla */}
      <path d="M46 110 Q58 104 84 103 L82 112 Q60 114 46 118 Z" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1" />
      <rect x="40" y="122" width="34" height="12" rx="4" fill="#1e293b" />
      <path d="M362 104 L372 106 L374 118 L360 116 Z" fill="#fb7185" />
      {/* Ruedas */}
      {[100, 306].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="150" r="27" fill="#0f172a" />
          <circle cx={cx} cy="150" r="17" fill="#cbd5e1" />
          <circle cx={cx} cy="150" r="6" fill="#475569" />
          {[0, 72, 144, 216, 288].map((a) => (
            <rect
              key={a}
              x={cx - 1.6}
              y={136}
              width="3.2"
              height="11"
              rx="1.5"
              fill="#64748b"
              transform={`rotate(${a} ${cx} 150)`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export default function CarWashVistaApp(props: CarWashVistaAppProps) {
  const {
    vehiculoLabel,
    vehiculoIcon,
    minutos,
    estadoAfecciones,
    objetosVerificados,
    fotosEstado,
    subiendoFoto,
    combos,
    comboSeleccionado,
    items,
    totalUnidades,
    totalMonto,
    obtenerCantidad,
    onAjustarItem,
    onCiclarAfeccion,
    onToggleObjetos,
    onSubirFoto,
    onAplicarCombo,
    onAbrirConfig,
    onSiguiente,
  } = props;

  const fileRef = useRef<HTMLInputElement>(null);

  // Precio de cada combo = suma de los servicios que incluye
  const combosConPrecio = useMemo(
    () =>
      combos.map((c) => ({
        ...c,
        precio: c.keywords.reduce((acc, kw) => acc + (items.find((it) => it.keyword === kw)?.price || 0), 0),
      })),
    [combos, items]
  );

  const lodo = estadoAfecciones.Lodo || "NORMAL";
  const pelos = estadoAfecciones.Pelos || "NORMAL";
  const manchas = estadoAfecciones.Manchas || "NORMAL";

  // Puntos interactivos sobre el vehículo
  const hotspots: Array<{ clave: string; nivel: NivelAfeccionApp; pos: string }> = [
    { clave: "Lodo", nivel: lodo, pos: "left-[24%] top-[74%]" },
    { clave: "Manchas", nivel: manchas, pos: "left-[52%] top-[56%]" },
    { clave: "Pelos", nivel: pelos, pos: "left-[66%] top-[36%]" },
    { clave: "Gotaseca", nivel: estadoAfecciones.Gotaseca || "NORMAL", pos: "left-[40%] top-[32%]" },
  ];

  const filasInspeccion: Array<{ clave: string; label: string; nivel: NivelAfeccionApp }> = [
    { clave: "Lodo", label: "Lodo", nivel: lodo },
    { clave: "Pelos", label: "Pelos", nivel: pelos },
  ];

  return (
    <div className="w-full pb-28 animate-fade-in">
      <div className="rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#0f1a2b] via-[#0b1322] to-[#070b14] text-white shadow-2xl">
        {/* Cabecera tipo app */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5">
          <button
            type="button"
            onClick={onAbrirConfig}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-300 hover:bg-white/10 cursor-pointer transition-all"
            title="Configuración de Car Wash"
            aria-label="Abrir configuración de Car Wash"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 7h16M4 12h10M4 17h16" />
            </svg>
          </button>
          <span className="text-sm sm:text-base font-semibold tracking-wide">Carwash</span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-300 relative">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-3 sm:p-5">
          {/* ───────── COLUMNA IZQUIERDA: Héroe + Inspección ───────── */}
          <div className="space-y-4">
            <div className="relative rounded-3xl border border-teal-400/20 bg-gradient-to-br from-[#12324a]/70 via-[#0d1f33] to-[#0a1424] p-4 sm:p-5 overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-teal-300 flex items-center gap-2">
                <span>{vehiculoIcon}</span>
                <span>{vehiculoLabel.toUpperCase()} DETECTADO</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-0.5">Tarifa {vehiculoLabel} auto-ajustada</p>

              <div className="relative mt-2 h-40 sm:h-52">
                <SuvIlustracion />
                {hotspots.map((h) => {
                  const c = colorNivel(h.nivel);
                  return (
                    <button
                      key={h.clave}
                      type="button"
                      onClick={() => onCiclarAfeccion(h.clave)}
                      className={`absolute ${h.pos} -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${c.dot} ${c.glow} ring-2 ring-white/70 cursor-pointer active:scale-90 transition-all`}
                      title={`${h.clave}: ${textoNivel(h.nivel)} (toca para cambiar)`}
                      aria-label={`${h.clave}: ${textoNivel(h.nivel)}`}
                    />
                  );
                })}
              </div>

              <div className="flex justify-end">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-semibold">
                  ⏱️ {minutos > 0 ? minutos : 35} min
                </span>
              </div>
            </div>

            {/* Inspección */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm sm:text-base font-bold">Inspección</h3>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-zinc-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                  title="Tomar foto del estado"
                >
                  {subiendoFoto ? "⏳" : "📷"} <span>›</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onSubirFoto} />
              </div>
              <div className="flex items-stretch rounded-2xl border border-white/10 bg-white/[0.04] divide-x divide-white/10 overflow-hidden">
                {filasInspeccion.map((f) => {
                  const c = colorNivel(f.nivel);
                  const activo = f.nivel !== "NORMAL";
                  return (
                    <button
                      key={f.clave}
                      type="button"
                      onClick={() => onCiclarAfeccion(f.clave)}
                      className="flex-1 min-w-0 px-3 py-2.5 text-left cursor-pointer hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold">{f.label}</span>
                        <span className={`relative w-8 h-4.5 h-[18px] rounded-full transition-all ${activo ? c.track : "bg-zinc-600"}`}>
                          <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${activo ? "left-4" : "left-0.5"}`} />
                        </span>
                      </div>
                      <span className={`text-[11px] font-semibold ${c.text}`}>
                        {textoNivel(f.nivel)}
                        {f.nivel === "EXTREMO" ? " · Recargo" : ""}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={onToggleObjetos}
                  className="flex-1 min-w-0 px-3 py-2.5 text-left cursor-pointer hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold">Objetos</span>
                    <span className={`relative w-8 h-[18px] rounded-full transition-all ${objetosVerificados ? "bg-emerald-500" : "bg-zinc-600"}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${objetosVerificados ? "left-4" : "left-0.5"}`} />
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold ${objetosVerificados ? "text-emerald-400" : "text-zinc-400"}`}>
                    {objetosVerificados ? "Verificado" : "Pendiente"}
                  </span>
                </button>
                {fotosEstado.length > 0 && (
                  <div className="w-16 shrink-0 bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotosEstado[fotosEstado.length - 1]} alt="Estado del vehículo" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ───────── COLUMNA DERECHA: Combos + Servicios ───────── */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm sm:text-base font-bold">Combos Rápidos</h3>
                <span className="text-xs text-zinc-400 lg:hidden">Desliza ›</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap [scrollbar-width:none]">
                {combosConPrecio.map((c) => {
                  const activo = comboSeleccionado === c.label;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onAplicarCombo(c)}
                      className={`shrink-0 h-10 px-4 rounded-full border text-sm font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                        activo
                          ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
                          : "border-white/15 bg-white/[0.05] text-zinc-200 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-amber-300">⚡</span>
                      <span>{c.label}</span>
                      <span className="opacity-90">${c.precio.toFixed(0)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold mb-2 px-1">Servicios</h3>
              <div className="flex gap-2.5 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible [scrollbar-width:none]">
                {items.map((item) => {
                  const cant = obtenerCantidad(item);
                  const enPedido = cant > 0;
                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onAjustarItem(item, 1)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onAjustarItem(item, 1);
                      }}
                      className={`relative shrink-0 w-[104px] lg:w-auto min-h-[120px] rounded-2xl border p-2.5 flex flex-col items-center justify-center text-center gap-1 cursor-pointer select-none active:scale-95 transition-all ${
                        enPedido
                          ? "border-teal-300 bg-teal-400/10 shadow-[0_0_16px_rgba(45,212,191,0.35)]"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                      }`}
                    >
                      {enPedido && (
                        <>
                          <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-teal-400 text-[#06212a] text-[11px] font-black flex items-center justify-center shadow">
                            +{cant}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAjustarItem(item, -1);
                            }}
                            className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/50 border border-white/20 text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-rose-500/70"
                            aria-label="Restar 1"
                          >
                            −
                          </button>
                        </>
                      )}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.keyword} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-2xl leading-none">{item.itemIcon}</span>
                        )}
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold leading-tight line-clamp-2 capitalize">
                        {item.keyword.toLowerCase()}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">(${item.price.toFixed(2)})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra inferior fija estilo app */}
      <div className="fixed inset-x-3 bottom-3 z-30 sm:inset-x-4 sm:max-w-6xl sm:mx-auto rounded-2xl border border-teal-400/30 bg-gradient-to-r from-[#0e2a3a]/95 via-[#132a44]/95 to-[#2a1f4a]/95 backdrop-blur-md shadow-2xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 text-white">
        <div className="min-w-0 leading-tight">
          <p className="text-sm sm:text-base font-semibold truncate">
            {totalUnidades} {totalUnidades === 1 ? "Servicio" : "Servicios"} • Total: <span className="font-black">${totalMonto.toFixed(2)}</span>
          </p>
          <p className="text-xs text-zinc-300">⏱️ {minutos > 0 ? minutos : 35}m</p>
        </div>
        <button
          type="button"
          onClick={onSiguiente}
          className="h-11 px-5 sm:px-7 rounded-full bg-sky-400 hover:bg-sky-300 text-[#04202c] text-sm font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-[0_0_18px_rgba(56,189,248,0.45)]"
        >
          <span>Siguiente</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

