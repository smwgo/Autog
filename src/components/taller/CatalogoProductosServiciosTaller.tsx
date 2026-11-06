"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

// ============================================================================
// SVG BOTELLA DE ACEITE ESTILO SHELL / MOBIL CON ETIQUETA PREMIUM OIL (IDÉNTICO A CAPTURA)
// ============================================================================
export function BotellaAceiteGrafico({
  viscosidad,
  color = "#eab308",
}: {
  viscosidad: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 130"
      className="w-16 h-20 sm:w-20 sm:h-24 drop-shadow-md select-none transition-transform group-hover:scale-105"
      aria-hidden="true"
    >
      {/* Tapa del galón */}
      <rect x="22" y="8" width="18" height="10" rx="2" fill="#d97706" />
      <rect x="24" y="6" width="14" height="3" rx="1" fill="#f59e0b" />
      {/* Cuello */}
      <path d="M 24 18 L 24 26 L 38 26 L 38 18 Z" fill="#1e293b" />
      {/* Asa o mango lateral */}
      <path
        d="M 68 28 C 84 32, 88 56, 86 80 C 82 84, 76 84, 74 80 C 76 60, 72 44, 62 36 Z"
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="1.5"
      />
      {/* Cuerpo del galón */}
      <path
        d="M 22 26 C 14 36, 12 50, 12 110 C 12 118, 20 122, 28 122 L 74 122 C 82 122, 86 118, 86 110 L 86 86 C 82 86, 68 86, 64 36 C 60 28, 48 26, 38 26 Z"
        fill="#0f172a"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      {/* Brillo de relieve lateral */}
      <path
        d="M 16 38 L 16 110"
        stroke="#475569"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Etiqueta frontal */}
      <rect
        x="20"
        y="44"
        width="48"
        height="66"
        rx="4"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1"
      />
      {/* Franja superior de marca */}
      <path d="M 20 48 C 30 44, 58 44, 68 48 L 68 58 L 20 58 Z" fill={color} />
      {/* Concha / Emblema Shell */}
      <circle cx="44" cy="53" r="5" fill="#ef4444" />
      <circle cx="44" cy="53" r="3.5" fill="#facc15" />
      {/* Recuadro de Viscosidad */}
      <rect x="23" y="66" width="42" height="24" rx="3" fill="#0f172a" />
      <text
        x="44"
        y="82"
        fill="#ffffff"
        fontSize="12"
        fontWeight="900"
        fontFamily="monospace"
        textAnchor="middle"
        letterSpacing="-0.5"
      >
        {viscosidad}
      </text>
      {/* Franja dorada inferior */}
      <rect x="25" y="96" width="38" height="3" rx="1.5" fill={color} opacity="0.9" />
      <text
        x="44"
        y="105"
        fill="#94a3b8"
        fontSize="7"
        fontWeight="bold"
        textAnchor="middle"
      >
        PREMIUM OIL
      </text>
    </svg>
  );
}

