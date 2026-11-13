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

export const CATEGORIAS_PRODUCTOS_BASE = [
  { id: "aceite", label: "Aceites", icon: "🛢️" },
  { id: "filtros", label: "Filtros", icon: "🌪️" },
  { id: "fluidos", label: "Fluidos", icon: "🌡️" },
  { id: "baterias", label: "Baterías", icon: "🔋" },
  { id: "transmision", label: "Transmisión", icon: "⚙️" },
];

export const CATEGORIAS_SERVICIOS_BASE = [
  { id: "srv_mantenimiento", label: "Mantenimiento", icon: "🛠️" },
  { id: "srv_frenos", label: "Frenos", icon: "🛑" },
  { id: "srv_suspension", label: "Suspensión", icon: "🔩" },
  { id: "srv_diagnostico", label: "Diagnóstico", icon: "🔍" },
  { id: "srv_electrico", label: "Eléctrico", icon: "⚡" },
  { id: "srv_transmision", label: "Transmisión", icon: "🔄" },
  { id: "srv_aire", label: "Aire", icon: "❄️" },
  { id: "srv_motor", label: "Motor", icon: "⚙️" },
  { id: "srv_carwash", label: "Lavado", icon: "🚿" },
  { id: "servicios", label: "Servicios", icon: "📋" },
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
  siempreAbierto?: boolean;
  mostrarPrecios?: boolean;
  ocultarCabeceraYCategoria?: boolean;
  limitarDosFilasInicial?: boolean;
}

export function extraerDetalleCaracteristica(item: ItemCatalogoTaller): {
  nombrePrincipal: string;
  caracteristica: string;
} {
  const nombreCompleto = (item.fullName || item.name || "").trim();
  if (!nombreCompleto) return { nombrePrincipal: "", caracteristica: "" };

  if (
    item.category === "Manual" ||
    item.code?.startsWith("MANUAL-") ||
    (item as any).isManual ||
    item.id?.startsWith("manual-")
  ) {
    return {
      nombrePrincipal: nombreCompleto,
      caracteristica: "Manual",
    };
  }

  // 1. Viscosidad / Grado (5W30, 20W50, 10W30, 15W40, 80W90, 75W85, etc.)
  const regexVisc = /\b(\d{1,2}W[-]?\d{2}|\d{2}W\d{2,3}|(?:GL|DOT)[-]?\d+)\b/i;
  const matchVisc = nombreCompleto.match(regexVisc);

  // 2. Litros / Volumen (1L, 4L, 5L, Galón, Litro, Cuarto, etc.)
  const regexLitros = /\b(\d+(?:\.\d+)?\s*(?:L|LT|LITROS?|GL|GALONES?|QT|CUARTO))\b/i;
  const matchLitros = nombreCompleto.match(regexLitros);

  let caracteristica = "";
  if (item.presentation && item.presentation.trim() && item.presentation.trim().toLowerCase() !== "unidad") {
    caracteristica = item.presentation.trim();
  } else if (matchLitros) {
    caracteristica = matchLitros[1].replace(/\s+/g, "").toUpperCase();
  } else if (matchVisc) {
    caracteristica = matchVisc[1].toUpperCase();
  } else if (item.viscosity && item.viscosity.trim() && item.viscosity !== item.name) {
    caracteristica = item.viscosity.trim();
  }

  // Si no hay aún y tiene subcategoría específica
  if (!caracteristica && item.subCategory && item.subCategory !== "General" && item.subCategory !== "Todos") {
    caracteristica = item.subCategory.split(" ")[0];
  }

  // Nombre limpio sin duplicar la característica al final
  let nombrePrincipal = nombreCompleto;
  if (caracteristica) {
    nombrePrincipal = nombrePrincipal
      .replace(new RegExp(`\\s*${caracteristica}\\b`, "i"), "")
      .replace(/\s*GL[-]?\d+\b/i, "")
      .trim();
  }

  return {
    nombrePrincipal: nombrePrincipal || nombreCompleto,
    caracteristica: caracteristica || "",
  };
}

