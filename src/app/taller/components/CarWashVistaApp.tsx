"use client";

import React, { useMemo, useRef } from "react";

// ============================================================================
// VISTA "APP" DE CAR WASH (Diseño idéntico a la app móvil del usuario)
// Vehículo SUV 3D con hotspots luminosos, inspección con interruptores
// dinámicos (Lodo Extremo, Pelos, Objetos Verificados, Cámara directa),
// combos rápidos con selección activa y brillo neón, grilla de servicios
// con contador (+1) y dock inferior con Total y botón Siguiente.
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
  totalServiciosCount?: number;
  totalPrecio?: number;
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
  onContinuar?: () => void;
  onIrAAnterior?: () => void;
}

// Ilustración SUV 3D estilizada en perspectiva isométrica 3/4
function Suv3DIlustracion() {
  return (
    <svg viewBox="0 0 500 260" className="w-full h-full drop-shadow-2xl" aria-hidden="true">
      <defs>
        <radialGradient id="suvGroundShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#000000" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="suvPaintWhite" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f1f5f9" />
          <stop offset="85%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="suvRoofShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="suvTintGlass" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="60%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="suvGrille" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Sombra de suelo */}
      <ellipse cx="250" cy="225" rx="210" ry="22" fill="url(#suvGroundShadow)" />

      {/* Carrocería principal 3D (Blanca perla) */}
      <g id="suvBody">
        {/* Guardabarros y paneles inferiores */}
        <path
          d="M80 180 L88 152 Q94 134 116 128 L170 118 L212 78 Q226 64 250 62 L390 62 Q418 64 434 82 L460 118 Q480 124 484 140 L486 178 Q484 195 464 198 L80 198 Q72 195 80 180 Z"
          fill="url(#suvPaintWhite)"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />

        {/* Techo corredizo / Panorámico */}
        <path
          d="M242 70 L370 70 Q378 72 376 78 L238 78 Q234 72 242 70 Z"
          fill="#0f172a"
          stroke="#475569"
          strokeWidth="1"
        />

        {/* Parabrisas delantero (vista ángulo) */}
        <path
          d="M178 118 L216 80 Q226 72 242 72 L306 72 L306 118 Z"
          fill="url(#suvTintGlass)"
          stroke="#64748b"
          strokeWidth="1"
        />

        {/* Ventanillas laterales */}
        <path
          d="M316 72 L388 72 Q406 74 418 88 L440 118 L316 118 Z"
          fill="url(#suvTintGlass)"
          stroke="#64748b"
          strokeWidth="1"
        />

        {/* Parantes de puertas */}
        <rect x="306" y="72" width="10" height="46" fill="#cbd5e1" />
        <line x1="311" y1="118" x2="311" y2="190" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="210" y1="120" x2="210" y2="190" stroke="#94a3b8" strokeWidth="1.5" />

        {/* Manijas de puertas */}
        <rect x="260" y="132" width="22" height="4" rx="2" fill="#64748b" />
        <rect x="362" y="132" width="22" height="4" rx="2" fill="#64748b" />

        {/* Capó y faro delantero */}
        <path
          d="M84 148 Q100 138 132 135 L130 148 Q98 152 84 158 Z"
          fill="#e0f2fe"
          stroke="#38bdf8"
          strokeWidth="1.5"
        />
        {/* Luz xenón encendida suave */}
        <ellipse cx="98" cy="148" rx="8" ry="4" fill="#ffffff" />

        {/* Parrilla delantera */}
        <rect x="76" y="162" width="46" height="18" rx="6" fill="url(#suvGrille)" stroke="#475569" strokeWidth="1" />
        <line x1="88" y1="164" x2="88" y2="178" stroke="#64748b" strokeWidth="1.5" />
        <line x1="99" y1="164" x2="99" y2="178" stroke="#64748b" strokeWidth="1.5" />
        <line x1="110" y1="164" x2="110" y2="178" stroke="#64748b" strokeWidth="1.5" />

        {/* Faro trasero */}
        <path d="M468 138 L482 140 L484 156 L466 154 Z" fill="#fb7185" stroke="#e11d48" strokeWidth="1" />

        {/* Moldura inferior protectora (estilo SUV offroad) */}
        <path d="M185 188 L370 188 L370 196 L185 196 Z" fill="#334155" />
      </g>

      {/* Ruedas y rines aleación */}
      {[145, 410].map((cx) => (
        <g key={cx}>
          {/* Neumático */}
          <circle cx={cx} cy="195" r="36" fill="#090d16" stroke="#1e293b" strokeWidth="3" />
          {/* Rin de aleación */}
          <circle cx={cx} cy="195" r="22" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx={cx} cy="195" r="8" fill="#475569" />
          {/* Rayos del rin */}
          {[0, 60, 120, 180, 240, 300].map((ang) => (
            <rect
              key={ang}
              x={cx - 2}
              y={177}
              width="4"
              height="15"
              rx="2"
              fill="#64748b"
              transform={`rotate(${ang} ${cx} 195)`}
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
    totalServiciosCount = 0,
    totalPrecio = 0,
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
    onContinuar,
  } = props;

  const fileRef = useRef<HTMLInputElement>(null);

  // Precios calculados de los combos
  const combosConPrecio = useMemo(() => {
    return combos.map((c) => {
      const sumaKeywords = c.keywords.reduce((acc, kw) => {
        const itemMatch = items.find((it) => it.keyword === kw);
        return acc + (itemMatch ? itemMatch.price : 0);
      }, 0);
      // Precio base o suma
      const precioFinal =
        c.label.toLowerCase().includes("expr")
          ? Math.max(8, sumaKeywords || 8)
          : c.label.toLowerCase().includes("complet")
          ? Math.max(18, sumaKeywords || 18)
          : c.label.toLowerCase().includes("vip")
          ? Math.max(35, sumaKeywords || 35)
          : sumaKeywords || 15;

      return {
        ...c,
        precio: precioFinal,
      };
    });
  }, [combos, items]);

  const lodo = estadoAfecciones.Lodo || "NORMAL";
  const pelos = estadoAfecciones.Pelos || "NORMAL";

  // Hotspots interactivos sobre la carrocería del vehículo
  const hotspots: Array<{ clave: string; color: "orange" | "cyan"; pos: string }> = [
    { clave: "Lodo", color: "orange", pos: "left-[36%] top-[56%]" },
    { clave: "Manchas", color: "orange", pos: "left-[48%] top-[62%]" },
    { clave: "Gotaseca", color: "cyan", pos: "left-[60%] top-[38%]" },
    { clave: "Pelos", color: "cyan", pos: "left-[57%] top-[72%]" },
  ];

  // Servicios principales destacados (como en la captura del usuario)
  const serviciosDestacados = useMemo(() => {
    const list = [...items];
    // Asegurar los 5 servicios icónicos
    const findOrMock = (keyword: string, label: string, price: number, icon: string): CarWashAppItem => {
      const found = list.find((it) => it.keyword.toUpperCase() === keyword.toUpperCase());
      if (found) return found;
      return {
        id: `mock_${keyword.toLowerCase()}`,
        kind: "SERVICE",
        name: label,
        code: `CW-${keyword.substring(0, 3)}`,
        price,
        durationMinutes: 20,
        keyword,
        itemIcon: icon,
        brand: "Car Wash",
      };
    };

    const destacados: CarWashAppItem[] = [
      findOrMock("LAVADO", "Lavado", 8.0, "🚿"),
      findOrMock("CHASIS", "Chasis + Grafitado", 12.0, "🛞"),
      findOrMock("TAPICERÍA", "Tapicería", 25.0, "💺"),
      findOrMock("DETAILING", "Detailing", 15.0, "💎"),
      findOrMock("EXTRA", "Extra", 3.0, "🧴"),
    ];

    // Agregar el resto sin duplicar
    list.forEach((it) => {
      if (!destacados.some((d) => d.id === it.id || d.keyword === it.keyword)) {
        destacados.push(it);
      }
    });

    return destacados;
  }, [items]);

  // Total de servicios seleccionados en el carrito
  const totalCantidadSeleccionada = useMemo(() => {
    if (totalServiciosCount > 0) return totalServiciosCount;
    return serviciosDestacados.reduce((acc, it) => acc + obtenerCantidad(it), 0);
  }, [totalServiciosCount, serviciosDestacados, obtenerCantidad]);

  // Total en dólares acumulado
  const totalMontoCalculado = useMemo(() => {
    let base = totalPrecio;
    if (base <= 0) {
      base = serviciosDestacados.reduce((acc, it) => acc + obtenerCantidad(it) * it.price, 0);
    }
    // Si lodo está extremo, aplicar el recargo de $5
    if (lodo === "EXTREMO") base += 5;
    return base;
  }, [totalPrecio, serviciosDestacados, obtenerCantidad, lodo]);

  return (
    <div className="relative w-full min-h-[640px] bg-[#070b14] text-slate-100 rounded-3xl p-3 sm:p-5 shadow-2xl border border-slate-800/80 overflow-hidden font-sans">
      {/* Fondo con brillo ambiental azul y turquesa */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />

      {/* =====================================================================
          1. HEADER TIPO APP: HAMBURGUESA / CARWASH • LUBRICENTRO / CAMPANA
          ===================================================================== */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <button
          type="button"
          onClick={onAbrirConfig}
          className="h-9 w-9 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
          title="Ajustes de Car Wash"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide flex items-center gap-2">
          <span>Carwash</span>
          <span className="text-cyan-400">•</span>
          <span>Lubricentro</span>
        </h1>

        <button
          type="button"
          onClick={onAbrirConfig}
          className="relative h-9 w-9 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
          title="Notificaciones y Ajustes"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        </button>
      </header>

      {/* =====================================================================
          2. TARJETA HÉROE 3D: SUV DETECTADO + HOTSPOTS LUMINOSOS
          ===================================================================== */}
      <section className="mt-3 relative rounded-2xl bg-gradient-to-b from-[#0e172a] to-[#0a1120] border border-cyan-500/25 p-3.5 sm:p-4 shadow-xl overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-cyan-400 tracking-tight flex items-center gap-2">
              <span>{vehiculoIcon || "🚙"}</span>
              <span>{(vehiculoLabel || "SUV").toUpperCase()}</span>
            </h2>
          </div>
        </div>

        {/* Perspectiva 3D con hotspots interactivos */}
        <div className="relative w-full h-44 sm:h-56 mt-2 flex items-center justify-center overflow-hidden">
          <Suv3DIlustracion />

          {/* Hotspots luminosos interactivos */}
          {hotspots.map((h, idx) => {
            const isOrange = h.color === "orange";
            return (
              <button
                key={`${h.clave}-${idx}`}
                type="button"
                onClick={() => onCiclarAfeccion(h.clave)}
                className={`absolute ${h.pos} -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full transition-transform hover:scale-125 active:scale-90 cursor-pointer flex items-center justify-center z-10`}
                title={`${h.clave}: Toca para inspeccionar`}
              >
                {isOrange ? (
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
                  </span>
                ) : (
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-400 border-2 border-white shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
                  </span>
                )}
              </button>
            );
          })}

          {/* Badge de tiempo estimado (como en la foto del usuario) */}
          <div className="absolute right-2 bottom-2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-md backdrop-blur-md">
            <span>⏱️</span>
            <span>{minutos > 0 ? minutos : 35} min</span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. INSPECCIÓN (INTERRUPTORES LODO, PELOS, OBJETOS + FOTO DIRECTA)
          ===================================================================== */}
      <section className="mt-3.5">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <h3 className="text-sm font-bold text-slate-200">Inspección</h3>

          {/* Botón de cámara directa */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Tomar foto con la cámara"
          >
            <span>{subiendoFoto ? "⏳ Subiendo" : "📷"}</span>
            <span>›</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onSubirFoto}
          />
        </div>

        <div className="grid grid-cols-12 gap-2 p-2 rounded-2xl bg-[#0d1526] border border-slate-800/80 items-center">
          {/* Lodo: Interruptor */}
          <button
            type="button"
            onClick={() => onCiclarAfeccion("Lodo")}
            className="col-span-4 p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all text-left cursor-pointer active:scale-95"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-slate-300">Lodo</span>
              <span
                className={`relative h-4 w-7 rounded-full transition-colors ${
                  lodo === "EXTREMO" ? "bg-rose-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                    lodo === "EXTREMO" ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
            </div>
            <div className="mt-1">
              <span
                className={`text-[10px] font-bold ${
                  lodo === "EXTREMO" ? "text-rose-400" : "text-slate-400"
                }`}
              >
                {lodo === "EXTREMO" ? "Extremo (+ $5.00)" : "Normal"}
              </span>
            </div>
          </button>

          {/* Pelos: Interruptor */}
          <button
            type="button"
            onClick={() => onCiclarAfeccion("Pelos")}
            className="col-span-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all text-left cursor-pointer active:scale-95"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-slate-300">Pelos</span>
              <span
                className={`relative h-4 w-7 rounded-full transition-colors ${
                  pelos !== "NORMAL" ? "bg-amber-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                    pelos !== "NORMAL" ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
            </div>
            <div className="mt-1">
              <span
                className={`text-[10px] font-semibold ${
                  pelos !== "NORMAL" ? "text-amber-400" : "text-slate-400"
                }`}
              >
                {pelos !== "NORMAL" ? "Moderado" : "Normal"}
              </span>
            </div>
          </button>

          {/* Objetos: Interruptor */}
          <button
            type="button"
            onClick={onToggleObjetos}
            className="col-span-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all text-left cursor-pointer active:scale-95"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-slate-300">Objetos</span>
              <span
                className={`relative h-4 w-7 rounded-full transition-colors ${
                  objetosVerificados ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                    objetosVerificados ? "left-3.5" : "left-0.5"
                  }`}
                />
              </span>
            </div>
            <div className="mt-1">
              <span
                className={`text-[10px] font-bold ${
                  objetosVerificados ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {objetosVerificados ? "Verificado" : "Pendiente"}
              </span>
            </div>
          </button>

          {/* Miniatura de foto capturada */}
          <div
            onClick={() => fileRef.current?.click()}
            className="col-span-2 h-11 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center overflow-hidden cursor-pointer hover:border-cyan-400 transition-all"
            title="Tocar para tomar o cambiar foto"
          >
            {fotosEstado.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotosEstado[fotosEstado.length - 1]}
                alt="Foto inspección"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-slate-400">📷</span>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. COMBOS RÁPIDOS: EXPRÉS $8, COMPLETO $18, VIP $35
          ===================================================================== */}
      <section className="mt-4">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-sm font-bold text-slate-200">Combos</h3>
          <span className="text-xs text-slate-400 flex items-center gap-0.5">
            Swipe <span>›</span>
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {combosConPrecio.map((combo) => {
            const isActivo =
              comboSeleccionado.toLowerCase() === combo.label.toLowerCase();

            return (
              <button
                key={combo.id}
                type="button"
                onClick={() => onAplicarCombo(combo)}
                className={`shrink-0 h-10 px-4 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                  isActivo
                    ? "border-2 border-emerald-400 bg-emerald-500/20 text-white shadow-[0_0_18px_rgba(52,211,153,0.45)] ring-1 ring-emerald-400/50"
                    : "border border-slate-700/80 bg-[#0e1628] text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                <span className="text-amber-400">⚡</span>
                <span>{combo.label}</span>
                <span className="text-slate-200">${combo.precio.toFixed(0)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          5. GRILLA DE SERVICIOS: LAVADO, CHASIS, TAPICERÍA, DETAILING, EXTRA
          ===================================================================== */}
      <section className="mt-4 mb-24">
        <h3 className="text-sm font-bold text-slate-200 px-1 mb-2">Servicios</h3>

        <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none]">
          {serviciosDestacados.map((servicio) => {
            const cant = obtenerCantidad(servicio);
            const isSeleccionado = cant > 0;

            return (
              <div
                key={`${servicio.kind}-${servicio.id}`}
                role="button"
                tabIndex={0}
                onClick={() => onAjustarItem(servicio, 1)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAjustarItem(servicio, 1);
                }}
                className={`relative flex min-h-[118px] w-[114px] shrink-0 cursor-pointer select-none flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-center transition-all active:scale-95 ${
                  isSeleccionado
                    ? "border-2 border-cyan-400 bg-[#0f233a] shadow-[0_0_18px_rgba(34,211,238,0.3)] text-cyan-200"
                    : "border-slate-800 bg-[#0c1322] text-slate-300 hover:border-slate-600 hover:bg-[#111a2e]"
                }`}
              >
                {/* Badge de cantidad (+1) */}
                {isSeleccionado && (
                  <>
                    <span className="absolute -top-2 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-cyan-400 text-slate-950 text-[11px] font-black flex items-center justify-center shadow-md">
                      +{cant}
                    </span>

                    {/* Botón rápido para restar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAjustarItem(servicio, -1);
                      }}
                      className="absolute top-1 left-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-xs font-bold text-slate-300 hover:bg-rose-500 hover:text-white transition-colors"
                      title="Quitar uno"
                      aria-label="Restar 1"
                    >
                      −
                    </button>
                  </>
                )}

                {/* Icono del servicio */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl leading-none">
                  {servicio.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={servicio.imageUrl}
                      alt={servicio.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span>{servicio.itemIcon || "🧼"}</span>
                  )}
                </div>

                {/* Nombre */}
                <span className="line-clamp-2 text-[11px] font-bold leading-tight capitalize">
                  {servicio.name || servicio.keyword}
                </span>

                {/* Precio */}
                <span className="font-mono text-[11px] text-slate-400 font-semibold">
                  (${servicio.price.toFixed(2)})
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          6. DOCK INFERIOR FIJO: TOTAL SERVICIOS + TIEMPO + BOTÓN SIGUIENTE →
          ===================================================================== */}
      <div className="sticky bottom-0 inset-x-0 mt-4 rounded-2xl bg-[#0b1426]/95 backdrop-blur-xl border border-cyan-500/30 p-3 shadow-[0_-4px_25px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3 z-30">
        <div>
          <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <span>
              {totalCantidadSeleccionada} {totalCantidadSeleccionada === 1 ? "Servicio" : "Servicios"}
            </span>
            <span className="text-cyan-400">•</span>
            <span>Total: ${totalMontoCalculado.toFixed(2)}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
            <span>⏱️</span>
            <span>{minutos > 0 ? minutos : 35}m</span>
          </div>
        </div>

        {onContinuar && (
          <button
            type="button"
            onClick={onContinuar}
            className="h-10 sm:h-11 px-5 sm:px-6 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Siguiente</span>
            <span>→</span>
          </button>
        )}
      </div>
    </div>
  );
}