// Icono genérico según tipo de parte o servicio
function IconoRepuestoGenerico({ categoria, tipo }: { categoria?: string; tipo?: string }) {
  const cat = (categoria || "").toLowerCase();
  if (cat.includes("filtro") || cat.includes("aire") || cat.includes("cabina")) {
    return (
      <svg className="w-14 h-16 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18l-8 4.5v9L12 21m0-18l8 4.5v9L12 21M4 7.5l8 4.5 8-4.5" />
      </svg>
    );
  }
  if (cat.includes("freno") || cat.includes("pastilla") || cat.includes("disco")) {
    return (
      <svg className="w-14 h-16 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 3v5m0 8v5M3 12h5m8 0h5" />
      </svg>
    );
  }
  if (cat.includes("bater")) {
    return (
      <svg className="w-14 h-16 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M7 3v3m10-3v3M6 12h4m6 0h-2m1-1v2" strokeLinecap="round" />
      </svg>
    );
  }
  if (cat.includes("suspens") || cat.includes("amortigu")) {
    return (
      <svg className="w-14 h-16 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4m-4-14h8m-8 10h8m-5-8l6 3-6 3 6 2" />
      </svg>
    );
  }
  if (tipo === "SERVICE") {
    return (
      <svg className="w-14 h-16 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39" />
      </svg>
    );
  }
  return (
    <svg className="w-14 h-16 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

// ============================================================================
// CATÁLOGO BASE PREESTABLECIDO (LOS MISMOS PRODUCTOS Y PRECIOS DE LA CAPTURA)
// ============================================================================
export interface ItemCatalogoTaller {
  id: string;
  code?: string;
  name: string;
  fullName?: string;
  brand?: string;
  price: number;
  viscosity?: string;
  lubCategoryId?: string;
  lubSubcategoryId?: string;
  category?: string;
  subCategory?: string;
  presentation?: string;
  unitOfMeasure?: string;
  type: "SERVICE" | "PART";
  color?: string;
  imageUrl?: string | null;
  stock?: number;
}

const ITEMS_BASE_TALLER: ItemCatalogoTaller[] = [];

const OPCIONES_CATEGORIAS = [
  { id: "aceite", label: "Aceites", icon: "🛢️" },
  { id: "transmision", label: "Transmisión", icon: "⚙️" },
  { id: "filtros", label: "Filtros", icon: "🌪️" },
  { id: "fluidos", label: "Fluidos", icon: "🌡️" },
  { id: "baterias", label: "Baterías", icon: "🔋" },
  { id: "servicios", label: "Servicios", icon: "🛠️" },
  { id: "todos", label: "Todos", icon: "📋" },
];

const SUBCATEGORIAS_MAP: Record<string, { id: string; label: string; icon: string }[]> = {
  aceite: [
    { id: "motor", label: "Motor", icon: "🚗" },
    { id: "aditivos", label: "Aditivos", icon: "🧪" },
    { id: "flush", label: "Flush", icon: "🧼" },
    { id: "grasa", label: "Grasa", icon: "🧈" },
    { id: "todos", label: "Todos", icon: "📋" },
  ],
  transmision: [
    { id: "atf", label: "ATF Automática", icon: "⚙️" },
    { id: "cvt", label: "CVT", icon: "⚡" },
    { id: "manual", label: "Manual", icon: "⚙️" },
    { id: "diferencial", label: "Corona / Dif", icon: "🔩" },
    { id: "todos", label: "Todos", icon: "📋" },
  ],
  filtros: [
    { id: "fil_aceite", label: "Aceite", icon: "🛢️" },
    { id: "fil_aire", label: "Aire", icon: "🌪️" },
    { id: "fil_cabina", label: "Cabina A/C", icon: "❄️" },
    { id: "fil_combustible", label: "Combustible", icon: "⛽" },
    { id: "todos", label: "Todos", icon: "📋" },
  ],
  fluidos: [
    { id: "coolant", label: "Refrigerante", icon: "🌡️" },
    { id: "frenos", label: "Frenos", icon: "🛑" },
    { id: "hidraulico", label: "Hidráulico", icon: "🛞" },
    { id: "parabrisas", label: "Parabrisas", icon: "🌧️" },
    { id: "todos", label: "Todos", icon: "📋" },
  ],
  baterias: [
    { id: "convencional", label: "Convencional", icon: "🔋" },
    { id: "agm", label: "AGM", icon: "⚡" },
    { id: "start_stop", label: "Start-Stop", icon: "🚀" },
    { id: "todos", label: "Todos", icon: "📋" },
  ],
  servicios: [
    { id: "afinamiento", label: "Afinamiento", icon: "🛠️" },
    { id: "diagnostico", label: "Diagnóstico", icon: "🔍" },
    { id: "frenos", label: "Frenos", icon: "🛑" },
    { id: "suspension", label: "Suspensión", icon: "🔩" },
    { id: "motor", label: "Motor", icon: "⚙️" },
    { id: "todos", label: "Todos", icon: "📋" },
  ],
  todos: [{ id: "todos", label: "Todos", icon: "📋" }],
};

const OPCIONES_PRESENTACIONES = [
  { id: "Galón", label: "Galón", icon: "🧴" },
  { id: "Litro", label: "Litro", icon: "🍶" },
  { id: "Cuarto", label: "Cuarto (Qt)", icon: "🥫" },
  { id: "Caneca", label: "Caneca", icon: "🪣" },
  { id: "Unidad", label: "Unidad", icon: "📦" },
  { id: "Todos", label: "Todos", icon: "📋" },
];

export interface ItemSeleccionadoRef {
  id?: string;
  productId?: string;
  code?: string;
  name: string;
  qty?: number;
  price?: number;
  type?: "SERVICE" | "PART" | string;
  category?: string;
}

export interface CatalogoProductosServiciosTallerProps {
  itemsSeleccionados?: ItemSeleccionadoRef[];
  onAgregarItem?: (item: ItemCatalogoTaller, delta?: number) => void;
  onEliminarItem?: (codigoOId: string) => void;
  serviciosCatalogo?: any[];
  productosCatalogo?: any[];
  titulo?: string;
  inicialmenteExpandido?: boolean;
  mostrarChipsSeleccionados?: boolean;
  className?: string;
}

export default function CatalogoProductosServiciosTaller({
  itemsSeleccionados = [],
  onAgregarItem,
  onEliminarItem,
  serviciosCatalogo = [],
  productosCatalogo = [],
  titulo = "Productos y Servicios",
  inicialmenteExpandido = false,
  mostrarChipsSeleccionados = true,
  className = "",
}: CatalogoProductosServiciosTallerProps) {
  const [expandido, setExpandido] = useState<boolean>(inicialmenteExpandido);

  // Estados de los 3 Dropdowns superiores
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("aceite");
  const [subcategoriaActivaId, setSubcategoriaActivaId] = useState<string>("motor");
  const [presentacionActiva, setPresentacionActiva] = useState<string>("Galón");

  const [menuCatAbierto, setMenuCatAbierto] = useState(false);
  const [menuSubcatAbierto, setMenuSubcatAbierto] = useState(false);
  const [menuPresAbierto, setMenuPresAbierto] = useState(false);
  const [filtrosFlotantesAbiertos, setFiltrosFlotantesAbiertos] = useState(false);

  // Buscador de texto
  const [busqueda, setBusqueda] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setMenuCatAbierto(false);
        setMenuSubcatAbierto(false);
        setMenuPresAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  // Consolidar catálogo completo (solo productos y servicios reales de la base de datos)
  const todosLosItems = useMemo<ItemCatalogoTaller[]>(() => {
    const base: ItemCatalogoTaller[] = [];
    const codigosExistentes = new Set<string>();

    // Agregar productos del inventario real
    if (Array.isArray(productosCatalogo)) {
      productosCatalogo.forEach((p: any) => {
        const key = (p.code || p.name || `P-${p.id}`).toLowerCase();
        if (!codigosExistentes.has(key) && p.name) {
          codigosExistentes.add(key);
          const categoriaProducto = String(p.category || "").trim();
          const categoriaNormalizada = categoriaProducto.toLowerCase();
          const categoriaId =
            p.lubCategoryId ||
            (categoriaNormalizada.includes("aceit") || categoriaNormalizada.includes("lubric")
              ? "aceite"
              : categoriaNormalizada.includes("transmi")
                ? "transmision"
                : categoriaNormalizada.includes("filtro")
                  ? "filtros"
                  : categoriaNormalizada.includes("fluido")
                    ? "fluidos"
                    : categoriaNormalizada.includes("bater")
                      ? "baterias"
                      : categoriaProducto && categoriaNormalizada !== "general"
                        ? `custom:${categoriaNormalizada}`
                        : "filtros");
          const esAceite = categoriaId === "aceite" || Boolean(p.viscosity);
          base.push({
            id: String(p.id || key),
            code: p.code || `PROD-${p.id}`,
            name: p.viscosity || p.name,
            fullName: p.name,
            brand: p.brand || "Genérico",
            price: Number(p.price) || 0,
            viscosity: p.viscosity || (esAceite ? p.name : undefined),
            category: categoriaProducto || "Productos",
            subCategory: p.subCategory || "General",
            lubCategoryId: categoriaId,
            lubSubcategoryId:
              p.lubSubcategoryId ||
              (p.subCategory && p.subCategory !== "General"
                ? p.subCategory.toLowerCase()
                : esAceite
                  ? "motor"
                  : "todos"),
            presentation: p.presentation || "Unidad",
            unitOfMeasure: p.unitOfMeasure || "Unidad",
            type: "PART",
            color: esAceite ? "#eab308" : undefined,
            imageUrl: p.imageUrl || null,
            stock: p.stock !== undefined ? Number(p.stock) : 25,
          });
        }
      });
    }

    // Agregar servicios reales de la base de datos
    if (Array.isArray(serviciosCatalogo)) {
      serviciosCatalogo.forEach((s: any) => {
        const key = (s.code || s.name || s.title || `S-${s.id}`).toLowerCase();
        if (!codigosExistentes.has(key) && (s.name || s.title)) {
          codigosExistentes.add(key);
          base.push({
            id: String(s.id || key),
            code: s.code || `SRV-${s.id}`,
            name: s.name || s.title,
            fullName: s.name || s.title,
            brand: "Taller Mecánico",
            price: Number(s.price) || 0,
            category: s.category || "Servicios",
            subCategory: s.subCategory || "Servicios",
            lubCategoryId: "servicios",
            lubSubcategoryId: "todos",
            presentation: "Servicio",
            unitOfMeasure: "Servicio",
            type: "SERVICE",
            stock: 999,
          });
        }
      });
    }

    return base;
  }, [productosCatalogo, serviciosCatalogo]);

  const opcionesCategoriasDinamicas = useMemo(() => {
    const categorias = new Map(
      OPCIONES_CATEGORIAS.map((category) => [category.id, category])
    );
    todosLosItems.forEach((item) => {
      if (
        item.lubCategoryId?.startsWith("custom:") &&
        item.category &&
        item.category !== "General" &&
        item.category !== "Productos"
      ) {
        categorias.set(item.lubCategoryId, {
          id: item.lubCategoryId,
          label: item.category,
          icon: "📁",
        });
      }
    });
    return [...categorias.values()];
  }, [todosLosItems]);

  // Subcategorías dinámicas según la categoría activa
  const opcionesSubcategorias = useMemo(() => {
    const opciones = [...(SUBCATEGORIAS_MAP[categoriaActivaId] || SUBCATEGORIAS_MAP.todos)];
    todosLosItems
      .filter(
        (item) =>
          item.lubCategoryId === categoriaActivaId &&
          item.subCategory &&
          item.subCategory !== "General" &&
          item.lubSubcategoryId
      )
      .forEach((item) => {
        if (!opciones.some((option) => option.id === item.lubSubcategoryId)) {
          opciones.push({
            id: item.lubSubcategoryId!,
            label: item.subCategory!,
            icon: "🔧",
          });
        }
      });
    return opciones;
  }, [categoriaActivaId, todosLosItems]);

  const opcionesPresentacionesDinamicas = useMemo(() => {
    const opciones = [...OPCIONES_PRESENTACIONES];
    todosLosItems.forEach((item) => {
      const presentation = String(item.presentation || "").trim();
      if (
        presentation &&
        presentation !== "Servicio" &&
        !opciones.some(
          (option) => option.id.toLocaleLowerCase() === presentation.toLocaleLowerCase()
        )
      ) {
        opciones.push({ id: presentation, label: presentation, icon: "🧴" });
      }
    });
    return opciones;
  }, [todosLosItems]);

  // Filtrado de productos para la cuadrícula
  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return todosLosItems.filter((item) => {
      // 1. Filtro por Categoría
      if (categoriaActivaId !== "todos") {
        const matchCat =
          item.lubCategoryId === categoriaActivaId ||
          (item.category || "").toLowerCase().includes(categoriaActivaId);
        if (!matchCat) return false;
      }

      // 2. Filtro por Subcategoría
      if (subcategoriaActivaId !== "todos") {
        const matchSub =
          item.lubSubcategoryId === subcategoriaActivaId ||
          (item.subCategory || "").toLowerCase().includes(subcategoriaActivaId) ||
          (item.name || "").toLowerCase().includes(subcategoriaActivaId);
        if (!matchSub) return false;
      }

      // 3. Filtro por Presentación
      if (presentacionActiva !== "Todos") {
        const pres = (item.presentation || item.unitOfMeasure || "").toLowerCase();
        const buscada = presentacionActiva.toLowerCase();
        if (!pres.includes(buscada) && !buscada.includes(pres)) {
          // Si es aceite y se filtra por galón pero el item no especifica presentación, permitir si es aceite
          if (!(item.viscosity && buscada === "galón")) {
            return false;
          }
        }
      }

      // 4. Filtro por texto de búsqueda
      if (q) {
        const matchText =
          item.name.toLowerCase().includes(q) ||
          (item.fullName && item.fullName.toLowerCase().includes(q)) ||
          (item.code && item.code.toLowerCase().includes(q)) ||
          (item.viscosity && item.viscosity.toLowerCase().includes(q)) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
          (item.presentation && item.presentation.toLowerCase().includes(q));
        if (!matchText) return false;
      }

      return true;
    });
  }, [todosLosItems, categoriaActivaId, subcategoriaActivaId, presentacionActiva, busqueda]);

  // Helper para saber la cantidad de un ítem en la orden / selección actual
  const obtenerCantidadItem = (item: ItemCatalogoTaller): number => {
    const itemEncontrado = itemsSeleccionados.find((sel) => {
      if (sel.productId && sel.productId === item.id) return true;
      if (sel.id && (sel.id === item.id || sel.id === item.code)) return true;
      if (sel.code && item.code && sel.code === item.code) return true;
      if (sel.name && item.name && sel.name.toLowerCase() === item.name.toLowerCase()) return true;
      if (sel.name && item.fullName && sel.name.toLowerCase() === item.fullName.toLowerCase()) return true;
      return false;
    });
    return itemEncontrado ? Math.max(1, Number(itemEncontrado.qty || 1)) : 0;
  };

  const totalSeleccionados = itemsSeleccionados.reduce(
    (acc, it) => acc + (Number(it.qty) || 1),
    0
  );

  const labelCatActiva =
    opcionesCategoriasDinamicas.find((c) => c.id === categoriaActivaId)?.label || "Categoría";
  const iconCatActiva =
    opcionesCategoriasDinamicas.find((c) => c.id === categoriaActivaId)?.icon || "🛢️";

  const labelSubcatActiva =
    opcionesSubcategorias.find((s) => s.id === subcategoriaActivaId)?.label || "Subcategoría";
  const iconSubcatActiva =
    opcionesSubcategorias.find((s) => s.id === subcategoriaActivaId)?.icon || "🚗";

  const iconPresActiva =
    opcionesPresentacionesDinamicas.find((p) => p.id === presentacionActiva)?.icon || "🧴";

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-2xs transition-all overflow-visible ${className}`}
    >
      {/* =====================================================================
          BOTÓN / BARRA DE CABECERA: SE EXPANDE O SE RECOJE AL MARCARLO
          ===================================================================== */}
      <div
        onClick={() => setExpandido((prev) => !prev)}
        className="px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none rounded-t-2xl bg-zinc-50/60 hover:bg-zinc-100/60 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-zinc-300/50 dark:border-white/10 bg-zinc-500/10 hover:bg-zinc-500/15 dark:bg-white/5 dark:hover:bg-white/10 backdrop-blur-sm text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-all pointer-events-none"
          >
            <span>Catálogo</span>
            <svg
              className={`w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${
                expandido ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {totalSeleccionados > 0 && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            {totalSeleccionados} {totalSeleccionados === 1 ? "ítem" : "ítems"}
          </span>
        )}
      </div>

      {/* =====================================================================
          CONTENIDO EXPANDIBLE (SE MUESTRA AL MARCAR EL BOTÓN)
          ===================================================================== */}
      {expandido && (
        <div className="p-3 sm:p-4 border-t border-zinc-200/80 dark:border-white/10 rounded-b-2xl space-y-3.5 animate-fade-in bg-zinc-50/40 dark:bg-black/20">
          {/* ===================================================================
              FILA 1: 3 DROPDOWNS DESPLEGABLES (IDÉNTICO A LA CAPTURA)
              Píldora 1: Aceites | Píldora 2: Motor | Píldora 3: Galón
              =================================================================== */}
          <div className="relative">
          {filtrosFlotantesAbiertos && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-3 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Filtrar productos</span>
                <button
                  type="button"
                  onClick={() => setFiltrosFlotantesAbiertos(false)}
                  className="w-7 h-7 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer"
                  aria-label="Cerrar filtros"
                >
                  ✕
                </button>
              </div>
          <div className="flex flex-col gap-2">
            {/* Píldora 1: Categoría */}
            <div className="relative w-full">
              <span className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">1. Categoría</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuCatAbierto((prev) => !prev);
                  setMenuSubcatAbierto(false);
                  setMenuPresAbierto(false);
                }}
                className={`w-full h-10 px-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate ${
                  categoriaActivaId === "aceite"
                    ? "border-blue-400 bg-blue-50/90 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100 ring-1 ring-blue-300/60"
                    : "border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                }`}
              >
                <span className="truncate flex items-center gap-1.5">
                  <span className="text-sm shrink-0">{iconCatActiva}</span>
                  <span className="truncate">{labelCatActiva}</span>
                </span>
                <span className="text-[10px] opacity-75 shrink-0">▾</span>
              </button>

              {menuCatAbierto && (
                <div className="absolute top-12 left-0 z-40 w-44 rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1.5 shadow-2xl animate-fade-in space-y-0.5">
                  {opcionesCategoriasDinamicas.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoriaActivaId(cat.id);
                        setSubcategoriaActivaId("todos");
                        setMenuCatAbierto(false);
                      }}
                      className={`w-full h-8 px-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                        categoriaActivaId === cat.id
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold"
                          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <span className="text-sm shrink-0">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Píldora 2: Subcategoría */}
            <div className="relative w-full">
              <span className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">2. Subcategoría</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuSubcatAbierto((prev) => !prev);
                  setMenuCatAbierto(false);
                  setMenuPresAbierto(false);
                }}
                className="w-full h-10 px-3 rounded-2xl border border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 text-xs font-bold flex items-center justify-between gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate"
              >
                <span className="truncate flex items-center gap-1.5">
                  <span className="text-sm shrink-0">{iconSubcatActiva}</span>
                  <span className="truncate">{labelSubcatActiva}</span>
                </span>
                <span className="text-[10px] opacity-75 shrink-0">▾</span>
              </button>

              {menuSubcatAbierto && (
                <div className="absolute top-12 left-0 z-40 w-48 rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1.5 shadow-2xl animate-fade-in space-y-0.5 max-h-56 overflow-y-auto">
                  {opcionesSubcategorias.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSubcategoriaActivaId(sub.id);
                        setMenuSubcatAbierto(false);
                      }}
                      className={`w-full h-8 px-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                        subcategoriaActivaId === sub.id
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold"
                          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <span className="text-sm shrink-0">{sub.icon}</span>
                      <span className="truncate">{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Píldora 3: Envase / Presentación */}
            <div className="relative w-full">
              <span className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">3. Presentación</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuPresAbierto((prev) => !prev);
                  setMenuCatAbierto(false);
                  setMenuSubcatAbierto(false);
                }}
                className="w-full h-10 px-3 rounded-2xl border border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 text-xs font-bold flex items-center justify-between gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs truncate"
              >
                <span className="truncate flex items-center gap-1.5">
                  <span className="text-sm shrink-0">{iconPresActiva}</span>
                  <span className="truncate">{presentacionActiva}</span>
                </span>
                <span className="text-[10px] opacity-75 shrink-0">▾</span>
              </button>

              {menuPresAbierto && (
                <div className="absolute top-12 right-0 z-40 w-40 rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1.5 shadow-2xl animate-fade-in space-y-0.5">
                  {opcionesPresentacionesDinamicas.map((pres) => (
                    <button
                      key={pres.id}
                      type="button"
                      onClick={() => {
                        setPresentacionActiva(pres.id);
                        setMenuPresAbierto(false);
                      }}
                      className={`w-full h-8 px-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                        presentacionActiva === pres.id
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold"
                          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <span className="text-sm shrink-0">{pres.icon}</span>
                      <span className="truncate">{pres.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
            </div>
          )}

          {/* ===================================================================
              FILA 2: BARRA DE BÚSQUEDA (IDÉNTICA A LA CAPTURA)
              =================================================================== */}
          <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-10 pl-9 pr-8 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-1 focus:ring-blue-400 shadow-2xs transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setFiltrosFlotantesAbiertos((prev) => !prev);
              setMenuCatAbierto(false);
              setMenuSubcatAbierto(false);
              setMenuPresAbierto(false);
            }}
            className={`h-10 w-11 shrink-0 rounded-2xl border flex items-center justify-center transition-colors cursor-pointer ${
              filtrosFlotantesAbiertos
                ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-400/50 dark:bg-blue-500/20 dark:text-blue-300"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            }`}
            aria-label="Abrir filtros"
            aria-expanded={filtrosFlotantesAbiertos}
            title="Filtrar productos"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M4 7h16M7 12h10m-7 5h4" />
              <circle cx="8" cy="7" r="1" fill="currentColor" />
              <circle cx="15" cy="12" r="1" fill="currentColor" />
              <circle cx="11" cy="17" r="1" fill="currentColor" />
            </svg>
          </button>
          </div>
          </div>

          {/* ===================================================================
              CUADRÍCULA DE TARJETAS (ESTILO IDÉNTICO A LA CAPTURA)
              =================================================================== */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs">
            {itemsFiltrados.length === 0 ? (
              <div className="py-10 text-center text-zinc-400 space-y-1.5">
                <span className="text-3xl block">🔍</span>
                <p className="text-xs sm:text-sm font-semibold">
                  No hay resultados para esta búsqueda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
                {itemsFiltrados.map((item) => {
                  const cantEnOrden = obtenerCantidadItem(item);
                  const enOrden = cantEnOrden > 0;
                  const stockVal =
                    item.stock !== undefined && item.stock !== null ? Number(item.stock) : 25;
                  const estaAgotado = stockVal <= 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (estaAgotado) return;
                        onAgregarItem?.(item, 1);
                      }}
                      className={`group relative flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] min-h-[175px] shadow-2xs ${
                        enOrden
                          ? "bg-blue-50/70 dark:bg-blue-500/10 border-blue-400 dark:border-blue-400/50 ring-2 ring-blue-300/60 dark:ring-blue-400/30 shadow-xs"
                          : estaAgotado
                          ? "bg-zinc-50/70 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 opacity-75"
                          : "bg-white hover:bg-zinc-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/40"
                      }`}
                    >
                      {/* Botón restar "−" e indicador de Stock/Agotado (una sola letra: S en verde, A en rojo) */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                        {enOrden && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (cantEnOrden <= 1 && onEliminarItem) {
                                onEliminarItem(item.id || item.code || item.name);
                              } else {
                                onAgregarItem?.(item, -1);
                              }
                            }}
                            className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-sm font-bold flex items-center justify-center shadow-xs active:scale-90 transition-all cursor-pointer"
                            title="Restar 1"
                          >
                            −
                          </button>
                        )}
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border select-none ${
                            estaAgotado
                              ? "bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40"
                              : "bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40"
                          }`}
                          title={estaAgotado ? "Agotado (Sin stock)" : `Stock disponible (${stockVal})`}
                        >
                          {estaAgotado ? "A" : "S"}
                        </span>
                      </div>

                      {/* Badge contador verde arriba a la derecha (+2) */}
                      {enOrden && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs z-10">
                          +{cantEnOrden}
                        </span>
                      )}

                      {/* Gráfico de botella o imagen del producto */}
                      <div className="w-20 h-24 sm:w-24 sm:h-28 flex items-center justify-center shrink-0 mt-1">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        ) : item.viscosity || item.lubCategoryId === "aceite" ? (
                          <BotellaAceiteGrafico
                            viscosidad={item.viscosity || item.name}
                            color={item.color || "#eab308"}
                          />
                        ) : (
                          <IconoRepuestoGenerico
                            categoria={item.category || item.lubCategoryId}
                            tipo={item.type}
                          />
                        )}
                      </div>

                      {/* Texto de viscosidad/nombre y precio sin negrita (idéntico a la captura) */}
                      <div className="w-full text-center mt-2 px-1">
                        <span className="text-base sm:text-lg font-normal tracking-tight text-zinc-900 dark:text-white block truncate">
                          {item.viscosity || item.name}
                        </span>
                        <span className="text-xs sm:text-sm font-normal font-mono text-zinc-700 dark:text-zinc-300 mt-0.5 block">
                          ${Number(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===================================================================
              RESUMEN DE ÍTEMS SELECCIONADOS / VINCULADOS
              =================================================================== */}
          {mostrarChipsSeleccionados && itemsSeleccionados.length > 0 && (
            <div className="pt-2 border-t border-zinc-200/60 dark:border-white/10 space-y-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">
                Ítems añadidos ({totalSeleccionados}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {itemsSeleccionados.map((it, idx) => (
                  <span
                    key={it.id || it.code || idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200 border border-blue-200 dark:border-blue-500/30 shadow-2xs"
                  >
                    <span>{it.name}</span>
                    {Number(it.qty) > 1 && (
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-200/80 dark:bg-blue-500/30 font-bold text-[10px]">
                        x{it.qty}
                      </span>
                    )}
                    {it.price !== undefined && (
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        ${(Number(it.price) * (Number(it.qty) || 1)).toFixed(2)}
                      </span>
                    )}
                    {onEliminarItem && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEliminarItem(it.id || it.code || it.name);
                        }}
                        className="ml-0.5 text-zinc-400 hover:text-rose-600 font-bold cursor-pointer"
                        title="Eliminar ítem"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
