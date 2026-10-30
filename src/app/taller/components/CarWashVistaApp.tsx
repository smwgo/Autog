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
  obtenerCantidad: (item: CarWashAppItem) => number;
  onAjustarItem: (item: CarWashAppItem, delta: number) => void;
  onCiclarAfeccion: (clave: string) => void;
  onToggleObjetos: () => void;
  onSubirFoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAplicarCombo: (combo: CarWashAppCombo) => void;
  onAbrirConfig: () => void;
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
    obtenerCantidad,
    onAjustarItem,
    onCiclarAfeccion,
    onToggleObjetos,
    onSubirFoto,
    onAplicarCombo,
    onAbrirConfig,
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
    <div className="w-full animate-fade-in pb-24">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xs dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 dark:border-white/5 sm:px-6">
          <button
            type="button"
            onClick={onAbrirConfig}
            className="flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
            title="Configuración de Car Wash"
            aria-label="Abrir configuración de Car Wash"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Ajustes</span>
          </button>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-300">
            Recepción rápida
          </span>
        </div>

        <div className="space-y-4 p-3 sm:space-y-5 sm:p-4">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-teal-700 dark:text-teal-300 sm:text-2xl">
                  <span>{vehiculoIcon}</span>
                  <span>{vehiculoLabel.toUpperCase()} DETECTADO</span>
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                  Tarifa para {vehiculoLabel.toLowerCase()} autoajustada
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200">
                ⏱️ {minutos > 0 ? minutos : 35} min
              </span>
            </div>

            <div className="relative mx-auto mt-3 h-40 max-w-2xl overflow-hidden rounded-xl border border-teal-200/70 bg-teal-50/60 dark:border-teal-400/20 dark:bg-teal-500/[0.04] sm:h-52">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage: "radial-gradient(#5eead4 0.8px, transparent 0.8px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <SuvIlustracion />
              {hotspots.map((h) => {
                const c = colorNivel(h.nivel);
                return (
                  <button
                    key={h.clave}
                    type="button"
                    onClick={() => onCiclarAfeccion(h.clave)}
                    className={`absolute ${h.pos} -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full ${c.dot} ${c.glow} ring-2 ring-white/70 transition-all hover:scale-110 active:scale-90`}
                    title={`${h.clave}: ${textoNivel(h.nivel)} (toca para cambiar)`}
                    aria-label={`${h.clave}: ${textoNivel(h.nivel)}`}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white sm:text-base">Inspección</h3>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 text-xs text-zinc-500 transition hover:text-teal-700 dark:text-zinc-400 dark:hover:text-teal-300"
                title="Tomar foto del estado"
              >
                {subiendoFoto ? "⏳ Subiendo" : "📷 Foto"} <span>›</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onSubirFoto} />
            </div>
            <div className="flex items-stretch overflow-hidden rounded-2xl border border-zinc-200/90 bg-white divide-x divide-zinc-200 dark:border-white/10 dark:bg-white/[0.03] dark:divide-white/10">
              {filasInspeccion.map((f) => {
                const c = colorNivel(f.nivel);
                const activo = f.nivel !== "NORMAL";
                return (
                  <button
                    key={f.clave}
                    type="button"
                    onClick={() => onCiclarAfeccion(f.clave)}
                    className="min-w-0 flex-1 cursor-pointer px-2.5 py-2.5 text-left text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5 sm:px-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold sm:text-sm">{f.label}</span>
                      <span className={`relative h-[18px] w-8 rounded-full transition-all ${activo ? c.track : "bg-zinc-300 dark:bg-zinc-600"}`}>
                        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${activo ? "left-4" : "left-0.5"}`} />
                      </span>
                    </div>
                    <span className={`text-[10px] font-semibold sm:text-[11px] ${f.nivel === "NORMAL" ? "text-zinc-500 dark:text-zinc-400" : c.text}`}>
                      {textoNivel(f.nivel)}
                      {f.nivel === "EXTREMO" ? " · Recargo" : ""}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onToggleObjetos}
                className="min-w-0 flex-1 cursor-pointer px-2.5 py-2.5 text-left text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5 sm:px-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold sm:text-sm">Objetos</span>
                  <span className={`relative h-[18px] w-8 rounded-full transition-all ${objetosVerificados ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`}>
                    <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${objetosVerificados ? "left-4" : "left-0.5"}`} />
                  </span>
                </div>
                <span className={`text-[10px] font-semibold sm:text-[11px] ${objetosVerificados ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {objetosVerificados ? "Verificado" : "Pendiente"}
                </span>
              </button>
              {fotosEstado.length > 0 && (
                <div className="hidden w-16 shrink-0 bg-zinc-100 dark:bg-black/30 sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotosEstado[fotosEstado.length - 1]} alt="Estado del vehículo" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white sm:text-base">Combos Rápidos</h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 lg:hidden">Desliza ›</span>
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
                          ? "border-teal-300 bg-teal-50 text-teal-800 shadow-sm dark:border-teal-400 dark:bg-teal-500/15 dark:text-teal-200"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
                      }`}
                    >
                      <span className="text-amber-500 dark:text-amber-300">⚡</span>
                      <span>{c.label}</span>
                      <span className="opacity-90">${c.precio.toFixed(0)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 px-1 text-sm font-bold text-zinc-900 dark:text-white sm:text-base">Servicios</h3>
              <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none]">
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
                      className={`relative flex min-h-[120px] w-[116px] shrink-0 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 text-center transition-all active:scale-95 ${
                        enPedido
                          ? "border-teal-300 bg-teal-50 shadow-sm dark:border-teal-400 dark:bg-teal-400/10"
                          : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                      }`}
                    >
                      {enPedido && (
                        <>
                          <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-teal-500 text-white text-[11px] font-black flex items-center justify-center shadow">
                            +{cant}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAjustarItem(item, -1);
                            }}
                            className="absolute top-1 left-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-xs font-bold text-zinc-600 hover:bg-rose-500 hover:text-white dark:border-white/20 dark:bg-black/50 dark:text-white dark:hover:bg-rose-500/70"
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
                      <span className="line-clamp-2 text-[11px] font-bold leading-tight text-zinc-800 capitalize dark:text-zinc-100 sm:text-xs">
                        {item.keyword.toLowerCase()}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">(${item.price.toFixed(2)})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
