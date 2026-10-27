"use client";

import React, { useState, useMemo } from "react";

export interface SubcategoriaConfig {
  id: string;
  label: string;
}

export interface PresetTaller {
  code: string;
  name: string;
  price: number;
  subCategory: string;
}

export interface CategoriaTallerConfig {
  id: string;
  title: string;
  shortName: string;
  icon: string;
  desc: string;
  subcategorias: SubcategoriaConfig[];
  presets: PresetTaller[];
}

export const CATEGORIAS_TALLER_MAESTRAS: CategoriaTallerConfig[] = [
  {
    id: "suspension",
    title: "Suspensión y Dirección",
    shortName: "Suspensión y Dirección",
    icon: "🔩",
    desc: "Amortiguadores, terminales, rótulas, bujes y cremalleras",
    subcategorias: [
      { id: "TODOS", label: "Todos" },
      { id: "Suspensión", label: "Suspensión" },
      { id: "Dirección", label: "Dirección" },
      { id: "Bujes", label: "Bujes" },
      { id: "Geometría", label: "Geometría" },
    ],
    presets: [
      { code: "SUS-001", name: "Cambio de amortiguadores delanteros (par)", price: 40.0, subCategory: "Suspensión" },
      { code: "SUS-002", name: "Cambio de amortiguadores posteriores (par)", price: 35.0, subCategory: "Suspensión" },
      { code: "SUS-003", name: "Cambio de terminales y rótulas de dirección", price: 30.0, subCategory: "Dirección" },
      { code: "SUS-004", name: "Cambio de bujes trapecio / barra estabilizadora", price: 35.0, subCategory: "Bujes" },
      { code: "SUS-005", name: "Reparación / Cambio cremallera de dirección", price: 80.0, subCategory: "Dirección" },
      { code: "SUS-006", name: "Alineación computarizada y balanceo por eje", price: 25.0, subCategory: "Geometría" },
    ],
  },
  {
    id: "electrico",
    title: "Sistema Eléctrico",
    shortName: "Sistema Eléctrico",
    icon: "⚡",
    desc: "Batería, alternador, arranque, cableado, luces y sensores",
    subcategorias: [
      { id: "TODOS", label: "Todos" },
      { id: "Batería", label: "Batería" },
      { id: "Carga", label: "Carga" },
      { id: "Arranque", label: "Arranque" },
      { id: "Cableado", label: "Cableado" },
      { id: "Sensores", label: "Sensores" },
      { id: "Iluminación", label: "Iluminación" },
    ],
    presets: [
      { code: "ELE-001", name: "Diagnóstico y cambio de batería", price: 12.0, subCategory: "Batería" },
      { code: "ELE-002", name: "Mantenimiento / Reparación de alternador", price: 45.0, subCategory: "Carga" },
      { code: "ELE-003", name: "Mantenimiento / Reparación motor de arranque", price: 45.0, subCategory: "Arranque" },
      { code: "ELE-004", name: "Reparación de cableado y cortocircuitos", price: 30.0, subCategory: "Cableado" },
      { code: "ELE-005", name: "Diagnóstico de sensores (Oxígeno, MAF, CKP)", price: 25.0, subCategory: "Sensores" },
      { code: "ELE-006", name: "Regulación y cambio de faros / focos LED", price: 15.0, subCategory: "Iluminación" },
    ],
  },
  {
    id: "transmision",
    title: "Transmisión y Embrague",
    shortName: "Transmisión y Embrague",
    icon: "🔄",
    desc: "Kit de embrague, caja mecánica, palieres y fluidos",
    subcategorias: [
      { id: "TODOS", label: "Todos" },
      { id: "Embrague", label: "Embrague" },
      { id: "Caja", label: "Caja" },
      { id: "Transmisión", label: "Transmisión" },
    ],
    presets: [
      { code: "TRA-001", name: "Cambio de kit de embrague (disco, plato, collarín)", price: 80.0, subCategory: "Embrague" },
      { code: "TRA-002", name: "Bajada y reparación de caja de cambios manual", price: 95.0, subCategory: "Caja" },
      { code: "TRA-003", name: "Cambio de guardapolvos y puntas de palier", price: 35.0, subCategory: "Transmisión" },
      { code: "TRA-004", name: "Cambio de bomba / bombín de embrague", price: 25.0, subCategory: "Embrague" },
    ],
  },
  {
    id: "aire",
    title: "Aire Acondicionado",
    shortName: "Aire Acondicionado",
    icon: "❄️",
    desc: "Carga de gas R134a, detección de fugas, compresor y filtros",
    subcategorias: [
      { id: "TODOS", label: "Todos" },
      { id: "Refrigeración", label: "Refrigeración" },
      { id: "Diagnóstico", label: "Diagnóstico" },
      { id: "Compresor", label: "Compresor" },
      { id: "Higienización", label: "Higienización" },
    ],
    presets: [
      { code: "AIR-001", name: "Carga de gas refrigerante R134a y aceite compresor", price: 35.0, subCategory: "Refrigeración" },
      { code: "AIR-002", name: "Detección de fugas con tinte UV y vacío", price: 20.0, subCategory: "Diagnóstico" },
      { code: "AIR-003", name: "Mantenimiento / Cambio de compresor de A/C", price: 60.0, subCategory: "Compresor" },
      { code: "AIR-004", name: "Limpieza y desinfección de evaporador y ductos", price: 25.0, subCategory: "Higienización" },
    ],
  },
  {
    id: "diagnostico",
    title: "Diagnóstico y Escáner",
    shortName: "Diagnóstico y Escáner",
    icon: "🔍",
    desc: "Escáner automotriz, diagnóstico computarizado y pruebas de compresión",
    subcategorias: [
      { id: "TODOS", label: "Todos" },
      { id: "Diagnóstico", label: "Diagnóstico" },
      { id: "Compresión", label: "Compresión" },
      { id: "Inspección", label: "Inspección" },
    ],
    presets: [
      { code: "DIA-001", name: "Escáner computarizado multi-marca", price: 20.0, subCategory: "Diagnóstico" },
      { code: "DIA-002", name: "Diagnóstico integral y reseteo de fallas", price: 18.0, subCategory: "Diagnóstico" },
      { code: "DIA-003", name: "Prueba de compresión de cilindros", price: 25.0, subCategory: "Compresión" },
      { code: "DIA-004", name: "Prueba de vacío del motor", price: 20.0, subCategory: "Diagnóstico" },
      { code: "DIA-005", name: "Inspección pre-compra completa", price: 30.0, subCategory: "Inspección" },
    ],
  },
  {
    id: "mantenimiento",
    title: "Mantenimiento y Afinamiento",
    shortName: "Mantenimiento y Afinamiento",
    icon: "🛠️",
    desc: "Afinamiento electrónico, inyectores, admisión, encendido y filtros",
    subcategorias: [
      { id: "TODOS", label: "Todos" },
      { id: "Afinamiento", label: "Afinamiento" },
      { id: "Inyección", label: "Inyección" },
      { id: "Admisión", label: "Admisión" },
      { id: "Encendido", label: "Encendido" },
      { id: "Preventivo", label: "Preventivo" },
      { id: "Filtros", label: "Filtros" },
    ],
    presets: [
      { code: "MAN-001", name: "Afinamiento electrónico general", price: 35.0, subCategory: "Afinamiento" },
      { code: "MAN-002", name: "Limpieza y calibración de inyectores por ultrasonido", price: 30.0, subCategory: "Inyección" },
      { code: "MAN-003", name: "Limpieza de cuerpo de aceleración y sensor MAF", price: 20.0, subCategory: "Admisión" },
      { code: "MAN-004", name: "Cambio de bujías y cables de alta", price: 18.0, subCategory: "Encendido" },
      { code: "MAN-005", name: "Mantenimiento preventivo por kilometraje", price: 40.0, subCategory: "Preventivo" },
      { code: "MAN-006", name: "Cambio de filtros de aire, cabina y combustible", price: 15.0, subCategory: "Filtros" },
    ],
  },
  {
    id: "frenos",
    title: "Frenos",
    shortName: "Frenos",
    icon: "🛑",
    desc: "Pastillas, discos, zapatas, purgado de líquido y calipers",
    subcategorias: [
      { id: "TODOS", label: "Todos" },
      { id: "Pastillas", label: "Pastillas" },
      { id: "Discos", label: "Discos" },
      { id: "Tambores", label: "Tambores" },
      { id: "Fluidos", label: "Fluidos" },
      { id: "Hidráulica", label: "Hidráulica" },
    ],
    presets: [
      { code: "FRE-001", name: "Cambio de pastillas de freno delanteras", price: 25.0, subCategory: "Pastillas" },
      { code: "FRE-002", name: "Rectificación de discos delanteros (par)", price: 30.0, subCategory: "Discos" },
      { code: "FRE-003", name: "Cambio de zapatas y rectificación de tambores", price: 28.0, subCategory: "Tambores" },
      { code: "FRE-004", name: "Purgado y cambio total de líquido de frenos DOT4", price: 18.0, subCategory: "Fluidos" },
      { code: "FRE-005", name: "Mantenimiento general de 4 ruedas y calipers", price: 45.0, subCategory: "Pastillas" },
      { code: "FRE-006", name: "Reparación o cambio de bombines y pistones caliper", price: 35.0, subCategory: "Hidráulica" },
    ],
  },
  {
    id: "motor",
    title: "Motor",
    shortName: "Motor",
    icon: "⚙️",
    desc: "Distribución, empaques, retenes, culata y refrigeración",
    subcategorias: [
      { id: "TODOS", label: "Todos" },
      { id: "Distribución", label: "Distribución" },
      { id: "Empaques", label: "Empaques" },
      { id: "Retenes", label: "Retenes" },
      { id: "Culata", label: "Culata" },
      { id: "Refrigeración", label: "Refrigeración" },
      { id: "Motor Mayor", label: "Motor Mayor" },
    ],
    presets: [
      { code: "MOT-001", name: "Cambio de faja / kit de distribución", price: 75.0, subCategory: "Distribución" },
      { code: "MOT-002", name: "Cambio de empaquetadura tapa válvulas", price: 30.0, subCategory: "Empaques" },
      { code: "MOT-003", name: "Cambio de retenes de cigüeñal y árbol levas", price: 40.0, subCategory: "Retenes" },
      { code: "MOT-004", name: "Reparación y cepillado de culata", price: 120.0, subCategory: "Culata" },
      { code: "MOT-005", name: "Cambio de bomba de agua y termostato", price: 45.0, subCategory: "Refrigeración" },
      { code: "MOT-006", name: "Reparación completa de motor (Overhaul)", price: 300.0, subCategory: "Motor Mayor" },
    ],
  },
];