export function formatearPrimeraMayuscula(texto?: string | null): string {
  if (!texto) return "";
  const s = String(texto).trim();
  if (!s) return "";
  if (/^\d{1,2}W[-]?\d{2,3}$/i.test(s)) return s.toUpperCase();
  if (/^\d{3}\/\d{2}\s*R\d{2}\+?$/i.test(s)) return s.toUpperCase();
  if (/^R\d{2}$/i.test(s)) return s.toUpperCase();

  let formatted = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  formatted = formatted.replace(/-([a-záéíóúñ])/gi, (_, letter) => `-${letter.toUpperCase()}`);
  formatted = formatted.replace(/\b(\d{1,2})w([-]?\d{2,3})\b/gi, (_, n, m) => `${n}W${m}`);
  formatted = formatted.replace(/\b(\d{3}\/\d{2})\s*r(\d{2})\b/gi, (_, p, r) => `${p}R${r}`);
  formatted = formatted.replace(/\br(\d{2})\b/gi, (_, r) => `R${r}`);
  return formatted;
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
  siempreAbierto = false,
  mostrarPrecios = false,
  ocultarCabeceraYCategoria = false,
  limitarDosFilasInicial = false,
}: CatalogoProductosServiciosTallerProps) {
  const [expandido, setExpandido] = useState<boolean>(siempreAbierto || inicialmenteExpandido);
  const [mostrarTodosSinFiltro, setMostrarTodosSinFiltro] = useState(false);

  // Estados de los 3 Dropdowns superiores
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "PART" | "SERVICE">("todos");
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>(ocultarCabeceraYCategoria ? "todos" : "aceite");
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
          const textoCompleto = `${categoriaProducto} ${p.subCategory || ""} ${p.name || ""}`.toLowerCase();

          let categoriaId = "otros_prod";
          let labelCategoria = categoriaProducto ? categoriaProducto.trim().split(/\s+/)[0] : "Productos";

          if (categoriaNormalizada.includes("aceit") || categoriaNormalizada.includes("lubric") || Boolean(p.viscosity) || textoCompleto.includes("aceite")) {
            categoriaId = "aceite";
            labelCategoria = "Aceites";
          } else if (categoriaNormalizada.includes("filtro") || textoCompleto.includes("filtro")) {
            categoriaId = "filtros";
            labelCategoria = "Filtros";
          } else if (categoriaNormalizada.includes("fluido") || textoCompleto.includes("refrigerante") || textoCompleto.includes("coolant") || textoCompleto.includes("liquido")) {
            categoriaId = "fluidos";
            labelCategoria = "Fluidos";
          } else if (categoriaNormalizada.includes("bater") || textoCompleto.includes("bateria")) {
            categoriaId = "baterias";
            labelCategoria = "Baterías";
          } else if (categoriaNormalizada.includes("transmi") || textoCompleto.includes("atf") || textoCompleto.includes("caja")) {
            categoriaId = "transmision";
            labelCategoria = "Transmisión";
          } else if (categoriaProducto && categoriaNormalizada !== "general" && categoriaNormalizada !== "productos") {
            categoriaId = `custom:${categoriaNormalizada}`;
            labelCategoria = categoriaProducto.trim().split(/\s+/)[0];
          }

          const esAceite = categoriaId === "aceite" || Boolean(p.viscosity);
          base.push({
            id: String(p.id || key),
            code: p.code || `PROD-${p.id}`,
            name: p.viscosity || p.name,
            fullName: p.name,
            brand: p.brand || "Genérico",
            price: Number(p.price) || 0,
            viscosity: p.viscosity || (esAceite ? p.name : undefined),
            category: labelCategoria,
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
          const categoriaServicio = String(s.category || s.specialty || "").trim();
          const textoCompleto = `${categoriaServicio} ${s.subCategory || ""} ${s.name || s.title || ""}`.toLowerCase();
          
          let srvCatId = "servicios";
          let labelCategoria = categoriaServicio ? categoriaServicio.trim().split(/\s+/)[0] : "Servicios";

          if (textoCompleto.includes("freno") || textoCompleto.includes("pastilla") || textoCompleto.includes("disco")) {
            srvCatId = "srv_frenos";
            labelCategoria = "Frenos";
          } else if (textoCompleto.includes("suspens") || textoCompleto.includes("direcc") || textoCompleto.includes("amortigu")) {
            srvCatId = "srv_suspension";
            labelCategoria = "Suspensión";
          } else if (textoCompleto.includes("electric") || textoCompleto.includes("bater") || textoCompleto.includes("alternador") || textoCompleto.includes("arranque")) {
            srvCatId = "srv_electrico";
            labelCategoria = "Eléctrico";
          } else if (textoCompleto.includes("transmi") || textoCompleto.includes("embrague") || textoCompleto.includes("clutch")) {
            srvCatId = "srv_transmision";
            labelCategoria = "Transmisión";
          } else if (textoCompleto.includes("aire") || textoCompleto.includes("clima") || textoCompleto.includes("acondicionad") || textoCompleto.includes("r134")) {
            srvCatId = "srv_aire";
            labelCategoria = "Aire";
          } else if (textoCompleto.includes("diag") || textoCompleto.includes("escan") || textoCompleto.includes("scanner") || textoCompleto.includes("computariz")) {
            srvCatId = "srv_diagnostico";
            labelCategoria = "Diagnóstico";
          } else if (textoCompleto.includes("manten") || textoCompleto.includes("afin") || textoCompleto.includes("inyector") || textoCompleto.includes("bujia")) {
            srvCatId = "srv_mantenimiento";
            labelCategoria = "Mantenimiento";
          } else if (textoCompleto.includes("lavad") || textoCompleto.includes("wash") || textoCompleto.includes("aspirad") || textoCompleto.includes("pulid")) {
            srvCatId = "srv_carwash";
            labelCategoria = "Lavado";
          } else if (textoCompleto.includes("motor") || textoCompleto.includes("culata") || textoCompleto.includes("valvula") || textoCompleto.includes("distribucion")) {
            srvCatId = "srv_motor";
            labelCategoria = "Motor";
          } else if (categoriaServicio && categoriaServicio.toLowerCase() !== "general" && categoriaServicio.toLowerCase() !== "servicios") {
            srvCatId = `custom_srv:${categoriaServicio.toLowerCase()}`;
            labelCategoria = categoriaServicio.trim().split(/\s+/)[0];
          }

          base.push({
            id: String(s.id || key),
            code: s.code || `SRV-${s.id}`,
            name: s.name || s.title,
            fullName: s.name || s.title,
            brand: "Taller Mecánico",
            price: Number(s.price) || 0,
            category: labelCategoria,
            subCategory: s.subCategory || labelCategoria,
            lubCategoryId: srvCatId,
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

  // Categorías de productos dinámicas (P)
  const categoriasProductos = useMemo(() => {
    const mapa = new Map<string, { id: string; label: string; icon: string }>();

    CATEGORIAS_PRODUCTOS_BASE.forEach((cat) => mapa.set(cat.id, cat));

    todosLosItems
      .filter((item) => item.type === "PART")
      .forEach((item) => {
        if (item.lubCategoryId && !mapa.has(item.lubCategoryId)) {
          mapa.set(item.lubCategoryId, {
            id: item.lubCategoryId,
            label: item.category || item.lubCategoryId,
            icon: "📦",
          });
        }
      });

    return Array.from(mapa.values());
  }, [todosLosItems]);

  // Categorías de servicios dinámicas (S)
  const categoriasServicios = useMemo(() => {
    const mapa = new Map<string, { id: string; label: string; icon: string }>();
    const servicios = todosLosItems.filter((item) => item.type === "SERVICE");

    CATEGORIAS_SERVICIOS_BASE.forEach((cat) => {
      const tieneItems = servicios.some(
        (s) =>
          s.lubCategoryId === cat.id ||
          (s.category && s.category.toLowerCase().includes(cat.id.replace("srv_", "")))
      );
      if (tieneItems || servicios.length === 0) {
        mapa.set(cat.id, cat);
      }
    });

    servicios.forEach((item) => {
      if (item.lubCategoryId && !mapa.has(item.lubCategoryId)) {
        mapa.set(item.lubCategoryId, {
          id: item.lubCategoryId,
          label: item.category || "Servicios",
          icon: "🛠️",
        });
      }
    });

    if (mapa.size === 0) {
      mapa.set("servicios", { id: "servicios", label: "Servicios", icon: "🛠️" });
    }

    return Array.from(mapa.values());
  }, [todosLosItems]);

  // Categorías a mostrar según el filtro P/S activo:
  // - Al marcar P: salen categorías de productos
  // - Al marcar S: salen categorías de servicios
  // - Ninguno marcado: salen todas las categorías
  const opcionesCategoriasDinamicas = useMemo(() => {
    const todasOpt = {
      id: "todos",
      label: "Todas",
      icon: "📋",
    };

    let lista: { id: string; label: string; icon: string }[] = [];
    if (filtroTipo === "PART") {
      lista = [todasOpt, ...categoriasProductos];
    } else if (filtroTipo === "SERVICE") {
      lista = [todasOpt, ...categoriasServicios];
    } else {
      lista = [todasOpt, ...categoriasProductos, ...categoriasServicios];
    }

    // Asegurar que cada opción sea de una sola palabra
    return lista.map((cat) => ({
      ...cat,
      label: cat.label.trim().split(/\s+/)[0] || cat.label,
    }));
  }, [filtroTipo, categoriasProductos, categoriasServicios]);

  // Filtrado de productos y servicios para la cuadrícula
  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return todosLosItems.filter((item) => {
      // 1. Filtro Tipo: P (Productos) o S (Servicios)
      if (filtroTipo === "PART" && item.type !== "PART") return false;
      if (filtroTipo === "SERVICE" && item.type !== "SERVICE") return false;

      // 2. Filtro por Categoría
      if (categoriaActivaId !== "todos") {
        const catNorm = categoriaActivaId.replace(/^custom:|^cat:/, "").toLowerCase();
        const matchCat =
          item.lubCategoryId === categoriaActivaId ||
          (item.category || "").toLowerCase() === catNorm ||
          (item.category || "").toLowerCase().includes(catNorm) ||
          (item.lubCategoryId || "").toLowerCase().includes(catNorm);
        if (!matchCat) return false;
      }

      // 3. Filtro por texto de búsqueda
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
  }, [todosLosItems, filtroTipo, categoriaActivaId, busqueda]);

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

  const totalProductosSeleccionados = useMemo(() => {
    return itemsSeleccionados
      .filter(
        (it) =>
          it.type !== "SERVICE" &&
          !it.category?.toLowerCase().includes("servicio") &&
          !it.code?.toUpperCase().startsWith("SRV")
      )
      .reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  }, [itemsSeleccionados]);

  const totalServiciosSeleccionados = useMemo(() => {
    return itemsSeleccionados
      .filter(
        (it) =>
          it.type === "SERVICE" ||
          it.category?.toLowerCase().includes("servicio") ||
          it.code?.toUpperCase().startsWith("SRV")
      )
      .reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  }, [itemsSeleccionados]);

  const renderBadgeTotales = () => {
    if (totalSeleccionados === 0) return null;

    if (totalProductosSeleccionados > 0 && totalServiciosSeleccionados > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-normal bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 shadow-2xs">
          <span>📦 {totalProductosSeleccionados} {totalProductosSeleccionados === 1 ? "Producto" : "Productos"}</span>
          <span className="text-zinc-300 dark:text-white/20">·</span>
          <span>🔧 {totalServiciosSeleccionados} {totalServiciosSeleccionados === 1 ? "Servicio" : "Servicios"}</span>
        </span>
      );
    }

    if (totalProductosSeleccionados > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-normal bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 shadow-2xs">
          <span>📦</span>
          <span>{totalProductosSeleccionados} {totalProductosSeleccionados === 1 ? "Producto" : "Productos"}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-normal bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25 shadow-2xs">
        <span>🔧</span>
        <span>{totalServiciosSeleccionados} {totalServiciosSeleccionados === 1 ? "Servicio" : "Servicios"}</span>
      </span>
    );
  };

  const labelCatActiva =
    opcionesCategoriasDinamicas.find((c) => c.id === categoriaActivaId)?.label ||
    "Todas";
  const iconCatActiva =
    opcionesCategoriasDinamicas.find((c) => c.id === categoriaActivaId)?.icon || "📋";

  return (
    <div
      ref={containerRef}
      className={`w-full ${
        ocultarCabeceraYCategoria
          ? "border-0 shadow-none bg-transparent"
          : "rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-2xs"
      } transition-all overflow-visible ${className}`}
    >
      {/* =====================================================================
          BOTÓN / BARRA DE CABECERA: SE EXPANDE O SE RECOJE AL MARCARLO
          ===================================================================== */}
      {!ocultarCabeceraYCategoria && (!siempreAbierto ? (
        <div
          onClick={() => setExpandido((prev) => !prev)}
          className="px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none rounded-t-2xl bg-zinc-50/60 hover:bg-zinc-100/60 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-zinc-300/50 dark:border-white/10 bg-zinc-500/10 hover:bg-zinc-500/15 dark:bg-white/5 dark:hover:bg-white/10 backdrop-blur-sm text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-all pointer-events-none"
            >
              <span>{titulo || "Catálogo"}</span>
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

          {renderBadgeTotales()}
        </div>
      ) : (
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 border-b border-zinc-200/70 dark:border-white/10">
          <span className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-zinc-100 tracking-tight">
            {titulo || "Catálogo"}
          </span>
          {renderBadgeTotales()}
        </div>
      ))}

      {/* =====================================================================
          CONTENIDO DEL CATÁLOGO
          ===================================================================== */}
      {(siempreAbierto || expandido) && (
        <div className={`space-y-3.5 animate-fade-in ${
          ocultarCabeceraYCategoria
            ? "p-0 bg-transparent"
            : `p-3 sm:p-4 rounded-b-2xl bg-zinc-50/40 dark:bg-black/20 ${!siempreAbierto ? "border-t border-zinc-200/80 dark:border-white/10" : ""}`
        }`}>
          {/* ===================================================================
              MÁS ARRIBA: ICONO DE CATEGORÍA DESPLEGABLE (SOLO CATEGORÍAS)
              =================================================================== */}
          {!ocultarCabeceraYCategoria && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuCatAbierto((prev) => !prev)}
              className="w-full h-10 px-3.5 rounded-2xl border border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs hover:bg-zinc-50 dark:hover:bg-white/10 transition-all cursor-pointer select-none"
              aria-label="Seleccionar categoría"
              aria-expanded={menuCatAbierto}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm shrink-0">{iconCatActiva}</span>
                <span className="truncate">
                  {categoriaActivaId === "todos" ? "Todas" : labelCatActiva}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
                {categoriaActivaId !== "todos" && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoriaActivaId("todos");
                    }}
                    className="hover:text-zinc-600 dark:hover:text-zinc-200 px-1 text-xs cursor-pointer"
                    title="Restablecer a Todas"
                  >
                    ✕
                  </span>
                )}
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${menuCatAbierto ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {menuCatAbierto && (
              <div className="absolute top-11 left-0 right-0 z-40 max-h-64 overflow-y-auto rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1.5 shadow-2xl animate-fade-in space-y-0.5">
                {opcionesCategoriasDinamicas.map((cat) => {
                  const esActiva = categoriaActivaId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoriaActivaId(cat.id);
                        setMenuCatAbierto(false);
                      }}
                      className={`w-full h-8 px-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        esActiva
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold"
                          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm shrink-0">{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </div>
                      {esActiva && <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* ===================================================================
              AQUÍ: BARRA DE BÚSQUEDA + DOS ICONOS P S (FILTROS PRODUCTOS Y SERVICIOS)
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

            {/* Icono P: Filtro Productos */}
            <button
              type="button"
              onClick={() => {
                setFiltroTipo((prev) => (prev === "PART" ? "todos" : "PART"));
                setCategoriaActivaId("todos");
              }}
              className={`h-10 w-10 shrink-0 rounded-2xl border flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-2xs active:scale-95 ${
                filtroTipo === "PART"
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-300 ring-2 ring-blue-400/40 shadow-xs"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              }`}
              title={filtroTipo === "PART" ? "Filtro activo: Productos (clic para ver todos)" : "Filtrar por Productos (P)"}
              aria-label="Filtrar por Productos"
            >
              <span>P</span>
            </button>

            {/* Icono S: Filtro Servicios */}
            <button
              type="button"
              onClick={() => {
                setFiltroTipo((prev) => (prev === "SERVICE" ? "todos" : "SERVICE"));
                setCategoriaActivaId("todos");
              }}
              className={`h-10 w-10 shrink-0 rounded-2xl border flex items-center justify-center font-black text-sm transition-all cursor-pointer shadow-2xs active:scale-95 ${
                filtroTipo === "SERVICE"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 ring-2 ring-emerald-400/40 shadow-xs"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              }`}
              title={filtroTipo === "SERVICE" ? "Filtro activo: Servicios (clic para ver todos)" : "Filtrar por Servicios (S)"}
              aria-label="Filtrar por Servicios"
            >
              <span>S</span>
            </button>
          </div>

          {/* ===================================================================
              CUADRÍCULA DE TARJETAS (ESTILO IDÉNTICO A LA CAPTURA)
              =================================================================== */}
          {(() => {
            const LIMITE_DOS_FILAS = 8;
            const itemsAMostrar =
              limitarDosFilasInicial && !busqueda.trim() && !mostrarTodosSinFiltro
                ? itemsFiltrados.slice(0, LIMITE_DOS_FILAS)
                : itemsFiltrados;

            return (
              <div className={`${
                ocultarCabeceraYCategoria
                  ? "p-0 border-0 shadow-none bg-transparent"
                  : "p-3 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs"
              }`}>
                {itemsFiltrados.length === 0 ? (
                  <div className="py-10 text-center text-zinc-400 space-y-1.5">
                    <span className="text-3xl block">🔍</span>
                    <p className="text-xs sm:text-sm font-semibold">
                      No hay resultados para esta búsqueda.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
                      {itemsAMostrar.map((item) => {
                        const cantEnOrden = obtenerCantidadItem(item);
                        const enOrden = cantEnOrden > 0;
                        const stockVal =
                          item.stock !== undefined && item.stock !== null ? Number(item.stock) : 25;
                        const estaAgotado = stockVal <= 0;
                        const { nombrePrincipal, caracteristica } = extraerDetalleCaracteristica(item);

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
                                ? "bg-rose-500/[0.03] dark:bg-rose-500/[0.04] border-rose-300/80 dark:border-rose-500/30 opacity-80"
                                : "bg-white hover:bg-zinc-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/40"
                            }`}
                          >
                            {/* Indicador de Tipo/Stock */}
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border select-none transition-colors ${
                                  item.type === "SERVICE"
                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"
                                    : estaAgotado
                                    ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                }`}
                                title={item.type === "SERVICE" ? "Servicio de taller" : estaAgotado ? "Agotado (Sin stock)" : `Stock disponible (${stockVal})`}
                              >
                                {item.type === "SERVICE" ? "Servicio" : estaAgotado ? "Agotado" : "Stock"}
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
                                  viscosidad={caracteristica || item.viscosity || item.name}
                                  color={item.color || "#eab308"}
                                />
                              ) : (
                                <IconoRepuestoGenerico
                                  categoria={item.category || item.lubCategoryId}
                                  tipo={item.type}
                                />
                              )}
                            </div>

                            {/* Texto de nombre y características (litros/viscosidad en una sola palabra) */}
                            <div className="w-full text-center mt-2 px-1 flex flex-col items-center">
                              <span className="text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 dark:text-white block truncate max-w-full">
                                {formatearPrimeraMayuscula(nombrePrincipal)}
                              </span>
                              {caracteristica && (
                                <span className="mt-1 inline-block px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 text-[10px] sm:text-[11px] font-semibold tracking-wide border border-zinc-200/60 dark:border-white/10 select-none truncate max-w-full">
                                {formatearPrimeraMayuscula(caracteristica)}
                              </span>
                            )}
                            {mostrarPrecios && (
                              <span className="text-xs sm:text-sm font-normal font-mono text-zinc-700 dark:text-zinc-300 mt-0.5 block">
                                ${Number(item.price || 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {limitarDosFilasInicial && !busqueda.trim() && !mostrarTodosSinFiltro && itemsFiltrados.length > LIMITE_DOS_FILAS && (
                    <div className="pt-2.5 pb-0.5 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-white/10 mt-2.5">
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {itemsAMostrar.length} de {itemsFiltrados.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMostrarTodosSinFiltro(true)}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Ver todos ({itemsFiltrados.length})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

          {/* ===================================================================
              RESUMEN DE ÍTEMS SELECCIONADOS EN 2 SECCIONES ESTILO FACTURA: PRODUCTOS Y SERVICIOS
              =================================================================== */}
          {mostrarChipsSeleccionados && itemsSeleccionados.length > 0 && (
            <ResumenItemsSeleccionadosTaller
              itemsSeleccionados={itemsSeleccionados}
              onAgregarItem={onAgregarItem}
              onEliminarItem={onEliminarItem}
              mostrarPrecios={mostrarPrecios}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function ResumenItemsSeleccionadosTaller({
  itemsSeleccionados = [],
  onAgregarItem,
  onEliminarItem,
  mostrarPrecios = false,
  fotos,
  audios,
  notas,
  descripcion,
  onAbrirFoto,
  onToggleAudio,
  onEliminarNota,
  onEliminarFoto,
  onEliminarAudio,
  audioReproduciendoUrl,
}: {
  itemsSeleccionados?: ItemSeleccionadoRef[];
  onAgregarItem?: (item: ItemCatalogoTaller, delta?: number) => void;
  onEliminarItem?: (codigoOId: string) => void;
  mostrarPrecios?: boolean;
  fotos?: { url: string; originalIdx?: number }[];
  audios?: string[];
  notas?: { id?: string; text: string }[];
  descripcion?: string;
  onAbrirFoto?: (url: string, index: number) => void;
  onToggleAudio?: (audioUrl: string) => void;
  onEliminarNota?: (noteIndex: number) => void;
  onEliminarFoto?: (originalIdx: number) => void;
  onEliminarAudio?: (audioIndex: number) => void;
  audioReproduciendoUrl?: string | null;
}) {
  const [modalFotosAbierto, setModalFotosAbierto] = useState(false);
  const [modalAudiosAbierto, setModalAudiosAbierto] = useState(false);

  if (!itemsSeleccionados || itemsSeleccionados.length === 0) return null;

  const esServicioItem = (it: ItemSeleccionadoRef) =>
    it.type === "SERVICE" ||
    (it.category && it.category.toLowerCase().includes("servicio")) ||
    (it.code && it.code.toUpperCase().startsWith("SRV"));

  const esManual = (it: ItemSeleccionadoRef) =>
    it.category === "Manual" ||
    it.code?.startsWith("MANUAL-") ||
    it.id?.startsWith("manual-") ||
    Boolean((it as any).isManual);

  const productosSeleccionados = itemsSeleccionados
    .filter((it) => !esServicioItem(it))
    .sort((a, b) => (esManual(a) ? 1 : 0) - (esManual(b) ? 1 : 0));

  const serviciosSeleccionados = itemsSeleccionados
    .filter((it) => esServicioItem(it))
    .sort((a, b) => (esManual(a) ? 1 : 0) - (esManual(b) ? 1 : 0));

  const totalProductos = productosSeleccionados.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  const totalServicios = serviciosSeleccionados.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);

  const renderTablaSeccion = (
    items: ItemSeleccionadoRef[],
    esServicio: boolean,
    tituloSeccion: string,
    iconoSeccion: string,
    totalCount: number
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1.5">
        <span
          className={`text-xs font-semibold flex items-center gap-1.5 ${
            esServicio ? "text-purple-700 dark:text-purple-300" : "text-blue-700 dark:text-blue-300"
          }`}
        >
          <span>{iconoSeccion}</span>
          <span>
            {tituloSeccion} ({totalCount}):
          </span>
        </span>

        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black/20 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold">
                <th className="py-2 px-3 w-24 text-center">Cant.</th>
                <th className="py-2 px-3">Descripción</th>
                <th className="py-2 px-2.5 w-28">Detalle</th>
                {mostrarPrecios && (
                  <>
                    <th className="py-2 px-2.5 w-20 text-right">PVP</th>
                    <th className="py-2 px-2.5 w-24 text-right">Subtotal</th>
                  </>
                )}
                <th className="py-2 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
              {items.map((it, idx) => {
                const { nombrePrincipal, caracteristica } = extraerDetalleCaracteristica(it as any);
                const cant = Number(it.qty) || 1;

                return (
                  <tr
                    key={it.id || it.code || `${esServicio ? "srv" : "prod"}-${idx}`}
                    className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-white/[0.04]">
                        {onAgregarItem && (
                          <button
                            type="button"
                            onClick={() => onAgregarItem(it as any, -1)}
                            className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 text-xs font-bold cursor-pointer transition-colors"
                            title="Restar 1"
                          >
                            −
                          </button>
                        )}
                        <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {cant}
                        </span>
                        {onAgregarItem && (
                          <button
                            type="button"
                            onClick={() => onAgregarItem(it as any, 1)}
                            className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 text-xs font-bold cursor-pointer transition-colors"
                            title="Sumar 1"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                      {formatearPrimeraMayuscula(nombrePrincipal)}
                    </td>
                    <td className="py-2 px-2.5">
                      {caracteristica ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            caracteristica === "Manual"
                              ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-500/30"
                              : esServicio
                              ? "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-500/30"
                              : "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-500/30"
                          }`}
                        >
                          {formatearPrimeraMayuscula(caracteristica)}
                        </span>
                      ) : esServicio ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200/70 dark:border-purple-500/30">
                          Servicio
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[10px]">-</span>
                      )}
                    </td>
                    {mostrarPrecios && (
                      <>
                        <td className="py-2 px-2.5 text-right font-mono text-zinc-600 dark:text-zinc-400">
                          ${Number(it.price || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ${(Number(it.price || 0) * cant).toFixed(2)}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-2 text-center">
                      {onEliminarItem && (
                        <button
                          type="button"
                          onClick={() => onEliminarItem(it.id || it.code || it.name)}
                          className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold cursor-pointer transition-colors"
                          title={esServicio ? "Eliminar servicio" : "Eliminar producto"}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="pt-2.5 border-t border-zinc-200/60 dark:border-white/10 space-y-3.5">
      {renderTablaSeccion(productosSeleccionados, false, "Productos", "📦", totalProductos)}
      {renderTablaSeccion(serviciosSeleccionados, true, "Servicios", "🔧", totalServicios)}

      {/* Modal flotante para ver múltiples fotos asociadas */}
      {modalFotosAbierto && fotos && fotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={() => setModalFotosAbierto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-2">
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                📷 Fotos ({fotos.length})
              </span>
              <button
                type="button"
                onClick={() => setModalFotosAbierto(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {fotos.map((f, fIdx) => (
                <div
                  key={f.originalIdx ?? fIdx}
                  onClick={() => {
                    if (onAbrirFoto) {
                      setModalFotosAbierto(false);
                      onAbrirFoto(f.url, fIdx);
                    }
                  }}
                  className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-black/10 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={f.url} alt={`Foto #${fIdx + 1}`} className="w-full h-full object-cover" />
                  {onEliminarFoto && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEliminarFoto(f.originalIdx ?? fIdx);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center cursor-pointer shadow border border-white/20"
                      title="Eliminar foto"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal flotante para reproducir múltiples audios asociados */}
      {modalAudiosAbierto && audios && audios.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={() => setModalAudiosAbierto(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-2">
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                🎙️ Audios ({audios.length})
              </span>
              <button
                type="button"
                onClick={() => setModalAudiosAbierto(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {audios.map((url, aIdx) => {
                const tocando = audioReproduciendoUrl === url;
                return (
                  <div
                    key={aIdx}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03]"
                  >
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Audio #{aIdx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleAudio?.(url)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          tocando
                            ? "bg-amber-500 text-white animate-pulse"
                            : "bg-zinc-200 hover:bg-amber-500 hover:text-white dark:bg-white/10 text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {tocando ? "⏸ Pausar" : "▶ Escuchar"}
                      </button>
                      {onEliminarAudio && (
                        <button
                          type="button"
                          onClick={() => onEliminarAudio(aIdx)}
                          className="w-7 h-7 rounded-lg hover:bg-rose-500/15 text-zinc-400 hover:text-rose-600 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                          title="Eliminar audio"
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
        </div>
      )}
    </div>
  );
}