export interface CatalogoCategoriasTallerProps {
  serviciosDb?: any[];
  ordenActiva?: any;
  onAgregarServicioAOrden?: (item: any) => void;
  onEliminarServicioDeOrden?: (codigoOId: string) => void;
  mostrarToast?: (msg: string, tipo?: "ok" | "err" | "info") => void;
  isModal?: boolean;
  onCloseModal?: () => void;
  vistaActiva?: "catalogo" | "inspeccion";
  onCambiarVista?: (vista: "catalogo" | "inspeccion") => void;
}

export default function CatalogoCategoriasTaller({
  serviciosDb = [],
  ordenActiva,
  onAgregarServicioAOrden,
  onEliminarServicioDeOrden,
  mostrarToast,
  isModal = false,
  onCloseModal,
  vistaActiva = "catalogo",
  onCambiarVista,
}: CatalogoCategoriasTallerProps) {
  const [categoriaSeleccionadaId, setCategoriaSeleccionadaId] = useState<string>("suspension");
  const [subcategoriaSeleccionadaId, setSubcategoriaSeleccionadaId] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  const categoriaActiva = useMemo(() => {
    return (
      CATEGORIAS_TALLER_MAESTRAS.find((c) => c.id === categoriaSeleccionadaId) ||
      CATEGORIAS_TALLER_MAESTRAS[0]
    );
  }, [categoriaSeleccionadaId]);

  const handleCambiarCategoria = (catId: string) => {
    setCategoriaSeleccionadaId(catId);
    setSubcategoriaSeleccionadaId("TODOS");
  };

  // Combinar presets maestros con servicios cargados desde la base de datos
  const todosLosServiciosDeCategoria = useMemo(() => {
    const base = [...categoriaActiva.presets];
    const codigosExistentes = new Set(base.map((b) => b.code));

    serviciosDb.forEach((s: any) => {
      const matchCat =
        !s.category ||
        s.category.toLowerCase().includes(categoriaActiva.id) ||
        s.category.toLowerCase().includes(categoriaActiva.title.toLowerCase()) ||
        s.category.toLowerCase().includes(categoriaActiva.shortName.toLowerCase());

      if (s.code && !codigosExistentes.has(s.code) && matchCat) {
        base.push({
          code: s.code,
          name: s.name || s.title || "Servicio",
          price: Number(s.price) || 20.0,
          subCategory: s.category || categoriaActiva.title,
        });
      }
    });

    return base;
  }, [categoriaActiva, serviciosDb]);

  // Conteos dinámicos por subcategoría
  const conteoPorSubcategoria = useMemo(() => {
    const mapa: Record<string, number> = { TODOS: todosLosServiciosDeCategoria.length };
    todosLosServiciosDeCategoria.forEach((it) => {
      const sub = it.subCategory || "General";
      mapa[sub] = (mapa[sub] || 0) + 1;
    });
    return mapa;
  }, [todosLosServiciosDeCategoria]);

  // Filtrado final: por subcategoría y por texto de búsqueda
  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return todosLosServiciosDeCategoria.filter((it) => {
      if (subcategoriaSeleccionadaId !== "TODOS") {
        const subIt = it.subCategory || "";
        if (subIt.toLowerCase() !== subcategoriaSeleccionadaId.toLowerCase()) {
          return false;
        }
      }
      if (q) {
        const match =
          it.code.toLowerCase().includes(q) ||
          it.name.toLowerCase().includes(q) ||
          (it.subCategory && it.subCategory.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [todosLosServiciosDeCategoria, subcategoriaSeleccionadaId, busqueda]);

  // Conteo de ítems en la orden activa
  const itemsEnOrden = ordenActiva?.items || [];
  const totalItemsEnOrden = itemsEnOrden.length;

  const handleToggleServicio = (item: PresetTaller) => {
    const yaEnOrden = itemsEnOrden.some(
      (i: any) =>
        i.code === item.code ||
        (i.name && i.name.toLowerCase() === item.name.toLowerCase())
    );

    if (yaEnOrden) {
      if (onEliminarServicioDeOrden) {
        onEliminarServicioDeOrden(item.code);
        mostrarToast?.(`Removido: ${item.name}`, "info");
      } else {
        mostrarToast?.(`El servicio ya está en la orden`, "info");
      }
      return;
    }

    if (!onAgregarServicioAOrden) {
      mostrarToast?.(`Selecciona una orden de trabajo activa`, "err");
      return;
    }

    onAgregarServicioAOrden({
      id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: item.code,
      name: item.name,
      category: categoriaActiva.title,
      subCategory: item.subCategory || categoriaActiva.title,
      price: Number(item.price) || 0,
      qty: 1,
      type: "SERVICE",
    });
    mostrarToast?.(`✓ Agregado: ${item.name}`, "ok");
  };

  const formatoOrdenCorta = useMemo(() => {
    if (!ordenActiva) return "";
    const raw = String(ordenActiva.orderNumber || ordenActiva.plate || "").trim();
    if (!raw) return "OT";
    let limpio = raw.replace(/^orden\s*#?\s*/i, "").trim();
    if (/^ot\s*#?\s*/i.test(limpio)) {
      return limpio.replace(/^ot\s*#?\s*/i, "OT #");
    }
    if (limpio.startsWith("#")) {
      return `OT ${limpio}`;
    }
    return `OT #${limpio}`;
  }, [ordenActiva]);

  // Contenido principal del catálogo
  const catalogoContenido = (
    <div className="w-full space-y-4">
      {/* =====================================================================
          SI ESTAMOS EN LA PÁGINA (NO MODAL): BARRA SUPERIOR DE HERRAMIENTAS
          ===================================================================== */}
      {!isModal && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-zinc-200/80 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            {onCambiarVista && (
              <div className="flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onCambiarVista("catalogo")}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    vistaActiva === "catalogo"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <span>🛠️</span>
                  <span>Catálogo de Servicios</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCambiarVista("inspeccion")}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    vistaActiva === "inspeccion"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <span>🚗</span>
                  <span>Inspección 5 Planos</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {ordenActiva?.id && (
              <span
                title={`Orden de Trabajo: ${ordenActiva.orderNumber || ordenActiva.plate} (${totalItemsEnOrden} ítems)`}
                className="h-8 px-3 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-300 dark:border-blue-500/35 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              >
                <span>🚗</span>
                <span>{formatoOrdenCorta} ({totalItemsEnOrden})</span>
              </span>
            )}

            <span className="h-8 px-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-1.5 shadow-xs whitespace-nowrap">
              <span>🛒</span>
              <span>Servicios</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 dark:bg-blue-500 text-white font-mono text-[11px] font-black min-w-5 text-center">
                {totalItemsEnOrden}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* =====================================================================
          FILA 1: CATEGORÍAS PRINCIPALES (SCROLL HORIZONTAL IDÉNTICO A SCREENSHOT)
          ===================================================================== */}
      <div className="w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {CATEGORIAS_TALLER_MAESTRAS.map((cat) => {
            const sel = cat.id === categoriaSeleccionadaId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCambiarCategoria(cat.id)}
                className={`h-10 px-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0 shadow-2xs active:scale-95 ${
                  sel
                    ? "bg-blue-50/90 dark:bg-blue-500/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40 font-bold"
                    : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
                title={cat.title}
              >
                <span className="text-base leading-none shrink-0">{cat.icon}</span>
                <span>{cat.shortName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] font-bold shrink-0 ${
                    sel
                      ? "bg-blue-100 dark:bg-blue-500/30 text-blue-800 dark:text-blue-200"
                      : "bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {cat.presets.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          CABECERA DE LA CATEGORÍA ACTIVA + BUSCADOR
          ===================================================================== */}
      <div className="pt-2 pb-1 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-xl shrink-0 shadow-xs">
            {categoriaActiva.icon}
          </div>
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white leading-tight">
              {categoriaActiva.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {categoriaActiva.desc}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar servicio o código..."
            className="w-full h-9 pl-3.5 pr-8 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs text-zinc-900 dark:text-white shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          FILA 2: SUBCATEGORÍAS DE LA CATEGORÍA ACTIVA (FILTRADO RÁPIDO)
          ===================================================================== */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-zinc-50/80 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5">
        <div className="flex flex-wrap items-center gap-1.5">
          {categoriaActiva.subcategorias.map((sub) => {
            const activa = subcategoriaSeleccionadaId === sub.id;
            const count = conteoPorSubcategoria[sub.id] || 0;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubcategoriaSeleccionadaId(sub.id)}
                className={`h-8 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                  activa
                    ? "bg-blue-600 border-blue-500 text-white font-bold shadow-xs"
                    : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span>{sub.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                      activa
                        ? "bg-white/20 text-white font-black"
                        : "bg-zinc-100 dark:bg-white/10 text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          CUADRÍCULA DE SERVICIOS / PRESETS (ESTILO IDÉNTICO A SCREENSHOT)
          ===================================================================== */}
      {itemsFiltrados.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 text-center text-zinc-400 text-xs space-y-1 bg-white/50 dark:bg-white/[0.01]">
          <span className="text-2xl block">🔍</span>
          <p className="font-bold">No se encontraron servicios que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {itemsFiltrados.map((item) => {
            const enOrden = Boolean(
              itemsEnOrden.some(
                (i: any) =>
                  i.code === item.code ||
                  (i.name && i.name.toLowerCase() === item.name.toLowerCase())
              )
            );

            return (
              <div
                key={item.code}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-blue-400/50 dark:hover:border-blue-500/40 transition-all shadow-2xs flex flex-col justify-between min-h-[110px]"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-white/5">
                      {item.code}
                    </span>
                    {item.subCategory && (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {item.subCategory}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug flex-1">
                      {item.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleToggleServicio(item)}
                      className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                        enOrden
                          ? "bg-emerald-100/80 hover:bg-emerald-200/80 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40"
                          : "bg-blue-100/70 hover:bg-blue-200/70 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 active:scale-95 shadow-2xs"
                      }`}
                    >
                      <span>{enOrden ? "✓" : "+"}</span>
                      <span>{enOrden ? "En Orden" : "Agregar"}</span>
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ${Number(item.price).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          PIE DEL CATÁLOGO: RESUMEN DE TOTAL DE SERVICIOS
          ===================================================================== */}
      <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 dark:border-white/5">
        <span>
          Total en {categoriaActiva.title}:{" "}
          <strong className="text-zinc-800 dark:text-white">{itemsFiltrados.length}</strong> servicios
        </span>
        {isModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="h-8 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-bold cursor-pointer transition-all"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );

  // Si se renderiza como Modal
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0e0e10] border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Cabecera del Modal (idéntica a la captura) */}
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-zinc-50/60 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 shadow-xs">
                ⚙️
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white leading-tight">
                  Categorías y Servicios de Taller Mecánico
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  8 categorías operativas con catálogo de presets y servicios conectados a la orden
                </p>
              </div>
            </div>

            {onCloseModal && (
              <button
                type="button"
                onClick={onCloseModal}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-xs font-black cursor-pointer transition-all"
                title="Cerrar modal"
              >
                ✕
              </button>
            )}
          </div>

          {/* Cuerpo Scrollable con el Catálogo de Categorías y Subcategorías */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {catalogoContenido}
          </div>
        </div>
      </div>
    );
  }

  // Si se renderiza en la Página directamente
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111113]/90 border border-zinc-200 dark:border-white/[0.08] shadow-sm dark:shadow-2xl">
      {catalogoContenido}
    </div>
  );
}
