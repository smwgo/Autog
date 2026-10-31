"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import type {
  LubricentroConfigData,
  LubPresentationVariant,
  LubVehicleCompatibility,
} from "@/app/api/taller/lubricentro/route";
import {
  ModalDetalleProductoLubricentro,
  ModalProductoLubricentroForm,
  ModalConfiguracionManualLubricentro,
} from "./LubricentroAdminModals";
import ModalHistorialCambiosAceite, {
  ItemHistorialCambioAceite,
} from "./ModalHistorialCambiosAceite";
import {
  DEFAULT_LUBRICENTRO_CONFIG_CLIENT,
} from "./lubricentroDefaults";

export interface ModuloLubricentroCatalogoProps {
  empleadoLogueado: { id: string; nombre: string };
  ordenActiva?: any;
  ordenesAnteriores?: any[];
  historialAnterior?: any[];
  itemsOrden: any[];
  onActualizarItemsOrden: (nuevosItems: any[]) => Promise<void>;
  mostrarToast?: (msg: string, tipo?: "ok" | "err") => void;
  triggerAbrirConfig?: number;
  onIrAAvisoYFirma: () => void;
  onIrAAnterior?: () => void;
  onIrASiguiente?: () => void;
  navegacionActiva?: boolean;
  onGuardarDatosLubricentro?: (
    niveles: Record<string, EstadoNivelLubricentro>,
    nextOilChangeKm: number | null,
    items: any[]
  ) => Promise<void>;
}

interface CartItemLubricentro {
  key: string;
  productId: string;
  code: string;
  name: string;
  brand: string;
  presentation: string;
  unitOfMeasure: string;
  presentationId?: string;
  price: number;
  qty: number;
  maxStock: number;
  imageUrl?: string | null;
  lubCategoryId: string;
  lubSubcategoryId: string;
}

interface ProductoCatalogoLubricentro {
  id: string;
  code?: string;
  name?: string;
  brand?: string;
  type?: string;
  active?: boolean;
  status?: string;
  stock?: number | null;
  price?: number;
  presentation?: string;
  unitOfMeasure?: string;
  imageUrl?: string | null;
  lubCategoryId?: string;
  lubSubcategoryId?: string;
  presentationsAvailable?: LubPresentationVariant[];
  compatibilities?: LubVehicleCompatibility[];
  lubricantBase?: string;
}

interface ItemAnteriorCambioAceite {
  item: {
    type?: string;
    productId?: string;
    presentation?: string;
    presentationId?: string;
    name?: string;
    qty?: number;
    price?: number;
    category?: string;
    brand?: string;
    code?: string;
    unitOfMeasure?: string;
    subCategory?: string;
  };
  product: ProductoCatalogoLubricentro;
}

type EstadoNivelLubricentro = "Verde" | "Amarillo" | "Rojo";
type EstadoComponenteLubricentro = "Pendiente" | "Realizado";

const NIVELES_LUBRICENTRO = [
  { label: "Refrigerante", categoryId: "lub_fluidos", subcategoryId: "lub_flu_coolant" },
  { label: "Frenos", categoryId: "lub_fluidos", subcategoryId: "lub_flu_frenos" },
  { label: "Dirección", categoryId: "lub_fluidos", subcategoryId: "lub_flu_hidraulico" },
  { label: "Aire", categoryId: "lub_filtros", subcategoryId: "lub_fil_aire" },
  { label: "Cabina", categoryId: "lub_filtros", subcategoryId: "lub_fil_cabina" },
  { label: "Corona", categoryId: "lub_transmision", subcategoryId: "lub_trans_diferencial" },
  { label: "Batería", categoryId: "lub_baterias", subcategoryId: null },
] as const;

const COMPONENTES_SERVICIO_LUBRICENTRO = [
  "Aceite motor",
  "Filtro aceite",
  "Filtro aire",
  "Filtro cabina",
  "Filtro combustible",
  "Caja",
  "Corona",
  "Refrigerante",
  "Frenos",
  "Dirección",
  "Batería",
] as const;

const COMBOS_LUBRICENTRO = ["Básico", "Completo", "Caja", "Corona", "Engrase"] as const;

// Caché en el cliente (módulo y localStorage) para que la carga sea instantánea (0ms)
let _lubricentroClientCache: {
  config: any;
  products: any[];
  vehicles: any[];
  timestamp: number;
} | null = null;

const LUBRICENTRO_CACHE_KEY = "taller_lubricentro_cache_v4";

const DEPRECATED_CROSS_SUBCATEGORY_IDS = new Set([
  "lub_valvulina",
  "lub_hidraulico_aceite",
  "lub_frenos_aceite",
  "lub_refrigerante_aceite",
  "lub_limpieza_combustible",
]);

const SUBCATEGORY_LABEL_OVERRIDES: Record<string, string> = {
  lub_aceite_motor: "Motor",
  lub_trans_manual: "Caja",
  lub_trans_diferencial: "Corona",
  lub_fil_aceite: "Aceite",
  lub_fil_aire: "Aire",
  lub_fil_cabina: "Cabina",
  lub_fil_transmision: "Caja",
  lub_flu_hidraulico: "Dirección",
  lub_flu_limpiaparabrisas: "Agua",
  lub_bat_convencionales: "Liviano",
  lub_bat_agm: "Pesado",
  lub_bat_motos: "Liviano",
  lub_bat_efb: "Pesado",
};

const SUBCATEGORY_IDS_BY_CATEGORY: Record<string, string[]> = {
  lub_aceite: ["lub_aceite_motor", "lub_aditivos", "lub_flush", "lub_grasa"],
  lub_transmision: ["lub_trans_manual", "lub_trans_diferencial", "lub_trans_automatica"],
  lub_filtros: [
    "lub_fil_aceite",
    "lub_fil_aire",
    "lub_fil_cabina",
    "lub_fil_combustible",
    "lub_fil_transmision",
  ],
  lub_fluidos: [
    "lub_flu_coolant",
    "lub_flu_frenos",
    "lub_flu_hidraulico",
    "lub_flu_limpiaparabrisas",
  ],
  lub_baterias: ["lub_bat_convencionales", "lub_bat_agm"],
};

const SUBCATEGORY_FILTER_IDS: Record<string, string[]> = {
  lub_bat_convencionales: ["lub_bat_convencionales", "lub_bat_motos"],
  lub_bat_agm: ["lub_bat_agm", "lub_bat_efb"],
};

const ENVASES_CERRADOS = ["Galón", "Litro", "Cuarto", "Caneca"] as const;
type EnvaseCerrado = (typeof ENVASES_CERRADOS)[number];

function clasificarEnvase(value: unknown): EnvaseCerrado | null {
  const texto = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/caneca|5\s*(gal|gallon)/.test(texto)) return "Caneca";
  if (/cuarto|\bqt\b/.test(texto)) return "Cuarto";
  if (/galon|\bgal\b|4\s*l(?:itro)?/.test(texto)) return "Galón";
  if (/litro|\b1\s*l\b|1000\s*ml/.test(texto)) return "Litro";
  return null;
}

function productoTieneEnvase(prod: any, envase: EnvaseCerrado): boolean {
  const presentaciones = [
    prod.presentation,
    prod.unitOfMeasure,
    ...(Array.isArray(prod.presentationsAvailable)
      ? prod.presentationsAvailable.flatMap((variant: LubPresentationVariant) => [
        variant.label,
        variant.unitOfMeasure,
      ])
      : []),
  ];
  return presentaciones.some((value) => clasificarEnvase(value) === envase);
}

const LEGACY_PRODUCT_REMAP: Record<string, { catId: string; subId: string }> = {
  lub_valvulina: { catId: "lub_transmision", subId: "lub_trans_manual" },
  lub_hidraulico_aceite: { catId: "lub_fluidos", subId: "lub_flu_hidraulico" },
  lub_frenos_aceite: { catId: "lub_fluidos", subId: "lub_flu_frenos" },
  lub_refrigerante_aceite: { catId: "lub_fluidos", subId: "lub_flu_coolant" },
  lub_limpieza_combustible: { catId: "lub_aceite", subId: "lub_aditivos" },
};

function normalizarConfigCliente(rawConfig: any): LubricentroConfigData {
  if (!rawConfig) rawConfig = DEFAULT_LUBRICENTRO_CONFIG_CLIENT;
  const defaultSubs = DEFAULT_LUBRICENTRO_CONFIG_CLIENT.subcategories || [];
  const rawSubs = Array.isArray(rawConfig.subcategories) ? rawConfig.subcategories : [];
  const existingIds = new Set(rawSubs.map((s: any) => s.id));
  const mergedSubs = [
    ...rawSubs,
    ...defaultSubs.filter((s: any) => !existingIds.has(s.id)),
  ]
    .filter((s: any) => !DEPRECATED_CROSS_SUBCATEGORY_IDS.has(s.id))
    .map((s: any) => ({
      ...s,
      label: SUBCATEGORY_LABEL_OVERRIDES[s.id] || s.label,
    }));

  return {
    ...DEFAULT_LUBRICENTRO_CONFIG_CLIENT,
    ...rawConfig,
    subcategories: mergedSubs,
  };
}

function normalizarProductosCliente(rawProducts: any[]): any[] {
  const baseList = Array.isArray(rawProducts) ? rawProducts : [];
  return baseList.map((p: any) => {
    const remap = p.lubSubcategoryId ? LEGACY_PRODUCT_REMAP[p.lubSubcategoryId] : undefined;
    if (remap) {
      return {
        ...p,
        lubCategoryId: remap.catId,
        lubSubcategoryId: remap.subId,
      };
    }
    return p;
  });
}

function formatearKilometraje(kilometraje: number): string {
  return String(Math.trunc(kilometraje)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}


// ============================================================================
// CATÁLOGO BASE Y MODELO BENTO PARA LUBRICENTRO MODERNO
// ============================================================================
export interface ItemBentoCatalogo {
  id: string;
  code: string;
  name: string;
  fullName: string;
  brand: string;
  price: number;
  viscosity?: string;
  lubCategoryId: string;
  lubSubcategoryId: string;
  presentation: string;
  unitOfMeasure: string;
  type: string;
  color?: string;
  imageUrl?: string | null;
}

export const BASE_LUBRICENTRO_POS_ITEMS: ItemBentoCatalogo[] = [
  {
    id: "lub_oil_20w50",
    code: "OIL-20W50",
    name: "20W-50",
    fullName: "Aceite 20W-50 Mineral Galón",
    brand: "Shell Helix",
    price: 12.50,
    viscosity: "20W-50",
    lubCategoryId: "lub_aceite",
    lubSubcategoryId: "lub_aceite_motor",
    presentation: "Galón",
    unitOfMeasure: "Galón",
    type: "PART",
    color: "#eab308", // gold/yellow
  },
  {
    id: "lub_oil_10w30",
    code: "OIL-10W30",
    name: "10W-30",
    fullName: "Aceite 10W-30 Semisintético Galón",
    brand: "Shell Helix",
    price: 14.00,
    viscosity: "10W-30",
    lubCategoryId: "lub_aceite",
    lubSubcategoryId: "lub_aceite_motor",
    presentation: "Galón",
    unitOfMeasure: "Galón",
    type: "PART",
    color: "#f59e0b", // amber
  },
  {
    id: "lub_oil_5w30",
    code: "OIL-5W30",
    name: "5W-30",
    fullName: "Aceite 5W-30 Sintético Galón",
    brand: "Shell Helix Ultra",
    price: 18.00,
    viscosity: "5W-30",
    lubCategoryId: "lub_aceite",
    lubSubcategoryId: "lub_aceite_motor",
    presentation: "Galón",
    unitOfMeasure: "Galón",
    type: "PART",
    color: "#2563eb", // blue
  },
  {
    id: "lub_oil_0w20",
    code: "OIL-0W20",
    name: "0W-20",
    fullName: "Aceite 0W-20 Sintético Galón",
    brand: "Mobil 1",
    price: 22.00,
    viscosity: "0W-20",
    lubCategoryId: "lub_aceite",
    lubSubcategoryId: "lub_aceite_motor",
    presentation: "Galón",
    unitOfMeasure: "Galón",
    type: "PART",
    color: "#059669", // emerald
  },
  {
    id: "lub_oil_15w40",
    code: "OIL-15W40",
    name: "15W-40",
    fullName: "Aceite 15W-40 Heavy Duty Galón",
    brand: "Shell Rimula",
    price: 16.00,
    viscosity: "15W-40",
    lubCategoryId: "lub_aceite",
    lubSubcategoryId: "lub_aceite_motor",
    presentation: "Galón",
    unitOfMeasure: "Galón",
    type: "PART",
    color: "#d97706",
  },
  // Filtros
  {
    id: "lub_fil_aceite_std",
    code: "FIL-ACEITE",
    name: "Filtro Aceite",
    fullName: "Filtro de Aceite Blindado Original",
    brand: "Bosch",
    price: 8.50,
    lubCategoryId: "lub_filtros",
    lubSubcategoryId: "lub_fil_aceite",
    presentation: "Unidad",
    unitOfMeasure: "Unidad",
    type: "PART",
  },
  {
    id: "lub_fil_aire_std",
    code: "FIL-AIRE",
    name: "Filtro Aire",
    fullName: "Filtro de Aire Alto Flujo",
    brand: "Mann-Filter",
    price: 8.50,
    lubCategoryId: "lub_filtros",
    lubSubcategoryId: "lub_fil_aire",
    presentation: "Unidad",
    unitOfMeasure: "Unidad",
    type: "PART",
  },
  {
    id: "lub_fil_cabina_std",
    code: "FIL-CABINA",
    name: "Filtro Cabina",
    fullName: "Filtro de Cabina Carbón Activado",
    brand: "Bosch",
    price: 10.00,
    lubCategoryId: "lub_filtros",
    lubSubcategoryId: "lub_fil_cabina",
    presentation: "Unidad",
    unitOfMeasure: "Unidad",
    type: "PART",
  },
  // Fluidos y transmisiones
  {
    id: "lub_flu_refrig_std",
    code: "FLU-REFRIG",
    name: "Refrigerante",
    fullName: "Refrigerante 50/50 Galón",
    brand: "Prestone",
    price: 12.00,
    lubCategoryId: "lub_fluidos",
    lubSubcategoryId: "lub_flu_coolant",
    presentation: "Galón",
    unitOfMeasure: "Galón",
    type: "PART",
  },
  {
    id: "lub_flu_frenos_std",
    code: "FLU-FRENOS",
    name: "Líquido Frenos",
    fullName: "Líquido de Frenos DOT4 500ml",
    brand: "Brembo",
    price: 9.00,
    lubCategoryId: "lub_fluidos",
    lubSubcategoryId: "lub_flu_frenos",
    presentation: "Unidad",
    unitOfMeasure: "Unidad",
    type: "PART",
  },
  {
    id: "lub_trans_corona_std",
    code: "TR-CORONA",
    name: "Aceite Corona",
    fullName: "Aceite Corona / Diferencial 80W-90 Galón",
    brand: "Valvoline",
    price: 14.00,
    lubCategoryId: "lub_transmision",
    lubSubcategoryId: "lub_trans_diferencial",
    presentation: "Galón",
    unitOfMeasure: "Galón",
    type: "PART",
  },
  // Servicios
  {
    id: "lub_srv_engrase_std",
    code: "SRV-ENGRASE",
    name: "Engrase",
    fullName: "Servicio de Engrase General",
    brand: "Lubricentro",
    price: 5.00,
    lubCategoryId: "lub_aceite",
    lubSubcategoryId: "lub_grasa",
    presentation: "Servicio",
    unitOfMeasure: "Servicio",
    type: "SERVICE",
  },
  {
    id: "lub_trans_caja_std",
    code: "TR-CAJA",
    name: "Caja",
    fullName: "Aceite de Transmisión / Caja ATF Galón",
    brand: "Castrol Transmax",
    price: 14.00,
    lubCategoryId: "lub_transmision",
    lubSubcategoryId: "lub_trans_caja",
    presentation: "Galón",
    unitOfMeasure: "Galón",
    type: "PART",
  },
  {
    id: "lub_flu_direccion_std",
    code: "FLU-DIR",
    name: "Dirección",
    fullName: "Líquido de Dirección Asistida 500ml",
    brand: "Motul",
    price: 8.00,
    lubCategoryId: "lub_fluidos",
    lubSubcategoryId: "lub_flu_direccion",
    presentation: "Unidad",
    unitOfMeasure: "Unidad",
    type: "PART",
  },
  {
    id: "lub_flu_plumillas_std",
    code: "FLU-PLUMILLAS",
    name: "Plumillas",
    fullName: "Líquido Parabrisas + Escobillas Plumillas",
    brand: "Bosch Aerotwin",
    price: 7.50,
    lubCategoryId: "lub_fluidos",
    lubSubcategoryId: "lub_flu_limpia",
    presentation: "Par",
    unitOfMeasure: "Par",
    type: "PART",
  },
];

// Gráfico SVG realista de Galón de Aceite estilo Shell / Mobil con etiqueta
function BotellaAceiteGrafico({ viscosidad, color = "#eab308" }: { viscosidad: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 130" className="w-16 h-20 sm:w-20 sm:h-24 drop-shadow-md select-none transition-transform group-hover:scale-105">
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
      <path d="M 16 38 L 16 110" stroke="#475569" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Etiqueta frontal */}
      <rect x="20" y="44" width="48" height="66" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
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
      <text x="44" y="105" fill="#94a3b8" fontSize="7" fontWeight="bold" textAnchor="middle">
        PREMIUM OIL
      </text>
    </svg>
  );
}

export default function ModuloLubricentroCatalogo({
  empleadoLogueado,
  ordenActiva,
  ordenesAnteriores = [],
  historialAnterior = [],
  itemsOrden,
  onActualizarItemsOrden,
  mostrarToast,
  triggerAbrirConfig,
  onGuardarDatosLubricentro,
  onIrAAvisoYFirma,
  onIrAAnterior,
  onIrASiguiente,
  navegacionActiva = false,
}: ModuloLubricentroCatalogoProps) {
  // Inicializar y sincronizar desde Neon PostgreSQL
  const [config, setConfig] = useState<LubricentroConfigData>(() =>
    normalizarConfigCliente(null)
  );
  const [productos, setProductos] = useState<any[]>([]);
  const [vehiculosRegistrados, setVehiculosRegistrados] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [bannerAviso, setBannerAviso] = useState<{
    texto: string;
    tipo: "ok" | "err";
  } | null>(null);

  // Selección de Categoría (Fila 1: "ALL" o id de categoría) y Subcategoría (Fila 2: "ALL" o id de subcategoría)
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("lub_aceite");
  const [mostrarCategorias, setMostrarCategorias] = useState(true);
  const [mostrarSubcategorias, setMostrarSubcategorias] = useState(true);
  const [subcategoriaPorCat, setSubcategoriaPorCat] = useState<Record<string, string>>({
    lub_aceite: "lub_aceite_motor",
    lub_transmision: "ALL",
    lub_filtros: "ALL",
    lub_fluidos: "ALL",
    lub_baterias: "ALL",
  });

  // ---------------------------------------------------------------------------
  // 3. FILTROS DE ACEITES (Aceites -> Motor)
  // ---------------------------------------------------------------------------
  const [filtroBase, setFiltroBase] = useState<string>(""); // "" = Todas, o "Sintético", "Semisintético", "Mineral"
  const [cantidadRequeridaLabel, setCantidadRequeridaLabel] = useState<string>("1 galón");
  const [cantidadRequeridaNum, setCantidadRequeridaNum] = useState<number>(1);
  const [cantidadPersonalizadaActiva, setCantidadPersonalizadaActiva] = useState<boolean>(false);
  const [cantidadPersonalizadaValor, setCantidadPersonalizadaValor] = useState<string>("");
  const [cantidadPersonalizadaUnidad, setCantidadPersonalizadaUnidad] = useState<string>("Litros");

  const [filtroPresentacion, setFiltroPresentacion] = useState<string>("");
  const [filtroViscosidad, setFiltroViscosidad] = useState<string>("");
  const [filtroEspecificacion, setFiltroEspecificacion] = useState<string>("");
  const [filtroMarca, setFiltroMarca] = useState<string>("");

  // ---------------------------------------------------------------------------
  // 4. FILTROS ESPECÍFICOS PARA LAS DEMÁS CATEGORÍAS
  // ---------------------------------------------------------------------------
  const [filtroTipoFluidoTrans, setFiltroTipoFluidoTrans] = useState<string>("");
  const [filtroTipoFiltro, setFiltroTipoFiltro] = useState<string>("");
  const [filtroRefFiltro, setFiltroRefFiltro] = useState<string>("");
  const [filtroAplicacionFiltro, setFiltroAplicacionFiltro] = useState<string>("");
  const [filtroClaseFluido, setFiltroClaseFluido] = useState<string>("");
  const [filtroVoltajeBat, setFiltroVoltajeBat] = useState<string>("");
  const [filtroCapacidadBat, setFiltroCapacidadBat] = useState<string>("");
  const [filtroTecnologiaBat, setFiltroTecnologiaBat] = useState<string>("");
  const [filtroGrupoBat, setFiltroGrupoBat] = useState<string>("");
  const [filtroPolaridadBat, setFiltroPolaridadBat] = useState<string>("");
  const [filtroTipoAditivo, setFiltroTipoAditivo] = useState<string>("");
  const [filtroAplicacionAditivo, setFiltroAplicacionAditivo] = useState<string>("");
  const [filtroTipoGrasa, setFiltroTipoGrasa] = useState<string>("");
  const [filtroAplicacionGrasa, setFiltroAplicacionGrasa] = useState<string>("");

  // ---------------------------------------------------------------------------
  // 6. BUSCADOR GENERAL, PRECIO, DISPONIBILIDAD Y COMPATIBILIDAD VEHICULAR
  // ---------------------------------------------------------------------------
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<
    "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "INACTIVE"
  >("ALL");
  const [precioMin, setPrecioMin] = useState<string>("");
  const [precioMax, setPrecioMax] = useState<string>("");
  const [verTodoElCatalogo, setVerTodoElCatalogo] = useState<boolean>(false);
  const [filtroCategoriaGeneral, setFiltroCategoriaGeneral] = useState<string>("");
  const [menuFiltroAbierto, setMenuFiltroAbierto] = useState<boolean>(false);
  const menuFiltroRef = useRef<HTMLDivElement>(null);
  const [filtroEnvase, setFiltroEnvase] = useState<EnvaseCerrado | "">("");
  const [menuEnvaseAbierto, setMenuEnvaseAbierto] = useState(false);
  const menuEnvaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !menuFiltroRef.current?.contains(target) &&
        !menuEnvaseRef.current?.contains(target)
      ) {
        setMenuFiltroAbierto(false);
        setMenuEnvaseAbierto(false);
      }
    };
    if (menuFiltroAbierto || menuEnvaseAbierto) {
      document.addEventListener("mousedown", handleClickAfuera);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
    };
  }, [menuFiltroAbierto, menuEnvaseAbierto]);

  // Buscador de compatibilidad por vehículo
  const [mostrarBuscadorVehiculo, setMostrarBuscadorVehiculo] = useState<boolean>(false);
  const [vehBrand, setVehBrand] = useState<string>("");
  const [vehModel, setVehModel] = useState<string>("");
  const [vehYear, setVehYear] = useState<string>("");
  const [vehEngine, setVehEngine] = useState<string>("");
  const [soloCompatiblesVerificados, setSoloCompatiblesVerificados] = useState<boolean>(false);

  // Estado local en tarjetas de producto (cantidad y presentación seleccionada por producto)
  const [cantPorProducto, setCantPorProducto] = useState<Record<string, number>>({});
  const [presPorProducto, setPresPorProducto] = useState<Record<string, string>>({});
  const [agregandoId, setAgregandoId] = useState<string | null>(null);

  // Carrito integrado de Lubricentro (cuando se vende directo o sincronizado con Orden Activa)
  const [carritoDirecto, setCarritoDirecto] = useState<CartItemLubricentro[]>([]);
  const [drawerCarritoAbierto, setDrawerCarritoAbierto] = useState<boolean>(false);
  const [drawerTiendaAbierto, setDrawerTiendaAbierto] = useState(false);
  const [pestanaTienda, setPestanaTienda] = useState<"productos" | "servicios">("productos");
  const [enviandoPedidoPos, setEnviandoPedidoPos] = useState<boolean>(false);
  const [clienteVentaDirecta, setClienteVentaDirecta] = useState<string>("");
  const [kilometrajeIngreso, setKilometrajeIngreso] = useState(() =>
    String(ordenActiva?.mileage || "")
  );
  const [fechaReferenciaHistorial, setFechaReferenciaHistorial] = useState<number | null>(null);
  const [mostrarNivelesLubricentro, setMostrarNivelesLubricentro] = useState(false);
  const [mostrarCombosLubricentro, setMostrarCombosLubricentro] = useState(false);
  const [nivelesLubricentro, setNivelesLubricentro] = useState<
    Record<string, EstadoNivelLubricentro>
  >({});
  const [componentesLubricentro, setComponentesLubricentro] = useState<
    Record<string, EstadoComponenteLubricentro>
  >({});
  const [proximoCambioKm, setProximoCambioKm] = useState<number | null>(() =>
    Number(ordenActiva?.nextOilChangeKm) || null
  );
  const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);
  const [repitiendoCambioAceite, setRepitiendoCambioAceite] = useState(false);
  const [mostrarModalHistorialAceite, setMostrarModalHistorialAceite] = useState(false);
  const [historialRemoto, setHistorialRemoto] = useState<{ history: any[]; orders: any[] } | null>(null);
  const [cargandoHistorialRemoto, setCargandoHistorialRemoto] = useState(false);

  // Selección múltiple de productos en la tienda
  const [productosSeleccionadosIds, setProductosSeleccionadosIds] = useState<string[]>([]);
  const [agregandoVarios, setAgregandoVarios] = useState<boolean>(false);

  // Modales administrativos
  const [productoDetalleModal, setProductoDetalleModal] = useState<any | null>(null);
  const [modalProductoFormAbierto, setModalProductoFormAbierto] = useState<boolean>(false);
  const [productoAEditar, setProductoAEditar] = useState<any | null>(null);
  const [modalConfigAbierto, setModalConfigAbierto] = useState<boolean>(false);
  const [tabConfigInicial, setTabConfigInicial] = useState<
    "categorias" | "subcategorias" | "aceites" | "marcas" | "otras_categorias"
  >("categorias");

  // Escuchar trigger de cabecera exterior
  useEffect(() => {
    if (triggerAbrirConfig && triggerAbrirConfig > 0) {
      setTabConfigInicial("categorias");
      setModalConfigAbierto(true);
    }
  }, [triggerAbrirConfig]);

  const notificar = (texto: string, tipo: "ok" | "err" = "ok") => {
    setBannerAviso({ texto, tipo });
    mostrarToast?.(texto, tipo);
    setTimeout(() => {
      setBannerAviso((prev) => (prev?.texto === texto ? null : prev));
    }, 3500);
  };

  // Cargar configuración real y productos de Neon PostgreSQL
  const cargarDatosLubricentro = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/taller/lubricentro?includeInactive=true", {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const cleanConfig = normalizarConfigCliente(data.config);
        const cleanProducts = normalizarProductosCliente(
          Array.isArray(data.products) ? data.products : []
        );
        setConfig(cleanConfig);
        setProductos(cleanProducts);
        setVehiculosRegistrados(Array.isArray(data.vehicles) ? data.vehicles : []);
      }
    } catch (err) {
      console.error("Error cargando Lubricentro desde Neon:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarDatosLubricentro();
    const handleCatalogoActualizado = () => {
      void cargarDatosLubricentro();
    };
    window.addEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    return () => {
      window.removeEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    };
  }, []);

  // Categorías y subcategorías activas ordenadas
  const categoriasActivas = useMemo(() => {
    if (!config) return [];
    return [...config.categories].filter((c) => c.active).sort((a, b) => a.order - b.order);
  }, [config]);

  const categoriaSeleccionadaObj = useMemo(() => {
    if (categoriaActivaId === "ALL") return null;
    return categoriasActivas.find((c) => c.id === categoriaActivaId) || categoriasActivas[0] || null;
  }, [categoriasActivas, categoriaActivaId]);

  const subcategoriasActivas = useMemo(() => {
    if (!config || !categoriaSeleccionadaObj) return [];
    const idsPermitidos = SUBCATEGORY_IDS_BY_CATEGORY[categoriaSeleccionadaObj.id];
    return [...config.subcategories]
      .filter(
        (s) =>
          s.categoryId === categoriaSeleccionadaObj.id &&
          s.active &&
          (!idsPermitidos || idsPermitidos.includes(s.id))
      )
      .sort((a, b) => {
        if (!idsPermitidos) return a.order - b.order;
        return idsPermitidos.indexOf(a.id) - idsPermitidos.indexOf(b.id);
      });
  }, [config, categoriaSeleccionadaObj]);

  const subcategoriaActivaId = useMemo(() => {
    if (!categoriaSeleccionadaObj) return "ALL";
    const guardada = subcategoriaPorCat[categoriaSeleccionadaObj.id];
    if (guardada === "ALL") return "ALL";
    if (guardada && subcategoriasActivas.some((s) => s.id === guardada)) {
      return guardada;
    }
    return "ALL";
  }, [categoriaSeleccionadaObj, subcategoriaPorCat, subcategoriasActivas]);

  const subcategoriaSeleccionadaObj = useMemo(() => {
    if (subcategoriaActivaId === "ALL") return null;
    return subcategoriasActivas.find((s) => s.id === subcategoriaActivaId) || null;
  }, [subcategoriasActivas, subcategoriaActivaId]);

  useEffect(() => {
    const savedLevels = ordenActiva?.inspectionChecklist?.lubricentroLevels;
    const validLevels: Record<string, EstadoNivelLubricentro> = {};
    if (savedLevels && typeof savedLevels === "object") {
      NIVELES_LUBRICENTRO.forEach(({ label }) => {
        const status = savedLevels[label];
        if (status === "Verde" || status === "Amarillo" || status === "Rojo") {
          validLevels[label] = status;
        }
      });
    }
    setNivelesLubricentro(validLevels);
    const savedComponents = ordenActiva?.inspectionChecklist?.lubricentroComponents;
    const validComponents: Record<string, EstadoComponenteLubricentro> = {};
    if (savedComponents && typeof savedComponents === "object") {
      COMPONENTES_SERVICIO_LUBRICENTRO.forEach((label) => {
        const status = savedComponents[label];
        if (status === "Pendiente" || status === "Realizado") {
          validComponents[label] = status;
        }
      });
    }
    setComponentesLubricentro(validComponents);
    setKilometrajeIngreso(String(ordenActiva?.mileage || ""));
    setProximoCambioKm(Number(ordenActiva?.nextOilChangeKm) || null);
  }, [ordenActiva?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFechaReferenciaHistorial(Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const schemaType = categoriaSeleccionadaObj?.schemaType || "aceites";
  const subSchemaType = subcategoriaSeleccionadaObj?.subSchemaType || "aceite_motor";

  // Limpiar filtros incompatibles al cambiar de categoría o subcategoría
  const handleCambiarCategoria = (catId: string) => {
    setCategoriaActivaId(catId);
    setMostrarCategorias(false);
    setMostrarSubcategorias(true);
    setVerTodoElCatalogo(catId === "ALL");
    setFiltroViscosidad("");
    setFiltroBase("");
    setFiltroEspecificacion("");
    setFiltroPresentacion("");
    setFiltroTipoFluidoTrans("");
    setFiltroTipoFiltro("");
    setFiltroRefFiltro("");
    setFiltroAplicacionFiltro("");
    setFiltroClaseFluido("");
    setFiltroVoltajeBat("");
    setFiltroCapacidadBat("");
    setFiltroTecnologiaBat("");
    setFiltroGrupoBat("");
    setFiltroPolaridadBat("");
    setFiltroTipoAditivo("");
    setFiltroAplicacionAditivo("");
    setFiltroTipoGrasa("");
    setFiltroAplicacionGrasa("");
  };

  const handleCambiarSubcategoria = (subId: string) => {
    if (!categoriaSeleccionadaObj) return;
    setMostrarSubcategorias(false);
    setSubcategoriaPorCat((prev) => ({
      ...prev,
      [categoriaSeleccionadaObj.id]: subId,
    }));
    setFiltroViscosidad("");
    setFiltroEspecificacion("");
  };

  // Marcas dinámicas combinadas (configuración + catálogo real)
  const marcasDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    if (config?.brands) {
      config.brands
        .filter((b) => b.active)
        .sort((a, b) => a.order - b.order)
        .forEach((b) => map.set(b.name.toLowerCase(), b.name));
    }
    productos.forEach((p) => {
      if (p.brand && p.brand.trim()) {
        map.set(p.brand.trim().toLowerCase(), p.brand.trim());
      }
    });
    return Array.from(map.values());
  }, [config, productos]);

  // Verificar compatibilidad de un producto con el filtro de vehículo activo
  const evaluarCompatibilidadVehiculo = (prod: any): {
    tieneFiltroVehiculo: boolean;
    compatibleVerificado: boolean;
    detalleMatch?: LubVehicleCompatibility;
  } => {
    const hayFiltroVeh =
      Boolean(vehBrand.trim()) ||
      Boolean(vehModel.trim()) ||
      Boolean(vehYear.trim()) ||
      Boolean(vehEngine.trim());

    const listaComp: LubVehicleCompatibility[] = Array.isArray(prod.compatibilities)
      ? prod.compatibilities
      : [];

    if (!hayFiltroVeh) {
      return {
        tieneFiltroVehiculo: false,
        compatibleVerificado: listaComp.length > 0,
        detalleMatch: listaComp[0],
      };
    }

    const match = listaComp.find((c) => {
      if (!c.verified) return false;
      const bOk =
        !vehBrand.trim() ||
        c.brand.toLowerCase().includes(vehBrand.trim().toLowerCase());
      const mOk =
        !vehModel.trim() ||
        c.model.toLowerCase().includes(vehModel.trim().toLowerCase());
      const eOk =
        !vehEngine.trim() ||
        (c.engine || "").toLowerCase().includes(vehEngine.trim().toLowerCase());
      let yOk = true;
      const yNum = parseInt(vehYear, 10);
      if (!isNaN(yNum)) {
        if (c.yearFrom && yNum < c.yearFrom) yOk = false;
        if (c.yearTo && yNum > c.yearTo) yOk = false;
      }
      return bOk && mOk && eOk && yOk;
    });

    return {
      tieneFiltroVehiculo: true,
      compatibleVerificado: Boolean(match),
      detalleMatch: match,
    };
  };

  // Filtrado dinámico de productos reales
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (pestanaTienda === "servicios") {
        if (p.type !== "SERVICE" || p.active === false || p.status === "Inactivo") return false;
        const price = Number(p.price || 0);
        if (precioMin.trim() && !Number.isNaN(Number(precioMin)) && price < Number(precioMin)) {
          return false;
        }
        if (precioMax.trim() && !Number.isNaN(Number(precioMax)) && price > Number(precioMax)) {
          return false;
        }
        const terms = busquedaTexto
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        const text = [p.name, p.code, p.description, p.brand]
          .map((value) => String(value || ""))
          .join(" ")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return terms.every((term) => text.includes(term));
      }

      if (p.type === "SERVICE") return false;

      // Estado activo/inactivo
      if (filtroDisponibilidad === "INACTIVE") {
        if (p.active !== false && p.status !== "Inactivo") return false;
      } else {
        if (p.active === false || p.status === "Inactivo") return false;
      }

      // Categoría y Subcategoría (salvo que "Ver todo el catálogo" o "ALL" esté activo)
      if (verTodoElCatalogo || categoriaActivaId === "ALL") {
        if (filtroCategoriaGeneral && p.lubCategoryId !== filtroCategoriaGeneral) {
          return false;
        }
      } else {
        if (categoriaSeleccionadaObj && p.lubCategoryId !== categoriaSeleccionadaObj.id) {
          return false;
        }
        if (
          subcategoriaActivaId &&
          subcategoriaActivaId !== "ALL" &&
          p.lubSubcategoryId &&
          !(SUBCATEGORY_FILTER_IDS[subcategoriaActivaId] || [subcategoriaActivaId]).includes(
            p.lubSubcategoryId
          )
        ) {
          return false;
        }
      }

      // Disponibilidad
      const st = Number(p.stock ?? 0);
      const minSt = Number(p.minStock ?? 5);
      if (filtroDisponibilidad === "IN_STOCK" && st <= 0) return false;
      if (filtroDisponibilidad === "LOW_STOCK" && (st <= 0 || st > minSt)) return false;
      if (filtroDisponibilidad === "OUT_OF_STOCK" && st > 0) return false;

      // Rango de precios
      const pr = Number(p.price ?? 0);
      if (precioMin.trim() !== "" && !isNaN(Number(precioMin)) && pr < Number(precioMin)) {
        return false;
      }
      if (precioMax.trim() !== "" && !isNaN(Number(precioMax)) && pr > Number(precioMax)) {
        return false;
      }

      // Marca
      if (
        filtroMarca &&
        (p.brand || "").toLowerCase() !== filtroMarca.toLowerCase()
      ) {
        return false;
      }

      // Presentación comercial
      if (filtroPresentacion) {
        const matchPresPrincipal =
          (p.presentation || "").toLowerCase() === filtroPresentacion.toLowerCase();
        const matchPresVariante =
          Array.isArray(p.presentationsAvailable) &&
          p.presentationsAvailable.some(
            (pv: LubPresentationVariant) =>
              pv.label.toLowerCase() === filtroPresentacion.toLowerCase()
          );
        if (!matchPresPrincipal && !matchPresVariante) return false;
      }

      if (filtroEnvase && !productoTieneEnvase(p, filtroEnvase)) return false;

      // Especificación técnica
      if (filtroEspecificacion) {
        const specs: string[] = Array.isArray(p.specifications) ? p.specifications : [];
        const tieneSpec = specs.some(
          (s) => s.toLowerCase() === filtroEspecificacion.toLowerCase()
        );
        if (!tieneSpec) return false;
      }

      // Filtros específicos según categoría activa
      if (
        schemaType === "aceites" &&
        (subcategoriaActivaId === "ALL" || subSchemaType === "aceite_motor")
      ) {
        if (filtroBase) {
          const normBase = (s: string) =>
            s
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "");
          if (normBase(p.lubricantBase || "") !== normBase(filtroBase)) {
            return false;
          }
        }
        if (
          filtroViscosidad &&
          (p.viscosity || "").toUpperCase() !== filtroViscosidad.toUpperCase()
        ) {
          return false;
        }
      } else if (schemaType === "aceites" && (subSchemaType === "aditivos" || subSchemaType === "flush")) {
        if (
          filtroTipoAditivo &&
          (p.additiveProductType || "").toLowerCase() !== filtroTipoAditivo.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroAplicacionAditivo &&
          (p.additiveApplication || "").toLowerCase() !== filtroAplicacionAditivo.toLowerCase()
        ) {
          return false;
        }
      } else if (schemaType === "aceites" && subSchemaType === "grasas") {
        if (
          filtroTipoGrasa &&
          (p.greaseType || "").toLowerCase() !== filtroTipoGrasa.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroAplicacionGrasa &&
          (p.greaseApplication || "").toLowerCase() !== filtroAplicacionGrasa.toLowerCase()
        ) {
          return false;
        }
      } else if (schemaType === "transmision") {
        if (
          filtroTipoFluidoTrans &&
          (p.fluidType || "").toLowerCase() !== filtroTipoFluidoTrans.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroViscosidad &&
          (p.viscosity || "").toUpperCase() !== filtroViscosidad.toUpperCase()
        ) {
          return false;
        }
      } else if (schemaType === "filtros") {
        if (
          filtroTipoFiltro &&
          (p.filterType || "").toLowerCase() !== filtroTipoFiltro.toLowerCase()
        ) {
          return false;
        }
        if (filtroRefFiltro.trim()) {
          const qRef = filtroRefFiltro.trim().toLowerCase();
          const enSku = (p.code || "").toLowerCase().includes(qRef);
          const enOem = (p.manufacturerCode || "").toLowerCase().includes(qRef);
          if (!enSku && !enOem) return false;
        }
        if (filtroAplicacionFiltro.trim()) {
          const qApp = filtroAplicacionFiltro.trim().toLowerCase();
          const enApp = (p.filterApplication || "").toLowerCase().includes(qApp);
          const enDesc = (p.description || "").toLowerCase().includes(qApp);
          const enComp =
            Array.isArray(p.compatibilities) &&
            p.compatibilities.some((c: LubVehicleCompatibility) =>
              `${c.brand} ${c.model} ${c.engine || ""}`.toLowerCase().includes(qApp)
            );
          if (!enApp && !enDesc && !enComp) return false;
        }
      } else if (schemaType === "fluidos") {
        if (
          filtroClaseFluido &&
          (p.fluidClass || "").toLowerCase() !== filtroClaseFluido.toLowerCase()
        ) {
          return false;
        }
      } else if (schemaType === "baterias") {
        if (
          filtroVoltajeBat &&
          (p.voltage || "").toLowerCase() !== filtroVoltajeBat.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroCapacidadBat &&
          (p.capacityAh || "").toLowerCase() !== filtroCapacidadBat.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroTecnologiaBat &&
          (p.technology || "").toLowerCase() !== filtroTecnologiaBat.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroGrupoBat &&
          (p.dimensionsGroup || "").toLowerCase() !== filtroGrupoBat.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroPolaridadBat &&
          (p.polarity || "").toLowerCase() !== filtroPolaridadBat.toLowerCase()
        ) {
          return false;
        }
      }

      // Compatibilidad vehicular
      if (soloCompatiblesVerificados) {
        const evalComp = evaluarCompatibilidadVehiculo(p);
        if (!evalComp.compatibleVerificado) return false;
      }

      // Barra de búsqueda general (multi-término e insensible a tildes)
      if (busquedaTexto.trim()) {
        const norm = (str: string) =>
          (str || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const terms = norm(busquedaTexto.trim()).split(/\s+/).filter(Boolean);
        const textoCompleto = norm(
          [
            p.name,
            p.brand,
            p.code,
            p.manufacturerCode,
            p.viscosity,
            p.lubricantBase,
            p.presentation,
            p.unitOfMeasure,
            p.description,
            p.filterType,
            p.filterApplication,
            p.fluidType,
            p.fluidClass,
            p.capacityAh,
            p.technology,
            ...(Array.isArray(p.specifications) ? p.specifications : []),
          ]
            .filter(Boolean)
            .join(" ")
        );
        if (!terms.every((t) => textoCompleto.includes(t))) return false;
      }

      return true;
    });
  }, [
    productos,
    filtroDisponibilidad,
    verTodoElCatalogo,
    categoriaActivaId,
    categoriaSeleccionadaObj,
    subcategoriaActivaId,
    precioMin,
    precioMax,
    filtroMarca,
    filtroPresentacion,
    filtroEnvase,
    filtroEspecificacion,
    schemaType,
    subSchemaType,
    filtroBase,
    filtroViscosidad,
    filtroTipoAditivo,
    filtroAplicacionAditivo,
    filtroTipoGrasa,
    filtroAplicacionGrasa,
    filtroTipoFluidoTrans,
    filtroTipoFiltro,
    filtroRefFiltro,
    filtroAplicacionFiltro,
    filtroClaseFluido,
    filtroVoltajeBat,
    filtroCapacidadBat,
    filtroTecnologiaBat,
    filtroGrupoBat,
    filtroPolaridadBat,
    soloCompatiblesVerificados,
    vehBrand,
    vehModel,
    vehYear,
    vehEngine,
    busquedaTexto,
    filtroCategoriaGeneral,
    pestanaTienda,
  ]);

  const productosTiendaFiltrados = productosFiltrados;

  // Chips de filtros activos para poder eliminarlos individualmente o limpiar todo
  const chipsFiltrosActivos = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (busquedaTexto.trim()) {
      chips.push({
        key: "q",
        label: `Búsqueda: "${busquedaTexto}"`,
        onClear: () => setBusquedaTexto(""),
      });
    }
    if (filtroBase) {
      chips.push({
        key: "base",
        label: `Base: ${filtroBase}`,
        onClear: () => setFiltroBase(""),
      });
    }
    if (filtroViscosidad) {
      chips.push({
        key: "visc",
        label: `Viscosidad: ${filtroViscosidad}`,
        onClear: () => setFiltroViscosidad(""),
      });
    }
    if (filtroPresentacion) {
      chips.push({
        key: "pres",
        label: `Presentación: ${filtroPresentacion}`,
        onClear: () => setFiltroPresentacion(""),
      });
    }
    if (filtroEnvase) {
      chips.push({
        key: "envase",
        label: `Envase: ${filtroEnvase}`,
        onClear: () => setFiltroEnvase(""),
      });
    }
    if (filtroEspecificacion) {
      chips.push({
        key: "spec",
        label: `Norma: ${filtroEspecificacion}`,
        onClear: () => setFiltroEspecificacion(""),
      });
    }
    if (filtroMarca) {
      chips.push({
        key: "brand",
        label: `Marca: ${filtroMarca}`,
        onClear: () => setFiltroMarca(""),
      });
    }
    if (filtroTipoFluidoTrans) {
      chips.push({
        key: "fluidType",
        label: `Fluido: ${filtroTipoFluidoTrans}`,
        onClear: () => setFiltroTipoFluidoTrans(""),
      });
    }
    if (filtroTipoFiltro) {
      chips.push({
        key: "filterType",
        label: `Tipo Filtro: ${filtroTipoFiltro}`,
        onClear: () => setFiltroTipoFiltro(""),
      });
    }
    if (filtroRefFiltro) {
      chips.push({
        key: "filterRef",
        label: `Ref/Código: ${filtroRefFiltro}`,
        onClear: () => setFiltroRefFiltro(""),
      });
    }
    if (filtroAplicacionFiltro) {
      chips.push({
        key: "filterApp",
        label: `Aplicación: ${filtroAplicacionFiltro}`,
        onClear: () => setFiltroAplicacionFiltro(""),
      });
    }
    if (filtroClaseFluido) {
      chips.push({
        key: "fluidClass",
        label: `Clase: ${filtroClaseFluido}`,
        onClear: () => setFiltroClaseFluido(""),
      });
    }
    if (filtroVoltajeBat) {
      chips.push({
        key: "volt",
        label: `Voltaje: ${filtroVoltajeBat}`,
        onClear: () => setFiltroVoltajeBat(""),
      });
    }
    if (filtroCapacidadBat) {
      chips.push({
        key: "cap",
        label: `Capacidad: ${filtroCapacidadBat}`,
        onClear: () => setFiltroCapacidadBat(""),
      });
    }
    if (filtroTecnologiaBat) {
      chips.push({
        key: "tech",
        label: `Tecnología: ${filtroTecnologiaBat}`,
        onClear: () => setFiltroTecnologiaBat(""),
      });
    }
    if (filtroGrupoBat) {
      chips.push({
        key: "grp",
        label: `Grupo: ${filtroGrupoBat}`,
        onClear: () => setFiltroGrupoBat(""),
      });
    }
    if (filtroPolaridadBat) {
      chips.push({
        key: "pol",
        label: `Polaridad: ${filtroPolaridadBat}`,
        onClear: () => setFiltroPolaridadBat(""),
      });
    }
    if (filtroTipoAditivo) {
      chips.push({
        key: "addType",
        label: `Tipo: ${filtroTipoAditivo}`,
        onClear: () => setFiltroTipoAditivo(""),
      });
    }
    if (filtroAplicacionAditivo) {
      chips.push({
        key: "addApp",
        label: `Aplicación: ${filtroAplicacionAditivo}`,
        onClear: () => setFiltroAplicacionAditivo(""),
      });
    }
    if (filtroTipoGrasa) {
      chips.push({
        key: "grType",
        label: `Grasa: ${filtroTipoGrasa}`,
        onClear: () => setFiltroTipoGrasa(""),
      });
    }
    if (filtroAplicacionGrasa) {
      chips.push({
        key: "grApp",
        label: `Aplicación: ${filtroAplicacionGrasa}`,
        onClear: () => setFiltroAplicacionGrasa(""),
      });
    }
    if (precioMin || precioMax) {
      chips.push({
        key: "price",
        label: `Precio: $${precioMin || "0"} - $${precioMax || "∞"}`,
        onClear: () => {
          setPrecioMin("");
          setPrecioMax("");
        },
      });
    }
    if (filtroDisponibilidad !== "ALL") {
      chips.push({
        key: "disp",
        label: `Disponibilidad: ${filtroDisponibilidad}`,
        onClear: () => setFiltroDisponibilidad("ALL"),
      });
    }
    if (soloCompatiblesVerificados) {
      chips.push({
        key: "vehComp",
        label: `Compatibilidad Verificada (${vehBrand || "Auto"} ${vehModel || ""})`,
        onClear: () => setSoloCompatiblesVerificados(false),
      });
    }
    return chips;
  }, [
    busquedaTexto,
    filtroBase,
    filtroViscosidad,
    filtroPresentacion,
    filtroEnvase,
    filtroEspecificacion,
    filtroMarca,
    filtroTipoFluidoTrans,
    filtroTipoFiltro,
    filtroRefFiltro,
    filtroAplicacionFiltro,
    filtroClaseFluido,
    filtroVoltajeBat,
    filtroCapacidadBat,
    filtroTecnologiaBat,
    filtroGrupoBat,
    filtroPolaridadBat,
    filtroTipoAditivo,
    filtroAplicacionAditivo,
    filtroTipoGrasa,
    filtroAplicacionGrasa,
    precioMin,
    precioMax,
    filtroDisponibilidad,
    soloCompatiblesVerificados,
    vehBrand,
    vehModel,
  ]);

  const limpiarTodosLosFiltros = () => {
    chipsFiltrosActivos.forEach((c) => c.onClear());
    setVerTodoElCatalogo(false);
  };

  // Validar en el servidor (Neon) precio y stock antes de agregar al carrito / orden
  const handleValidarYAgregarAlCarrito = async (
    prod: any,
    cantidadSolicitada: number,
    presentationId?: string
  ) => {
    setAgregandoId(prod.id);
    try {
      const res = await fetch("/api/taller/lubricentro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VALIDAR_Y_AGREGAR_CARRITO",
          productId: prod.id,
          quantity: cantidadSolicitada,
          presentationId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notificar(data.error || "No hay stock suficiente para este producto.", "err");
        return;
      }

      const validado = data.validatedItem;
      const detalleReq =
        schemaType === "aceites" && subSchemaType === "aceite_motor"
          ? ` • Req. cliente: ${cantidadPersonalizadaActiva && cantidadPersonalizadaValor
            ? `${cantidadPersonalizadaValor} ${cantidadPersonalizadaUnidad}`
            : cantidadRequeridaLabel
          }`
          : "";

      const nombreEnOrden = `${validado.name} [${validado.presentation}]${detalleReq}`;

      // 1. Si hay una orden activa en el taller/lubricentro, se integra directamente a los ítems de la orden
      if (ordenActiva?.id) {
        const idxExistente = itemsOrden.findIndex(
          (it) =>
            it.productId === validado.productId &&
            it.presentation === validado.presentation
        );

        let nuevosItems: any[];
        if (idxExistente >= 0) {
          const nuevaCant = (Number(itemsOrden[idxExistente].qty) || 1) + validado.qty;
          if (nuevaCant > validado.availableStock) {
            notificar(
              `Stock máximo disponible (${validado.availableStock}) alcanzado para ${validado.name}.`,
              "err"
            );
            return;
          }
          nuevosItems = itemsOrden.map((it, idx) =>
            idx === idxExistente
              ? { ...it, qty: nuevaCant, price: validado.price }
              : it
          );
        } else {
          const nuevoItem = {
            id: `lub-${validado.code}-${Date.now()}`,
            productId: validado.productId,
            type: "PART" as const,
            category: `Lubricentro - ${categoriaSeleccionadaObj?.label || "Catálogo"}`,
            subCategory: validado.lubSubcategoryId || subcategoriaActivaId,
            code: validado.code,
            name: nombreEnOrden,
            presentation: validado.presentation,
            unitOfMeasure: validado.unitOfMeasure,
            price: validado.price,
            qty: validado.qty,
            status: "Listo" as const,
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          };
          nuevosItems = [...itemsOrden, nuevoItem];
        }

        await onActualizarItemsOrden(nuevosItems);
        notificar(
          `✓ Agregado a Orden #${ordenActiva.orderNumber || ordenActiva.plate}: ${validado.qty}x ${validado.name} (${validado.presentation})`,
          "ok"
        );
      }

      // 2. También actualizamos el carrito de Lubricentro
      setCarritoDirecto((prev) => {
        const key = `${validado.productId}_${validado.presentation}`;
        const idx = prev.findIndex((x) => x.key === key);
        if (idx >= 0) {
          const nextQty = Math.min(validado.availableStock, prev[idx].qty + validado.qty);
          return prev.map((x, i) =>
            i === idx ? { ...x, qty: nextQty, price: validado.price } : x
          );
        }
        return [
          ...prev,
          {
            key,
            productId: validado.productId,
            code: validado.code,
            name: validado.name,
            brand: validado.brand || "",
            presentation: validado.presentation,
            unitOfMeasure: validado.unitOfMeasure || "Unidad",
            presentationId,
            price: validado.price,
            qty: validado.qty,
            maxStock: validado.availableStock,
            imageUrl: validado.imageUrl,
            lubCategoryId: validado.lubCategoryId,
            lubSubcategoryId: validado.lubSubcategoryId,
          },
        ];
      });

      if (!ordenActiva?.id) {
        notificar(
          `✓ Agregado al Carrito: ${validado.qty}x ${validado.name} ($${Number(validado.price).toFixed(2)})`,
          "ok"
        );
      }
    } catch (err: any) {
      notificar(err?.message || "Error al validar producto", "err");
    } finally {
      setAgregandoId(null);
    }
  };


  // Agregar producto directo con botón amarillo [Agregar] del catálogo
  const handleAgregarProductoDirecto = async (prod: any) => {
    setAgregandoId(prod.id);
    try {
      const precio = Number(prod.price || 0);
      const presentacion = prod.presentation || prod.unitOfMeasure || "1 Litro";
      const nuevoItem = {
        id: `it_${prod.id}_${Date.now()}`,
        key: `key_${prod.id}_${Date.now()}`,
        type: (prod.type || "PART") as "PART" | "SERVICE",
        category: `Lubricentro - ${categoriaSeleccionadaObj?.label || "Catálogo"}`,
        subCategory: subcategoriaActivaId,
        code: prod.code,
        productId: prod.id,
        name: prod.name,
        brand: prod.brand,
        presentation: presentacion,
        unitOfMeasure: prod.unitOfMeasure || "Unidad",
        price: precio,
        qty: 1,
        status: "Listo" as const,
        completed: true,
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      };

      if (ordenActiva) {
        const nuevos = [...itemsOrden, nuevoItem];
        await onActualizarItemsOrden(nuevos);
        notificar(`✓ Agregado a la orden: ${prod.name}`, "ok");
      } else {
        setCarritoDirecto((prev) => {
          const existe = prev.findIndex((c) => c.productId === prod.id && c.presentation === presentacion);
          if (existe >= 0) {
            const copia = [...prev];
            copia[existe] = { ...copia[existe], qty: copia[existe].qty + 1 };
            return copia;
          }
          return [
            ...prev,
            {
              key: nuevoItem.key,
              productId: prod.id,
              code: prod.code,
              name: prod.name,
              brand: prod.brand,
              presentation: presentacion,
              unitOfMeasure: prod.unitOfMeasure || "Unidad",
              price: precio,
              qty: 1,
              maxStock: prod.stock || 999,
              imageUrl: prod.imageUrl,
              lubCategoryId: prod.lubCategoryId || categoriaActivaId,
              lubSubcategoryId: prod.lubSubcategoryId || subcategoriaActivaId,
            },
          ];
        });
        notificar(`✓ Agregado al carrito: ${prod.name}`, "ok");
      }
    } finally {
      setAgregandoId(null);
    }
  };

  // Agregar múltiples productos seleccionados simultáneamente a la orden o al carrito
  const handleAgregarVariosSeleccionados = async () => {
    if (productosSeleccionadosIds.length === 0) return;
    const prodsToAdd = productos.filter((p) => productosSeleccionadosIds.includes(p.id));
    if (prodsToAdd.length === 0) return;

    setAgregandoVarios(true);
    try {
      if (ordenActiva) {
        const timestamp = Date.now();
        const nuevosItems = prodsToAdd.map((prod, idx) => {
          const precio = Number(prod.price || 0);
          const presentacion = prod.presentation || prod.unitOfMeasure || "1 Litro";
          return {
            id: `it_${prod.id}_${timestamp}_${idx}`,
            key: `key_${prod.id}_${timestamp}_${idx}`,
            type: (prod.type || "PART") as "PART" | "SERVICE",
            category: `Lubricentro - ${categoriaSeleccionadaObj?.label || "Catálogo"}`,
            subCategory: subcategoriaActivaId,
            code: prod.code,
            productId: prod.id,
            name: prod.name,
            brand: prod.brand,
            presentation: presentacion,
            unitOfMeasure: prod.unitOfMeasure || "Unidad",
            price: precio,
            qty: 1,
            status: "Listo" as const,
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          };
        });

        await onActualizarItemsOrden([...itemsOrden, ...nuevosItems]);
        notificar(`✓ Se agregaron ${nuevosItems.length} productos a la orden`, "ok");
      } else {
        setCarritoDirecto((prev) => {
          const copia = [...prev];
          const timestamp = Date.now();
          prodsToAdd.forEach((prod, idx) => {
            const presentacion = prod.presentation || prod.unitOfMeasure || "1 Litro";
            const precio = Number(prod.price || 0);
            const existe = copia.findIndex((c) => c.productId === prod.id && c.presentation === presentacion);
            if (existe >= 0) {
              copia[existe] = { ...copia[existe], qty: copia[existe].qty + 1 };
            } else {
              copia.push({
                key: `key_${prod.id}_${timestamp}_${idx}`,
                productId: prod.id,
                code: prod.code,
                name: prod.name,
                brand: prod.brand,
                presentation: presentacion,
                unitOfMeasure: prod.unitOfMeasure || "Unidad",
                price: precio,
                qty: 1,
                maxStock: prod.stock || 999,
                imageUrl: prod.imageUrl,
                lubCategoryId: prod.lubCategoryId || categoriaActivaId,
                lubSubcategoryId: prod.lubSubcategoryId || subcategoriaActivaId,
              });
            }
          });
          return copia;
        });
        notificar(`✓ Se agregaron ${prodsToAdd.length} productos al pedido`, "ok");
      }
      setProductosSeleccionadosIds([]);
    } catch (err: any) {
      notificar(err?.message || "Error al agregar productos", "err");
    } finally {
      setAgregandoVarios(false);
    }
  };

  // Enviar carrito directo a POS (/api/solicitudes) validando cada ítem en el servidor
  const handleEnviarCarritoDirectoAPos = async () => {
    if (carritoDirecto.length === 0) return;
    setEnviandoPedidoPos(true);
    try {
      // Re-validar precio y stock en el servidor antes de procesar la compra
      for (const item of carritoDirecto) {
        const vRes = await fetch("/api/taller/lubricentro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "VALIDAR_Y_AGREGAR_CARRITO",
            productId: item.productId,
            quantity: item.qty,
            presentationId: item.presentationId,
          }),
        });
        const vData = await vRes.json();
        if (!vRes.ok || !vData.success) {
          throw new Error(
            vData.error || `Stock insuficiente para ${item.name}`
          );
        }
      }

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TIENDA",
          customerName:
            clienteVentaDirecta.trim() ||
            ordenActiva?.client ||
            "Cliente Lubricentro",
          customerPhone: ordenActiva?.clientPhone || "0999999999",
          vehicleInfo: ordenActiva
            ? `${ordenActiva.vehicle} (${ordenActiva.plate})`
            : "Venta Directa Lubricentro",
          notes: "Pedido validado desde Módulo Lubricentro",
          items: carritoDirecto.map((c) => ({
            productId: c.productId,
            code: c.code,
            name: `${c.name} (${c.presentation})`,
            quantity: c.qty,
            price: c.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo enviar el pedido al POS");
      }

      notificar(
        `✓ Pedido #${data.solicitud?.requestNumber || ""} enviado a Caja POS correctamente.`,
        "ok"
      );
      setCarritoDirecto([]);
      setDrawerCarritoAbierto(false);
    } catch (err: any) {
      notificar(err?.message || "Error al procesar envío a POS", "err");
    } finally {
      setEnviandoPedidoPos(false);
    }
  };

  // Conteo de productos por categoría y subcategoría
  const conteoProductosPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    productos.forEach((p) => {
      if (p.active !== false && p.status !== "Inactivo") {
        map[p.lubCategoryId] = (map[p.lubCategoryId] || 0) + 1;
      }
    });
    return map;
  }, [productos]);

  const conteoProductosPorSubcategoria = useMemo(() => {
    const map: Record<string, number> = {};
    productos.forEach((p) => {
      if (p.active !== false && p.status !== "Inactivo" && p.lubSubcategoryId) {
        map[p.lubSubcategoryId] = (map[p.lubSubcategoryId] || 0) + 1;
        Object.entries(SUBCATEGORY_FILTER_IDS).forEach(([canonicalId, sourceIds]) => {
          if (p.lubSubcategoryId !== canonicalId && sourceIds.includes(p.lubSubcategoryId)) {
            map[canonicalId] = (map[canonicalId] || 0) + 1;
          }
        });
      }
    });
    return map;
  }, [productos]);

  // Obtener la presentación y precio seleccionado actualmente en tarjeta para un producto
  const obtenerPresentacionYPrecio = (prod: any) => {
    const variantes: LubPresentationVariant[] = Array.isArray(prod.presentationsAvailable)
      ? prod.presentationsAvailable
      : [];
    const presElegidaId = presPorProducto[prod.id];
    const varianteEnvase = filtroEnvase
      ? variantes.find(
        (variant) =>
          clasificarEnvase(variant.label) === filtroEnvase ||
          clasificarEnvase(variant.unitOfMeasure) === filtroEnvase
      )
      : undefined;
    const varianteGuardada = presElegidaId
      ? variantes.find((v) => v.id === presElegidaId || v.label === presElegidaId)
      : undefined;
    const varianteActiva = varianteEnvase || varianteGuardada || variantes[0];

    const presentation =
      varianteActiva?.label || prod.presentation || prod.unitOfMeasure || "1 Unidad";
    const price = Number(varianteActiva?.price ?? prod.price ?? 0);
    const unitOfMeasure = varianteActiva?.unitOfMeasure || prod.unitOfMeasure || "Unidad";

    return { presentation, price, unitOfMeasure, variantes };
  };

  const obtenerPalabraClaveProducto = (prod: any): string => {
    const viscosidad = String(prod.viscosity || "").trim();
    const claseFluido = String(prod.fluidClass || "").trim();
    const claseDot = claseFluido.match(/\bDOT\s*\d+\b/i)?.[0].replace(/\s+/g, "");
    const proporcionFluido = claseFluido.match(/\b\d+\s*\/\s*\d+\b/)?.[0];
    const categoriaId = String(prod.lubCategoryId || categoriaActivaId);
    const subcategoriaId = String(prod.lubSubcategoryId || "");
    const palabrasClave = [
      viscosidad,
      claseDot || proporcionFluido || claseFluido.split(/\s+/)[0],
      categoriaId === "lub_filtros" || subcategoriaId.startsWith("lub_fil")
        ? "Filtro"
        : String(prod.filterType || "").split(/\s+/)[0],
      String(prod.capacityAh || "").split(/[ /]+/)[0],
      String(prod.voltage || "").split(/\s+/)[0],
      String(prod.additiveProductType || "").split(/\s+/)[0],
      String(prod.greaseType || "").split(/\s+/)[0],
      String(prod.technology || "").split(/\s+/)[0],
      String(prod.name || "").trim().split(/\s+/)[0],
    ];

    return palabrasClave.find((palabra) => palabra.length > 0) || "Producto";
  };

  // Cantidad actual de un producto (y su presentación activa) en la Orden o Carrito
  const obtenerCantidadEnPedido = (prod: any, presentation: string): number => {
    if (ordenActiva) {
      const matches = itemsOrden.filter(
        (it) =>
          (it.productId === prod.id ||
            it.id === prod.id ||
            it.id?.startsWith?.(`it_${prod.id}_`) ||
            (it.code && prod.code && it.code === prod.code)) &&
          (!it.presentation || it.presentation === presentation)
      );
      return matches.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    }
    const found = carritoDirecto.find(
      (c) => c.productId === prod.id && c.presentation === presentation
    );
    return found ? found.qty : 0;
  };

  // Ajustar (+1 / -1) la cantidad de un producto de forma inmediata y automática
  const handleAjustarCantidadProducto = async (
    prod: any,
    delta: number,
    presentationOverride?: string,
    priceOverride?: number
  ) => {
    const { presentation, price, unitOfMeasure } = obtenerPresentacionYPrecio(prod);
    const finalPres = presentationOverride || presentation;
    const finalPrice = priceOverride ?? price;

    setAgregandoId(prod.id);
    try {
      if (ordenActiva) {
        const idx = itemsOrden.findIndex(
          (it) =>
            (it.productId === prod.id ||
              it.id === prod.id ||
              it.id?.startsWith?.(`it_${prod.id}_`) ||
              (it.code && prod.code && it.code === prod.code)) &&
            (!it.presentation || it.presentation === finalPres)
        );

        if (idx >= 0) {
          const actualQty = Number(itemsOrden[idx].qty) || 1;
          const nextQty = actualQty + delta;
          if (nextQty <= 0) {
            const filtrados = itemsOrden.filter((_, i) => i !== idx);
            await onActualizarItemsOrden(filtrados);
          } else {
            const actualizados = itemsOrden.map((it, i) =>
              i === idx ? { ...it, qty: nextQty, price: finalPrice, presentation: finalPres } : it
            );
            await onActualizarItemsOrden(actualizados);
          }
        } else if (delta > 0) {
          const catLabel =
            categoriasActivas.find((c) => c.id === prod.lubCategoryId)?.label ||
            categoriaSeleccionadaObj?.label ||
            "Catálogo";
          const nuevoItem = {
            id: `it_${prod.id}_${Date.now()}`,
            key: `key_${prod.id}_${Date.now()}`,
            type: (prod.type || "PART") as "PART" | "SERVICE",
            category: `Lubricentro - ${catLabel}`,
            subCategory: prod.lubSubcategoryId || subcategoriaActivaId,
            code: prod.code,
            productId: prod.id,
            name: `${prod.name} (${finalPres})`,
            brand: prod.brand,
            presentation: finalPres,
            unitOfMeasure,
            price: finalPrice,
            qty: delta,
            status: "Listo" as const,
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          };
          await onActualizarItemsOrden([...itemsOrden, nuevoItem]);
        }
      } else {
        setCarritoDirecto((prev) => {
          const idx = prev.findIndex(
            (c) => c.productId === prod.id && c.presentation === finalPres
          );
          if (idx >= 0) {
            const nextQty = prev[idx].qty + delta;
            if (nextQty <= 0) {
              return prev.filter((_, i) => i !== idx);
            }
            return prev.map((c, i) =>
              i === idx ? { ...c, qty: nextQty, price: finalPrice } : c
            );
          }
          if (delta <= 0) return prev;
          return [
            ...prev,
            {
              key: `${prod.id}_${finalPres}`,
              productId: prod.id,
              code: prod.code,
              name: prod.name,
              brand: prod.brand || "",
              presentation: finalPres,
              unitOfMeasure,
              price: finalPrice,
              qty: delta,
              maxStock: prod.stock || 999,
              imageUrl: prod.imageUrl,
              lubCategoryId: prod.lubCategoryId || categoriaActivaId,
              lubSubcategoryId: prod.lubSubcategoryId || subcategoriaActivaId,
            },
          ];
        });
      }
    } finally {
      setAgregandoId(null);
    }
  };

  // Conteo de ítems en el pedido/orden por categoría para mostrar badge automático
  const conteoEnPedidoPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    if (ordenActiva) {
      itemsOrden.forEach((it) => {
        const prod = productos.find(
          (p) => p.id === it.productId || (p.code && it.code && p.code === it.code)
        );
        if (prod?.lubCategoryId) {
          map[prod.lubCategoryId] = (map[prod.lubCategoryId] || 0) + (Number(it.qty) || 1);
        }
      });
    } else {
      carritoDirecto.forEach((c) => {
        if (c.lubCategoryId) {
          map[c.lubCategoryId] = (map[c.lubCategoryId] || 0) + c.qty;
        }
      });
    }
    return map;
  }, [ordenActiva, itemsOrden, carritoDirecto, productos]);

  // Ítems de Lubricentro en la orden activa
  const itemsLubricentroEnOrden = useMemo(() => {
    return (itemsOrden || []).filter((it) => {
      const cat = String(it.category || "").toLowerCase();
      const idStr = String(it.id || "");
      const code = String(it.code || "");
      return (
        cat.includes("lubricentro") ||
        idStr.startsWith("lub-") ||
        idStr.startsWith("it_lub") ||
        code.startsWith("LUB-") ||
        productos.some((p) => p.id === it.productId || (p.code && p.code === code))
      );
    });
  }, [itemsOrden, productos]);

  const ultimoCambioAceiteAnterior = useMemo(() => {
    if (!ordenActiva?.id || !ordenActiva?.plate) return null;
    const placaActiva = String(ordenActiva.plate).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const ordenesOrdenadas = [...ordenesAnteriores]
      .filter(
        (order) =>
          order?.id !== ordenActiva.id &&
          String(order?.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === placaActiva
      )
      .sort(
        (a, b) =>
          new Date(b.dateIn || b.createdAt || 0).getTime() -
          new Date(a.dateIn || a.createdAt || 0).getTime()
      );

    const normalizarNombre = (name: unknown) =>
      String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/^\s*\d+\s*x\s*/i, "")
        .trim();
    const encontrarProducto = (item: any) => {
      const historicalName = normalizarNombre(item.name);
      return productos.find(
        (product) =>
          product.id === item.productId ||
          (product.code && item.code && product.code === item.code) ||
          (historicalName &&
            [normalizarNombre(product.name), normalizarNombre(item.presentation)].some(
              (name) =>
                name &&
                (historicalName === name ||
                  historicalName.startsWith(`${name} (`) ||
                  historicalName.startsWith(`${name} `))
            ))
      );
    };
    const esProductoAceite = (item: any, product: any) => {
      if (
        product?.lubCategoryId === "lub_aceite" &&
        product?.lubSubcategoryId === "lub_aceite_motor"
      ) {
        return true;
      }
      const itemName = normalizarNombre(item.name);
      const itemCategory = normalizarNombre(item.category);
      return (
        (itemCategory.includes("lubricentro") || itemCategory.includes("aceite")) &&
        (/\baceite\b|\boil\b/.test(itemName) || /\b\d{1,2}w-\d{2}\b/i.test(itemName))
      );
    };
    const esFiltroAceite = (_item: unknown, product: ProductoCatalogoLubricentro) =>
      product?.lubCategoryId === "lub_filtros" &&
      product?.lubSubcategoryId === "lub_fil_aceite";
    const esProductoLubricentro = (item: any, product: any) =>
      Boolean(
        product?.lubCategoryId ||
        String(item.category || "").toLowerCase().includes("lubricentro") ||
        String(item.id || "").startsWith("lub-") ||
        String(item.id || "").startsWith("it_lub") ||
        String(item.code || "").startsWith("LUB-")
      );

    const pedidosAnteriores: Array<{
      order: any;
      products: Array<{ item: any; product: any }>;
    }> = ordenesOrdenadas.map((order) => ({
      order,
      products: (Array.isArray(order.items) ? order.items : [])
        .map((item: any) => ({ item, product: encontrarProducto(item) || item }))
        .filter((entry: { item: any; product: any }) =>
          esProductoLubricentro(entry.item, entry.product)
        ),
    }));

    const historialOrdenado: Array<{
      order: any;
      products: Array<{ item: any; product: any }>;
    }> = [...historialAnterior]
      .filter(
        (entry) =>
          String(entry?.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === placaActiva
      )
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt || 0).getTime() -
          new Date(a.date || a.createdAt || 0).getTime()
      )
      .map((entry) => ({
        order: entry,
        products: (Array.isArray(entry.services) ? entry.services : [])
          .map((service: any) => {
            const item =
              typeof service === "string" ? { name: service, category: "Lubricentro" } : service;
            return { item, product: encontrarProducto(item) };
          })
          .filter((entry: { item: any; product: any }) =>
            entry.product && esProductoLubricentro(entry.item, entry.product)
          ),
      }));

    const cambiosAnteriores = [...pedidosAnteriores, ...historialOrdenado].sort(
      (a, b) =>
        new Date(b.order.dateIn || b.order.date || b.order.createdAt || 0).getTime() -
        new Date(a.order.dateIn || a.order.date || a.order.createdAt || 0).getTime()
    );

    for (const cambio of cambiosAnteriores) {
      const catalogItems = cambio.products;
      const includesEngineOil = catalogItems.some(({ item, product }) =>
        esProductoAceite(item, product)
      );
      if (!includesEngineOil) continue;

      const productsToRepeat = catalogItems.filter(
        ({ item, product }) =>
          item.type !== "SERVICE" &&
          (esProductoAceite(item, product) || esFiltroAceite(item, product)) &&
          (product?.id || item.productId || item.code)
      );
      if (productsToRepeat.length > 0) {
        return { order: cambio.order, products: productsToRepeat };
      }
    }

    return null;
  }, [ordenActiva?.id, ordenActiva?.plate, ordenesAnteriores, historialAnterior, productos]);

  const intervaloAceiteEnCarrito = useMemo(() => {
    const items = ordenActiva?.id ? itemsLubricentroEnOrden : carritoDirecto;
    for (const item of items) {
      const prod = productos.find(
        (candidate) =>
          candidate.id === item.productId ||
          (candidate.code && item.code && candidate.code === item.code)
      );
      if (
        !prod ||
        prod.lubCategoryId !== "lub_aceite" ||
        prod.lubSubcategoryId !== "lub_aceite_motor"
      ) {
        continue;
      }

      const base = String(prod.lubricantBase || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[\s-]/g, "");
      if (base.includes("semisintetico")) return 5000;
      if (base.includes("sintetico")) return 10000;
      if (base.includes("mineral")) return 5000;
    }
    return null;
  }, [ordenActiva?.id, itemsLubricentroEnOrden, carritoDirecto, productos]);

  useEffect(() => {
    const mileage = parseInt(String(kilometrajeIngreso || "").replace(/[^0-9]/g, ""), 10);
    if (mileage > 0 && intervaloAceiteEnCarrito) {
      setProximoCambioKm(mileage + intervaloAceiteEnCarrito);
    } else {
      setProximoCambioKm(Number(ordenActiva?.nextOilChangeKm) || null);
    }
  }, [
    ordenActiva?.id,
    ordenActiva?.mileage,
    ordenActiva?.nextOilChangeKm,
    kilometrajeIngreso,
    intervaloAceiteEnCarrito,
  ]);

  const totalUnidadesCarrito = useMemo(() => {
    if (ordenActiva) {
      return itemsLubricentroEnOrden.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
    }
    return carritoDirecto.reduce((acc, it) => acc + it.qty, 0);
  }, [ordenActiva, itemsLubricentroEnOrden, carritoDirecto]);

  const handleFiltrarNivelRojo = (categoryId: string, subcategoryId: string | null) => {
    handleCambiarCategoria(categoryId);
    setSubcategoriaPorCat((prev) => ({
      ...prev,
      [categoryId]: subcategoryId || "ALL",
    }));
    setMostrarSubcategorias(false);
  };

  const handleCiclarNivelLubricentro = (label: string) => {
    const niveles: Record<EstadoNivelLubricentro, EstadoNivelLubricentro> = {
      Verde: "Amarillo",
      Amarillo: "Rojo",
      Rojo: "Verde",
    };
    const estadoActual = nivelesLubricentro[label];
    const siguiente = estadoActual ? niveles[estadoActual] : "Verde";
    setNivelesLubricentro((prev) => ({ ...prev, [label]: siguiente }));

    if (siguiente === "Rojo") {
      const nivel = NIVELES_LUBRICENTRO.find((item) => item.label === label);
      if (nivel) handleFiltrarNivelRojo(nivel.categoryId, nivel.subcategoryId);
    }
  };

  const handleSeleccionarComboLubricentro = async (
    combo: (typeof COMBOS_LUBRICENTRO)[number]
  ) => {
    setMostrarCombosLubricentro(false);
    const disponibles: ProductoCatalogoLubricentro[] = productos.filter(
      (product: ProductoCatalogoLubricentro) =>
        product.active !== false && product.status !== "Inactivo"
    );
    const seleccionados: ProductoCatalogoLubricentro[] = [];
    const agregarPrimero = (
      coincide: (product: ProductoCatalogoLubricentro) => boolean
    ) => {
      const candidatos = disponibles.filter(coincide);
      if (candidatos.length === 0) return;
      const compatible = candidatos.find(
        (product) => evaluarCompatibilidadVehiculo(product).compatibleVerificado
      );
      seleccionados.push(compatible || candidatos[0]);
    };
    const esAceiteMotor = (product: ProductoCatalogoLubricentro) =>
      product.lubCategoryId === "lub_aceite" &&
      product.lubSubcategoryId === "lub_aceite_motor";
    const esFiltro = (subcategoryId: string) =>
      (product: ProductoCatalogoLubricentro) =>
        product.lubCategoryId === "lub_filtros" &&
        product.lubSubcategoryId === subcategoryId;
    const esAceiteDeTransmision = (product: ProductoCatalogoLubricentro) =>
      product.lubCategoryId === "lub_transmision" &&
      product.lubSubcategoryId !== "lub_trans_diferencial";
    const normalizar = (value: unknown) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (combo === "Básico" || combo === "Completo") {
      agregarPrimero(esAceiteMotor);
      agregarPrimero(esFiltro("lub_fil_aceite"));
      if (combo === "Completo") {
        agregarPrimero(esFiltro("lub_fil_aire"));
        agregarPrimero(esFiltro("lub_fil_cabina"));
      }
    } else if (combo === "Caja") {
      agregarPrimero(esAceiteDeTransmision);
      agregarPrimero(esFiltro("lub_fil_transmision"));
    } else if (combo === "Corona") {
      agregarPrimero(
        (product) =>
          product.lubCategoryId === "lub_transmision" &&
          product.lubSubcategoryId === "lub_trans_diferencial"
      );
    } else {
      agregarPrimero(
        (product) =>
          product.lubCategoryId === "lub_aceite" &&
          product.lubSubcategoryId === "lub_grasa"
      );
    }

    const terminosServicio: Record<(typeof COMBOS_LUBRICENTRO)[number], string[]> = {
      "Básico": ["cambio de aceite", "cambio aceite", "basico"],
      "Completo": ["servicio completo", "mantenimiento completo", "completo"],
      Caja: ["caja", "transmision"],
      Corona: ["corona", "diferencial"],
      Engrase: ["engrase", "engrasado"],
    };
    agregarPrimero(
      (product: ProductoCatalogoLubricentro) =>
        product.type === "SERVICE" &&
        terminosServicio[combo].some((term) =>
          normalizar(product.name).includes(normalizar(term))
        )
    );

    if (seleccionados.length === 0) {
      notificar(`No hay productos disponibles para el combo ${combo}.`, "err");
      return;
    }

    try {
      if (ordenActiva?.id) {
        const nuevosItems = [...itemsOrden];
        seleccionados.forEach((product) => {
          const { presentation, price, unitOfMeasure } = obtenerPresentacionYPrecio(product);
          const index = nuevosItems.findIndex(
            (item) =>
              (item.productId === product.id ||
                (item.code && product.code && item.code === product.code)) &&
              (!item.presentation || item.presentation === presentation)
          );
          if (index >= 0) {
            nuevosItems[index] = {
              ...nuevosItems[index],
              qty: (Number(nuevosItems[index].qty) || 1) + 1,
              price,
            };
            return;
          }
          const categoryLabel =
            categoriasActivas.find((category) => category.id === product.lubCategoryId)?.label ||
            "Catálogo";
          nuevosItems.push({
            id: `it_${product.id}_${Date.now()}_${nuevosItems.length}`,
            productId: product.id,
            type: product.type || "PART",
            category: `Lubricentro - ${categoryLabel}`,
            subCategory: product.lubSubcategoryId || "",
            code: product.code,
            name: `${product.name} (${presentation})`,
            brand: product.brand || "",
            presentation,
            unitOfMeasure,
            price,
            qty: 1,
            status: "Listo",
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          });
        });
        await onActualizarItemsOrden(nuevosItems);
      } else {
        setCarritoDirecto((prev) => {
          const next = [...prev];
          seleccionados.forEach((product) => {
            const { presentation, price, unitOfMeasure } = obtenerPresentacionYPrecio(product);
            const index = next.findIndex(
              (item) => item.productId === product.id && item.presentation === presentation
            );
            if (index >= 0) {
              next[index] = { ...next[index], qty: next[index].qty + 1, price };
              return;
            }
            next.push({
              key: `${product.id}_${presentation}`,
              productId: product.id,
              code: product.code || product.id,
              name: product.name || "Producto",
              brand: product.brand || "",
              presentation,
              unitOfMeasure,
              price,
              qty: 1,
              maxStock: product.stock || 999,
              imageUrl: product.imageUrl,
              lubCategoryId: product.lubCategoryId || "",
              lubSubcategoryId: product.lubSubcategoryId || "",
            });
          });
          return next;
        });
      }
      notificar(`Combo ${combo} agregado al carrito.`, "ok");
    } catch (error) {
      notificar(
        error instanceof Error ? error.message : `No se pudo agregar el combo ${combo}.`,
        "err"
      );
    }
  };

  const guardarSeguimientoLubricentro = async (): Promise<boolean> => {
    if (!ordenActiva?.id) {
      notificar("Selecciona una orden de vehículo para guardar el ingreso.", "err");
      return false;
    }

    const kilometraje = Number.parseInt(kilometrajeIngreso.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(kilometraje) || kilometraje <= 0) {
      notificar("Ingresa un kilometraje actual válido.", "err");
      return false;
    }

    try {
      setGuardandoSeguimiento(true);
      if (onGuardarDatosLubricentro) {
        await onGuardarDatosLubricentro(nivelesLubricentro, proximoCambioKm, itemsOrden);
      }

      const inspectionChecklist = {
        ...(ordenActiva.inspectionChecklist || {}),
        lubricentroLevels: nivelesLubricentro,
        lubricentroComponents: componentesLubricentro,
      };
      const response = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTUALIZAR_ORDEN",
          orderId: ordenActiva.id,
          items: itemsOrden,
          mileage: kilometraje,
          nextOilChangeKm: proximoCambioKm,
          inspectionChecklist,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar el ingreso del vehículo.");
      }

      setKilometrajeIngreso(String(data.activeOrder?.mileage || kilometraje));
      notificar("Kilometraje y revisión del vehículo guardados.", "ok");
      return true;
    } catch (error) {
      notificar(
        error instanceof Error ? error.message : "No se pudo guardar el ingreso del vehículo.",
        "err"
      );
      return false;
    } finally {
      setGuardandoSeguimiento(false);
    }
  };

  const handleSiguienteLubricentro = async () => {
    if (ordenActiva?.id && !(await guardarSeguimientoLubricentro())) return;
    (onIrASiguiente || onIrAAvisoYFirma)();
  };

  const handleRepetirUltimoCambioAceite = async () => {
    setRepitiendoCambioAceite(true);
    try {
      const presentacionesSeleccionadas: Record<string, string> = {};
      const placa = String(ordenActiva?.plate || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      const vehiculo = vehiculosRegistrados.find(
        (vehicle) =>
          String(vehicle.plate || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "") === placa
      );
      const datosVehiculo = {
        brand: String(ordenActiva?.vehicleBrand || ordenActiva?.brand || vehiculo?.brand || vehBrand),
        model: String(ordenActiva?.vehicleModel || ordenActiva?.model || vehiculo?.model || vehModel),
        year: String(ordenActiva?.year || vehiculo?.year || vehYear),
        engine: String(ordenActiva?.engine || vehEngine),
        description: String(ordenActiva?.vehicle || ""),
      };
      const normalizar = (value: unknown) =>
        String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      const coincideDato = (catalogValue: unknown, vehicleValue: string) =>
        !vehicleValue ||
        normalizar(catalogValue).includes(normalizar(vehicleValue)) ||
        normalizar(vehicleValue).includes(normalizar(catalogValue));
      const esCompatibleConVehiculo = (product: ProductoCatalogoLubricentro) => {
        const tieneDatos = Object.values(datosVehiculo).some(Boolean);
        if (!tieneDatos) return false;
        return (Array.isArray(product.compatibilities) ? product.compatibilities : []).some(
          (compatibility: LubVehicleCompatibility) =>
            compatibility.verified &&
            coincideDato(compatibility.brand, datosVehiculo.brand) &&
            coincideDato(compatibility.model, datosVehiculo.model) &&
            coincideDato(compatibility.engine, datosVehiculo.engine) &&
            (!datosVehiculo.year ||
              ((!compatibility.yearFrom || Number(datosVehiculo.year) >= compatibility.yearFrom) &&
                (!compatibility.yearTo || Number(datosVehiculo.year) <= compatibility.yearTo))) &&
            (!datosVehiculo.description ||
              normalizar(datosVehiculo.description).includes(normalizar(compatibility.brand)) ||
              normalizar(compatibility.brand).includes(normalizar(datosVehiculo.description)))
        );
      };
      const seleccionarPredeterminado = (
        coincide: (product: ProductoCatalogoLubricentro) => boolean
      ) => {
        const candidatos = productos.filter(
          (product: ProductoCatalogoLubricentro) =>
            product.active !== false &&
            product.status !== "Inactivo" &&
            product.type !== "SERVICE" &&
            coincide(product)
        );
        return candidatos.find(esCompatibleConVehiculo) || candidatos[0] || null;
      };
      const aceitePredeterminado = seleccionarPredeterminado(
        (product) =>
          product.lubCategoryId === "lub_aceite" &&
          product.lubSubcategoryId === "lub_aceite_motor"
      );
      const filtroPredeterminado = seleccionarPredeterminado(
        (product) =>
          product.lubCategoryId === "lub_filtros" &&
          product.lubSubcategoryId === "lub_fil_aceite"
      );
      const historial = ultimoCambioAceiteAnterior?.products || [];
      const aceiteAnterior = historial.find(
        ({ product }) =>
          product?.lubCategoryId === "lub_aceite" &&
          product?.lubSubcategoryId === "lub_aceite_motor"
      );
      const filtroAnterior = historial.find(
        ({ product }) =>
          product?.lubCategoryId === "lub_filtros" &&
          product?.lubSubcategoryId === "lub_fil_aceite"
      );
      const productosARepetir: ItemAnteriorCambioAceite[] = [
        aceiteAnterior || (aceitePredeterminado ? { item: {}, product: aceitePredeterminado } : null),
        filtroAnterior || (filtroPredeterminado ? { item: {}, product: filtroPredeterminado } : null),
      ].filter((entry): entry is ItemAnteriorCambioAceite => Boolean(entry));

      if (productosARepetir.length === 0) {
        notificar("No hay aceite ni filtro anterior o predeterminado para este vehículo.", "err");
        return;
      }

      const itemsPreparados = productosARepetir.map(({ item, product }, index) => {
        const productId = product.id || item.productId;
        if (!productId) {
          throw new Error("No se encontró el identificador de un producto para repetir.");
        }
        const presentation = String(
          item.presentation || product.presentation || product.unitOfMeasure || "1 Unidad"
        );
        const variant = Array.isArray(product?.presentationsAvailable)
          ? product.presentationsAvailable.find(
            (candidate: LubPresentationVariant) =>
              candidate.label === presentation || candidate.id === item.presentationId
          )
          : undefined;
        if (variant && productId) presentacionesSeleccionadas[productId] = variant.id;

        const price = Number(variant?.price ?? product.price ?? item.price ?? 0);
        const quantityFromName = String(item.name || "").match(/^\s*(\d+)\s*x\s*/i)?.[1];
        const quantity = Math.max(1, Number(item.qty) || Number(quantityFromName) || 1);
        const categoryLabel =
          categoriasActivas.find((category) => category.id === product.lubCategoryId)?.label ||
          String(item.category || "").replace(/^Lubricentro\s*-\s*/i, "") ||
          "Catálogo";
        return {
          id: `it_repeat_${productId || product.code}_${Date.now()}_${index}`,
          productId,
          type: product.type || item.type || "PART",
          category: `Lubricentro - ${categoryLabel}`,
          subCategory: product.lubSubcategoryId || item.subCategory,
          code: product.code || item.code,
          name: `${product.name || item.name} (${presentation})`,
          brand: product.brand || item.brand,
          presentation,
          unitOfMeasure: variant?.unitOfMeasure || product.unitOfMeasure || item.unitOfMeasure,
          price,
          qty: quantity,
          status: "Listo",
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        };
      });

      if (ordenActiva?.id) {
        const nuevosItems = [...itemsOrden];
        itemsPreparados.forEach((item) => {
          const existingIndex = nuevosItems.findIndex(
            (existing) =>
              ((item.productId && existing.productId === item.productId) ||
                (existing.code && item.code && existing.code === item.code)) &&
              (!existing.presentation || existing.presentation === item.presentation)
          );

          if (existingIndex >= 0) {
            const currentQty = Number(nuevosItems[existingIndex].qty) || 1;
            nuevosItems[existingIndex] = {
              ...nuevosItems[existingIndex],
              qty: currentQty + item.qty,
              price: item.price,
            };
            return;
          }
          nuevosItems.push(item);
        });
        await onActualizarItemsOrden(nuevosItems);
      } else {
        setCarritoDirecto((prev) => {
          const next = [...prev];
          itemsPreparados.forEach((item) => {
            const index = next.findIndex(
              (cartItem) =>
                cartItem.productId === item.productId &&
                cartItem.presentation === item.presentation
            );
            if (index >= 0) {
              next[index] = { ...next[index], qty: next[index].qty + item.qty, price: item.price };
              return;
            }
            next.push({
              key: `${item.productId}_${item.presentation}`,
              productId: item.productId,
              code: item.code || item.productId || "LUB",
              name: item.name || "Producto",
              brand: item.brand || "",
              presentation: item.presentation,
              unitOfMeasure: item.unitOfMeasure || "Unidad",
              price: item.price,
              qty: item.qty,
              maxStock:
                productos.find(
                  (product: ProductoCatalogoLubricentro) => product.id === item.productId
                )?.stock || 999,
              lubCategoryId:
                productos.find(
                  (product: ProductoCatalogoLubricentro) => product.id === item.productId
                )?.lubCategoryId || "",
              lubSubcategoryId: item.subCategory || "",
            });
          });
          return next;
        });
      }
      setPresPorProducto((prev) => ({ ...prev, ...presentacionesSeleccionadas }));
      notificar(
        ultimoCambioAceiteAnterior
          ? "Último aceite y filtro agregados"
          : "Aceite y filtro predeterminados agregados",
        "ok"
      );
    } catch (error) {
      notificar(
        error instanceof Error ? error.message : "No se pudo repetir el último cambio de aceite.",
        "err"
      );
    } finally {
      setRepitiendoCambioAceite(false);
    }
  };

  const totalMontoCarrito = useMemo(() => {
    if (ordenActiva) {
      return itemsLubricentroEnOrden.reduce(
        (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
        0
      );
    }
    return carritoDirecto.reduce((acc, it) => acc + it.price * it.qty, 0);
  }, [ordenActiva, itemsLubricentroEnOrden, carritoDirecto]);

  const ordenUltimoCambioAceite = ultimoCambioAceiteAnterior?.order;
  const fechaUltimoCambioValor =
    ordenUltimoCambioAceite?.dateIn ||
    ordenUltimoCambioAceite?.date ||
    ordenUltimoCambioAceite?.createdAt;
  const fechaUltimoCambioMs = fechaUltimoCambioValor
    ? new Date(fechaUltimoCambioValor).getTime()
    : Number.NaN;
  const fechaUltimoCambio =
    Number.isFinite(fechaUltimoCambioMs) && fechaUltimoCambioMs > 0
      ? new Date(fechaUltimoCambioMs).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
      : null;
  const diasDesdeUltimoCambio =
    fechaReferenciaHistorial !== null && Number.isFinite(fechaUltimoCambioMs)
      ? Math.max(0, Math.floor((fechaReferenciaHistorial - fechaUltimoCambioMs) / 86_400_000))
      : null;
  const tiempoDesdeUltimoCambio =
    diasDesdeUltimoCambio === null
      ? null
      : diasDesdeUltimoCambio === 0
        ? "hoy"
        : diasDesdeUltimoCambio >= 365
          ? `hace ${Math.floor(diasDesdeUltimoCambio / 365)} ${Math.floor(diasDesdeUltimoCambio / 365) === 1 ? "año" : "años"
          }`
          : diasDesdeUltimoCambio >= 30
            ? `hace ${Math.floor(diasDesdeUltimoCambio / 30)} ${Math.floor(diasDesdeUltimoCambio / 30) === 1 ? "mes" : "meses"
            }`
            : `hace ${diasDesdeUltimoCambio} ${diasDesdeUltimoCambio === 1 ? "día" : "días"}`;
  const kilometrajeUltimoCambio = Number(ordenUltimoCambioAceite?.mileage) || 0;
  const kilometrajeActual = Number.parseInt(kilometrajeIngreso.replace(/[^0-9]/g, ""), 10) || 0;
  const kilometrosDesdeUltimoCambio =
    kilometrajeActual > 0 && kilometrajeUltimoCambio > 0
      ? kilometrajeActual - kilometrajeUltimoCambio
      : null;
  const descripcionVehiculo = [
    ordenActiva?.vehicleBrand || ordenActiva?.brand,
    ordenActiva?.vehicleModel || ordenActiva?.model,
    ordenActiva?.year,
  ]
    .filter(Boolean)
    .join(" ");

  // Viscosidades disponibles para filtro rápido de 1 toque
  const viscosidadesRapidas = useMemo(() => {
    if (schemaType === "aceites") {
      return (config?.oilConfig?.viscosities || config?.viscosities || []).filter((v) => v.active);
    }
    if (schemaType === "transmision") {
      return (config?.transmissionConfig?.viscosities || []).filter((v) => v.active);
    }
    return [];
  }, [config, schemaType]);

  const basesRapidas = useMemo(() => {
    if (schemaType === "aceites" && (subcategoriaActivaId === "ALL" || subSchemaType === "aceite_motor")) {
      return (config?.oilConfig?.bases || config?.bases || []).filter((b) => b.active);
    }
    return [];
  }, [config, schemaType, subcategoriaActivaId, subSchemaType]);

  // =========================================================================
  // ESTADOS Y HELPERS DEL SISTEMA BENTO INTELIGENTE (LUBRICENTRO)
  // =========================================================================

  // Kilometraje automático de la orden activa
  const kmActual = useMemo(() => {
    const raw = Number(ordenActiva?.mileage);
    return Number.isFinite(raw) && raw > 0 ? raw : 85000;
  }, [ordenActiva?.mileage]);

  const kmProximo = useMemo(() => {
    const nextVal = Number(ordenActiva?.nextOilChangeKm);
    if (Number.isFinite(nextVal) && nextVal > 0) return nextVal;
    return kmActual + 5000;
  }, [ordenActiva?.nextOilChangeKm, kmActual]);

  // Consulta remota de historial si el modal se abre y no hay historial cargado aún
  const consultarHistorialPlaca = useCallback(async (placaABuscar: string) => {
    if (!placaABuscar.trim()) return;
    try {
      setCargandoHistorialRemoto(true);
      const res = await fetch(`/api/taller/operacion?plate=${encodeURIComponent(placaABuscar.trim())}&historial=true`);
      if (res.ok) {
        const data = await res.json();
        setHistorialRemoto({
          history: Array.isArray(data.history) ? data.history : [],
          orders: Array.isArray(data.orders) ? data.orders : [],
        });
      }
    } catch (e) {
      console.error("Error al consultar historial de aceite:", e);
    } finally {
      setCargandoHistorialRemoto(false);
    }
  }, []);

  useEffect(() => {
    if (mostrarModalHistorialAceite && ordenActiva?.plate && !historialRemoto) {
      void consultarHistorialPlaca(ordenActiva.plate);
    }
  }, [mostrarModalHistorialAceite, ordenActiva?.plate, historialRemoto, consultarHistorialPlaca]);

  // Lista COMPLETA de todos los cambios de aceite realizados históricamente a este cliente / vehículo
  const todosCambiosAceiteAnteriores = useMemo<ItemHistorialCambioAceite[]>(() => {
    const placaActiva = ordenActiva?.plate
      ? String(ordenActiva.plate).toUpperCase().replace(/[^A-Z0-9]/g, "")
      : "";
    const clienteNombreRef = ordenActiva?.clientName || ordenActiva?.customerName || ordenActiva?.client || "";

    // Combinar órdenes locales de props y datos remotos evitando duplicados
    const todasLasOrdenes = [...ordenesAnteriores, ...(historialRemoto?.orders || [])];
    const ordenesUnicasMap = new Map<string, any>();
    todasLasOrdenes.forEach((o) => {
      const k = String(o?.id || o?.orderNumber || "");
      if (k && !ordenesUnicasMap.has(k)) ordenesUnicasMap.set(k, o);
    });

    const ordenesFiltradas = Array.from(ordenesUnicasMap.values()).filter((order) => {
      if (ordenActiva?.id && order?.id === ordenActiva.id) return false;
      if (!placaActiva) return true;
      const p = String(order?.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      return p === placaActiva;
    });

    // Combinar historial de servicios anteriores evitando duplicados
    const todosHistorial = [...historialAnterior, ...(historialRemoto?.history || [])];
    const histUnicosMap = new Map<string, any>();
    todosHistorial.forEach((h) => {
      const k = String(h?.id || h?.serviceCode || h?.orderNumber || "");
      if (k && !histUnicosMap.has(k)) histUnicosMap.set(k, h);
    });

    const historialFiltrado = Array.from(histUnicosMap.values()).filter((entry) => {
      if (!placaActiva) return true;
      const p = String(entry?.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      return p === placaActiva;
    });

    const normalizarNombre = (name: unknown) =>
      String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/^\s*\d+\s*x\s*/i, "")
        .trim();

    const encontrarProducto = (item: any) => {
      const historicalName = normalizarNombre(item.name);
      return productos.find(
        (product) =>
          product.id === item.productId ||
          (product.code && item.code && product.code === item.code) ||
          (historicalName &&
            [normalizarNombre(product.name), normalizarNombre(item.presentation)].some(
              (name) =>
                name &&
                (historicalName === name ||
                  historicalName.startsWith(`${name} (`) ||
                  historicalName.startsWith(`${name} `))
            ))
      );
    };

    const esProductoAceite = (item: any, product: any) => {
      if (
        product?.lubCategoryId === "lub_aceite" &&
        product?.lubSubcategoryId === "lub_aceite_motor"
      ) {
        return true;
      }
      const itemName = normalizarNombre(item.name);
      const itemCategory = normalizarNombre(item.category);
      return (
        (itemCategory.includes("lubricentro") || itemCategory.includes("aceite")) &&
        (/\baceite\b|\boil\b/.test(itemName) || /\b\d{1,2}w-\d{2}\b/i.test(itemName))
      );
    };

    const esFiltroAceite = (item: any, product: any) => {
      if (
        product?.lubCategoryId === "lub_filtros" &&
        product?.lubSubcategoryId === "lub_fil_aceite"
      ) {
        return true;
      }
      const itemName = normalizarNombre(item.name);
      return itemName.includes("filtro") && itemName.includes("aceite");
    };

    const esProductoLubricentro = (item: any, product: any) =>
      Boolean(
        product?.lubCategoryId ||
        String(item.category || "").toLowerCase().includes("lubricentro") ||
        String(item.id || "").startsWith("lub-") ||
        String(item.id || "").startsWith("it_lub") ||
        String(item.code || "").startsWith("LUB-")
      );

    const extraerViscosidad = (texto: string) => {
      const match = String(texto).match(/\b(\d{1,2}W-\d{2})\b/i);
      return match ? match[1].toUpperCase() : undefined;
    };

    // Procesar órdenes de taller
    const pedidosMapeados: ItemHistorialCambioAceite[] = ordenesFiltradas.map((order) => {
      const itemsList = Array.isArray(order.items) ? order.items : [];
      const prods: Array<{ item: any; product: any }> = itemsList
        .map((item: any) => ({ item, product: encontrarProducto(item) || item }))
        .filter((entry: { item: any; product: any }) =>
          esProductoLubricentro(entry.item, entry.product)
        );

      const itemAceite = prods.find(({ item, product }: { item: any; product: any }) => esProductoAceite(item, product));
      const itemFiltro = prods.find(({ item, product }: { item: any; product: any }) => esFiltroAceite(item, product));
      const otros = prods.filter(
        ({ item, product }: { item: any; product: any }) =>
          (!itemAceite || (item !== itemAceite.item && product !== itemAceite.product)) &&
          (!itemFiltro || (item !== itemFiltro.item && product !== itemFiltro.product))
      );

      const prodsToRepeat = prods.filter(
        ({ item, product }: { item: any; product: any }) =>
          item.type !== "SERVICE" &&
          (esProductoAceite(item, product) || esFiltroAceite(item, product)) &&
          (product?.id || item.productId || item.code)
      );

      const fechaValor = order.dateIn || order.createdAt || 0;
      const fechaMs = new Date(fechaValor).getTime();
      const fechaFormateada = Number.isFinite(fechaMs) && fechaMs > 0
        ? new Date(fechaMs).toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
        : "Sin fecha";

      const km = Number(order.mileage) || 0;
      const kmDiff = kmActual > 0 && km > 0 ? kmActual - km : null;

      const visc =
        extraerViscosidad(itemAceite?.product?.name || itemAceite?.item?.name || "") ||
        itemAceite?.product?.oilViscosity ||
        undefined;

      const precioAceite = Number(itemAceite?.item?.price || itemAceite?.product?.price || 0);
      const qtyAceite = Number(itemAceite?.item?.qty || 1);

      const precioFiltro = Number(itemFiltro?.item?.price || itemFiltro?.product?.price || 0);
      const qtyFiltro = Number(itemFiltro?.item?.qty || 1);

      return {
        id: String(order.id || `ord_${order.orderNumber}`),
        orderNumber: String(order.orderNumber || order.code || ""),
        fecha: fechaFormateada,
        fechaMs,
        kilometraje: km,
        kilometrosDiferencia: kmDiff,
        mecanico: order.assignedMechanic || order.mechanic || "Técnico Lubricentro",
        cliente: order.clientName || order.customerName || order.client || clienteNombreRef,
        placa: order.plate || ordenActiva?.plate || "",
        vehiculo: [order.vehicleBrand || order.brand, order.vehicleModel || order.model, order.year]
          .filter(Boolean)
          .join(" ") || descripcionVehiculo,
        aceite: itemAceite
          ? {
            nombre: itemAceite.product?.name || itemAceite.item?.name || "Aceite de Motor",
            marca: itemAceite.product?.brand || itemAceite.item?.brand,
            viscosidad: visc,
            presentacion: itemAceite.item?.presentation || itemAceite.product?.presentation || "Galón",
            cantidad: qtyAceite,
            precio: precioAceite,
            subtotal: precioAceite * qtyAceite,
            product: itemAceite.product,
            item: itemAceite.item,
          }
          : null,
        filtro: itemFiltro
          ? {
            nombre: itemFiltro.product?.name || itemFiltro.item?.name || "Filtro de Aceite",
            marca: itemFiltro.product?.brand || itemFiltro.item?.brand,
            presentacion: itemFiltro.item?.presentation || itemFiltro.product?.presentation || "Unidad",
            cantidad: qtyFiltro,
            precio: precioFiltro,
            subtotal: precioFiltro * qtyFiltro,
            product: itemFiltro.product,
            item: itemFiltro.item,
          }
          : null,
        otrosFluidos: otros.map(({ item, product }: { item: any; product: any }) => ({
          nombre: product?.name || item.name,
          cantidad: Number(item.qty || 1),
          precio: Number(item.price || product?.price || 0),
        })),
        serviciosTexto: itemsList
          .filter((it: any) => it.type === "SERVICE")
          .map((it: any) => it.name),
        notas: order.notes || order.observations || undefined,
        costoTotal: Number(order.totalAmount || order.total || 0),
        productosARepetir: prodsToRepeat,
      };
    });

    // Procesar registros de WorkshopHistory
    const historialMapeado: ItemHistorialCambioAceite[] = historialFiltrado.map((entry) => {
      const servicesList = Array.isArray(entry.services) ? entry.services : [];
      const prods: Array<{ item: any; product: any }> = servicesList.map((service: any) => {
        const item = typeof service === "string" ? { name: service, category: "Lubricentro" } : service;
        return { item, product: encontrarProducto(item) || item };
      });

      const itemAceite = prods.find(({ item, product }: { item: any; product: any }) => esProductoAceite(item, product));
      const itemFiltro = prods.find(({ item, product }: { item: any; product: any }) => esFiltroAceite(item, product));

      const fechaValor = entry.date || entry.createdAt || 0;
      const fechaMs = new Date(fechaValor).getTime();
      const fechaFormateada = Number.isFinite(fechaMs) && fechaMs > 0
        ? new Date(fechaMs).toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
        : String(entry.date || "Sin fecha");

      const km = Number(String(entry.mileage || "").replace(/[^0-9]/g, "")) || 0;
      const kmDiff = kmActual > 0 && km > 0 ? kmActual - km : null;

      const textoAceite =
        itemAceite?.product?.name ||
        itemAceite?.item?.name ||
        servicesList.find((s: any) =>
          typeof s === "string" && (s.toLowerCase().includes("aceite") || /\b\d{1,2}w-\d{2}\b/i.test(s))
        ) ||
        "Cambio de Aceite";

      const visc =
        extraerViscosidad(textoAceite) ||
        itemAceite?.product?.oilViscosity ||
        undefined;

      const prodsToRepeat = prods.filter(
        ({ item, product }: { item: any; product: any }) =>
          item.type !== "SERVICE" &&
          (esProductoAceite(item, product) || esFiltroAceite(item, product)) &&
          (product?.id || item.productId || item.code)
      );

      return {
        id: String(entry.id || `hist_${entry.serviceCode || entry.orderNumber}`),
        orderNumber: String(entry.orderNumber || entry.serviceCode || ""),
        fecha: fechaFormateada,
        fechaMs,
        kilometraje: km,
        kilometrosDiferencia: kmDiff,
        mecanico: entry.mechanic || "Carlos Rodríguez",
        cliente: entry.client || clienteNombreRef,
        placa: entry.plate || ordenActiva?.plate || "",
        vehiculo: entry.vehicle || descripcionVehiculo,
        aceite: {
          nombre: String(textoAceite),
          marca: itemAceite?.product?.brand || itemAceite?.item?.brand || undefined,
          viscosidad: visc,
          presentacion: itemAceite?.item?.presentation || itemAceite?.product?.presentation || "Galón",
          cantidad: 1,
          precio: Number(itemAceite?.item?.price || itemAceite?.product?.price || 0),
          subtotal: Number(itemAceite?.item?.price || itemAceite?.product?.price || 0),
          product: itemAceite?.product,
          item: itemAceite?.item,
        },
        filtro: itemFiltro
          ? {
            nombre: itemFiltro.product?.name || itemFiltro.item?.name || "Filtro de Aceite",
            marca: itemFiltro.product?.brand || itemFiltro.item?.brand,
            presentacion: "Unidad",
            cantidad: 1,
            precio: Number(itemFiltro.item?.price || itemFiltro.product?.price || 0),
            subtotal: Number(itemFiltro.item?.price || itemFiltro.product?.price || 0),
            product: itemFiltro.product,
            item: itemFiltro.item,
          }
          : null,
        otrosFluidos: [],
        serviciosTexto: servicesList.filter((s: any) => typeof s === "string"),
        notas: entry.notes || undefined,
        costoTotal: Number(entry.cost || 0),
        productosARepetir: prodsToRepeat,
      };
    });

    const todos = [...pedidosMapeados, ...historialMapeado].sort(
      (a, b) => b.fechaMs - a.fechaMs
    );

    // Solo registros que contengan cambio de aceite
    return todos.filter((cambio) => {
      if (cambio.aceite) return true;
      if (Array.isArray(cambio.serviciosTexto)) {
        return cambio.serviciosTexto.some(
          (s) => typeof s === "string" && (s.toLowerCase().includes("aceite") || /\b\d{1,2}w-\d{2}\b/i.test(s))
        );
      }
      return false;
    });
  }, [
    ordenActiva?.id,
    ordenActiva?.plate,
    ordenActiva?.clientName,
    ordenActiva?.customerName,
    ordenActiva?.client,
    ordenesAnteriores,
    historialAnterior,
    historialRemoto,
    productos,
    kmActual,
    descripcionVehiculo,
  ]);

  const handleAplicarCambioEspecifico = async (productosARepetir: Array<{ item: any; product: any }>) => {
    try {
      setRepitiendoCambioAceite(true);
      if (!productosARepetir || productosARepetir.length === 0) {
        notificar("Este registro no incluye productos específicos en catálogo.", "err");
        return;
      }

      const presentacionesSeleccionadas: Record<string, string> = {};
      const itemsPreparados = productosARepetir.map(({ item, product }, index) => {
        const productId = product?.id || item.productId;
        if (!productId) {
          throw new Error("No se encontró el identificador del producto.");
        }
        const presentation = String(
          item.presentation || product?.presentation || product?.unitOfMeasure || "1 Unidad"
        );
        const variant = Array.isArray(product?.presentationsAvailable)
          ? product.presentationsAvailable.find(
            (candidate: LubPresentationVariant) =>
              candidate.label === presentation || candidate.id === item.presentationId
          )
          : undefined;
        if (variant && productId) presentacionesSeleccionadas[productId] = variant.id;

        const price = Number(variant?.price ?? product?.price ?? item.price ?? 0);
        const quantityFromName = String(item.name || "").match(/^\s*(\d+)\s*x\s*/i)?.[1];
        const quantity = Math.max(1, Number(item.qty) || Number(quantityFromName) || 1);
        const categoryLabel =
          categoriasActivas.find((category) => category.id === product?.lubCategoryId)?.label ||
          String(item.category || "").replace(/^Lubricentro\s*-\s*/i, "") ||
          "Catálogo";
        return {
          id: `it_repeat_${productId || product?.code}_${Date.now()}_${index}`,
          productId,
          type: product?.type || item.type || "PART",
          category: `Lubricentro - ${categoryLabel}`,
          subCategory: product?.lubSubcategoryId || item.subCategory,
          code: product?.code || item.code,
          name: `${product?.name || item.name} (${presentation})`,
          brand: product?.brand || item.brand,
          presentation,
          unitOfMeasure: variant?.unitOfMeasure || product?.unitOfMeasure || item.unitOfMeasure,
          price,
          qty: quantity,
          status: "Listo",
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        };
      });

      if (ordenActiva?.id) {
        const nuevosItems = [...itemsOrden];
        itemsPreparados.forEach((item) => {
          const existingIndex = nuevosItems.findIndex(
            (existing) =>
              ((item.productId && existing.productId === item.productId) ||
                (existing.code && item.code && existing.code === item.code)) &&
              (!existing.presentation || existing.presentation === item.presentation)
          );

          if (existingIndex >= 0) {
            const currentQty = Number(nuevosItems[existingIndex].qty) || 1;
            nuevosItems[existingIndex] = {
              ...nuevosItems[existingIndex],
              qty: currentQty + item.qty,
              price: item.price,
            };
            return;
          }
          nuevosItems.push(item);
        });
        await onActualizarItemsOrden(nuevosItems);
      } else {
        setCarritoDirecto((prev) => {
          const next = [...prev];
          itemsPreparados.forEach((item) => {
            const index = next.findIndex(
              (cartItem) =>
                cartItem.productId === item.productId &&
                cartItem.presentation === item.presentation
            );
            if (index >= 0) {
              next[index] = { ...next[index], qty: next[index].qty + item.qty, price: item.price };
              return;
            }
            const foundProduct = productos.find(
              (product: ProductoCatalogoLubricentro) => product.id === item.productId
            );
            next.push({
              key: `${item.productId}_${item.presentation}`,
              productId: item.productId,
              code: item.code || item.productId || "LUB",
              name: item.name || "Producto",
              brand: item.brand || "",
              presentation: item.presentation,
              unitOfMeasure: item.unitOfMeasure || "Unidad",
              price: item.price,
              qty: item.qty,
              maxStock: foundProduct?.stock ?? 999,
              imageUrl: foundProduct?.imageUrl || null,
              lubCategoryId: foundProduct?.lubCategoryId || "lub_aceite",
              lubSubcategoryId: foundProduct?.lubSubcategoryId || "lub_aceite_motor",
            });
          });
          return next;
        });
      }
      setPresPorProducto((prev) => ({ ...prev, ...presentacionesSeleccionadas }));
      notificar("¡Aceite y filtro aplicados a la orden con éxito!", "ok");
      setMostrarModalHistorialAceite(false);
    } catch (error) {
      notificar(
        error instanceof Error ? error.message : "No se pudo aplicar el cambio de aceite.",
        "err"
      );
    } finally {
      setRepitiendoCambioAceite(false);
    }
  };

  const estaPreCargadoEnOrden = (targetId: string) => {
    return itemsOrden.some(
      (it: any) =>
        (it.productId && it.productId === targetId) ||
        (it.id && it.id === targetId) ||
        (it.code && it.code === targetId)
    );
  };

  const handleAjustarItemBento = (itemDef: any, delta: number) => {
    if (!itemDef) return;
    const targetId = itemDef.id || itemDef.productId || itemDef.code;
    const indexExistente = itemsOrden.findIndex(
      (it: any) =>
        (it.productId && it.productId === targetId) ||
        (it.id && it.id === targetId) ||
        (it.code && it.code === itemDef.code)
    );

    let nuevos = [...itemsOrden];
    if (indexExistente >= 0) {
      const itemActual = nuevos[indexExistente];
      const nuevaCant = (Number(itemActual.qty) || 1) + delta;
      if (nuevaCant <= 0) {
        nuevos.splice(indexExistente, 1);
      } else {
        nuevos[indexExistente] = {
          ...itemActual,
          qty: nuevaCant,
          subtotal: nuevaCant * (Number(itemActual.price) || 0),
        };
      }
    } else if (delta > 0) {
      nuevos.push({
        key: `lub_bento_${itemDef.id}_${Date.now()}`,
        productId: itemDef.id,
        id: itemDef.id,
        code: itemDef.code || itemDef.id,
        name: itemDef.name || itemDef.fullName,
        fullName: itemDef.fullName || itemDef.name,
        brand: itemDef.brand || 'Lubricentro',
        presentation: itemDef.presentation || 'Unidad',
        unitOfMeasure: itemDef.unitOfMeasure || 'Unidad',
        price: Number(itemDef.price) || 0,
        qty: 1,
        maxStock: 999,
        subtotal: Number(itemDef.price) || 0,
        type: itemDef.type || 'PART',
        lubCategoryId: itemDef.lubCategoryId || 'lub_aceite',
        lubSubcategoryId: itemDef.lubSubcategoryId || '',
      });
    }

    void onActualizarItemsOrden(nuevos);
    if (mostrarToast) {
      if (delta > 0) {
        mostrarToast(`+ ${itemDef.name || itemDef.fullName}`, 'ok');
      } else {
        mostrarToast(`- ${itemDef.name || itemDef.fullName}`, 'ok');
      }
    }
  };

  // Pre-carga inteligente al abrir si no hay items
  const autoCargaInicialHecha = useRef(false);
  useEffect(() => {
    if (autoCargaInicialHecha.current) return;
    if (!ordenActiva) return;
    if (itemsOrden && itemsOrden.length > 0) {
      autoCargaInicialHecha.current = true;
      return;
    }
    const itemAceite = BASE_LUBRICENTRO_POS_ITEMS.find((b) => b.id === 'lub_oil_20w50');
    const itemFiltro = BASE_LUBRICENTRO_POS_ITEMS.find((b) => b.id === 'lub_fil_aceite_std');
    const itemsIniciales: any[] = [];
    if (itemAceite) {
      itemsIniciales.push({
        key: `lub_init_${itemAceite.id}`,
        productId: itemAceite.id,
        id: itemAceite.id,
        code: itemAceite.code,
        name: itemAceite.name,
        fullName: itemAceite.fullName,
        brand: itemAceite.brand,
        presentation: itemAceite.presentation,
        unitOfMeasure: itemAceite.unitOfMeasure,
        price: itemAceite.price,
        qty: 1,
        maxStock: 999,
        subtotal: itemAceite.price,
        type: itemAceite.type,
        lubCategoryId: itemAceite.lubCategoryId,
        lubSubcategoryId: itemAceite.lubSubcategoryId,
      });
    }
    if (itemFiltro) {
      itemsIniciales.push({
        key: `lub_init_${itemFiltro.id}`,
        productId: itemFiltro.id,
        id: itemFiltro.id,
        code: itemFiltro.code,
        name: itemFiltro.name,
        fullName: itemFiltro.fullName,
        brand: itemFiltro.brand,
        presentation: itemFiltro.presentation,
        unitOfMeasure: itemFiltro.unitOfMeasure,
        price: itemFiltro.price,
        qty: 1,
        maxStock: 999,
        subtotal: itemFiltro.price,
        type: itemFiltro.type,
        lubCategoryId: itemFiltro.lubCategoryId,
        lubSubcategoryId: itemFiltro.lubSubcategoryId,
      });
    }
    if (itemsIniciales.length > 0) {
      autoCargaInicialHecha.current = true;
      void onActualizarItemsOrden(itemsIniciales);
    }
  }, [ordenActiva, itemsOrden, onActualizarItemsOrden]);

  type SemaforoEstado = 'neutral' | 'ok' | 'atencion' | 'critico';

  const SEMAFORO_CIRCULOS = useMemo(
    () => [
      {
        id: 'aire',
        label: 'Aire',
        detalle: 'Filtro de Aire Motor',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <path d="M4 8h11a3 3 0 1 0-3-3" />
            <path d="M2 13h16a3 3 0 1 1-3 3" />
            <path d="M6 18h7a2 2 0 1 0-2-2" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_fil_aire_std'),
      },
      {
        id: 'cabina',
        label: 'Cabina',
        detalle: 'Filtro de Cabina / A/C',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <path d="M3 15h18" />
            <path d="M5 15V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" />
            <circle cx="7.5" cy="15.5" r="2.5" />
            <circle cx="16.5" cy="15.5" r="2.5" />
            <path d="M9 10h6" />
            <path d="M12 7v3" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_fil_cabina_std'),
      },
      {
        id: 'refrigerante',
        label: 'Refrigerante',
        detalle: 'Nivel y Calidad Coolant',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            <circle cx="11.5" cy="17.5" r="2" fill="currentColor" opacity="0.6" />
            <path d="M9 8h3" />
            <path d="M9 11h2" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_flu_refrig_std'),
      },
      {
        id: 'frenos',
        label: 'Frenos',
        detalle: 'Líquido Frenos DOT4',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="7" r="0.75" fill="currentColor" />
            <circle cx="12" cy="17" r="0.75" fill="currentColor" />
            <circle cx="7" cy="12" r="0.75" fill="currentColor" />
            <circle cx="17" cy="12" r="0.75" fill="currentColor" />
            <path d="M17 5.5a9.5 9.5 0 0 1 3.5 6.5c0 2.5-1 4.5-2.5 6" strokeWidth="2.5" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_flu_frenos_std'),
      },
      {
        id: 'caja',
        label: 'Caja',
        detalle: 'Aceite Transmisión / ATF',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <circle cx="6" cy="5" r="2" />
            <circle cx="12" cy="5" r="2" />
            <circle cx="18" cy="5" r="2" />
            <circle cx="6" cy="19" r="2" />
            <circle cx="12" cy="19" r="2" />
            <circle cx="18" cy="19" r="2" />
            <path d="M6 7v10M12 7v10M18 7v10M6 12h12" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_trans_caja_std'),
      },
      {
        id: 'corona',
        label: 'Corona',
        detalle: 'Diferencial Trasero 80W90',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="4" />
            <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.34 6.34l2.83 2.83M14.83 14.83l2.83 2.83M6.34 17.66l2.83-2.83M14.83 9.17l2.83-2.83" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_trans_corona_std'),
      },
      {
        id: 'direccion',
        label: 'Dirección',
        detalle: 'Líquido Dirección Asistida',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 14.5V21" />
            <path d="M9.5 12H3" />
            <path d="M21 12h-6.5" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_flu_direccion_std'),
      },
      {
        id: 'engrase',
        label: 'Engrase',
        detalle: 'Engrase Chasis / Rótulas',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <path d="M7 21l3-3m0 0l-1.5-1.5 4.5-4.5 1.5 1.5 3-3-4.5-4.5-3 3 1.5 1.5-4.5 4.5-1.5-1.5L7 21z" />
            <path d="M16 6l3-3 2 2-3 3" />
            <circle cx="18" cy="18" r="2" fill="currentColor" opacity="0.6" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_srv_engrase_std'),
      },
      {
        id: 'plumillas',
        label: 'Plumillas',
        detalle: 'Limpiaparabrisas + Plumillas',
        iconSvg: (cls: string) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
            <path d="M3 17a16 16 0 0 1 18 0" />
            <path d="M12 17l6-9" strokeWidth="2.5" />
            <path d="M14 6l4 2.5" />
            <circle cx="9" cy="8" r="1" fill="currentColor" />
            <circle cx="6" cy="11" r="1" fill="currentColor" />
          </svg>
        ),
        posItem: BASE_LUBRICENTRO_POS_ITEMS.find((i) => i.id === 'lub_flu_plumillas_std'),
      },
    ],
    []
  );

  const [semaforoEstados, setSemaforoEstados] = useState<Record<string, SemaforoEstado>>({});

  const handleToggleSemaforoCirculo = (id: string, estadoForzado?: SemaforoEstado) => {
    const circulo = SEMAFORO_CIRCULOS.find((c) => c.id === id);
    if (!circulo) return;

    const actual = semaforoEstados[id] || 'neutral';
    let siguiente: SemaforoEstado;
    if (estadoForzado) {
      siguiente = estadoForzado;
    } else {
      if (actual === 'neutral') siguiente = 'ok';
      else if (actual === 'ok') siguiente = 'atencion';
      else if (actual === 'atencion') siguiente = 'critico';
      else siguiente = 'neutral';
    }

    setSemaforoEstados((prev) => ({
      ...prev,
      [id]: siguiente,
    }));

    if (circulo.posItem) {
      if (siguiente === 'critico') {
        if (!estaPreCargadoEnOrden(circulo.posItem.id)) {
          handleAjustarItemBento(circulo.posItem, 1);
          mostrarToast?.(`🔴 ${circulo.label}: Cambio urgente agregado al pedido (+${circulo.posItem.price ? `$${circulo.posItem.price.toFixed(2)}` : ''})`, 'ok');
        }
      } else if (actual === 'critico') {
        if (estaPreCargadoEnOrden(circulo.posItem.id)) {
          handleAjustarItemBento(circulo.posItem, -99);
        }
      }
    }
  };

  const handleMarcarTodosOk = () => {
    const nuevos: Record<string, SemaforoEstado> = {};
    SEMAFORO_CIRCULOS.forEach((c) => {
      nuevos[c.id] = 'ok';
      if (semaforoEstados[c.id] === 'critico' && c.posItem && estaPreCargadoEnOrden(c.posItem.id)) {
        handleAjustarItemBento(c.posItem, -99);
      }
    });
    setSemaforoEstados(nuevos);
    mostrarToast?.('🟢 Todos los puntos marcados como OK (Buen estado)', 'ok');
  };

  const [menuCatAbierto, setMenuCatAbierto] = useState(false);
  const [menuSubcatAbierto, setMenuSubcatAbierto] = useState(false);
  const [menuEnvaseDropdownAbierto, setMenuEnvaseDropdownAbierto] = useState(false);
  const [envaseActivo, setEnvaseActivo] = useState<string>('Galón');
  const [busquedaBento, setBusquedaBento] = useState<string>('');

  const OPCIONES_CATEGORIAS = useMemo(
    () => [
      { id: 'lub_aceite', label: 'Aceites', icon: '🛢️' },
      { id: 'lub_filtros', label: 'Filtros', icon: '💨' },
      { id: 'lub_fluidos', label: 'Fluidos', icon: '🧪' },
      { id: 'lub_transmision', label: 'Transmisión', icon: '⚙️' },
      { id: 'lub_baterias', label: 'Baterías', icon: '🔋' },
    ],
    []
  );

  const labelCategoriaActiva = useMemo(() => {
    const cat = OPCIONES_CATEGORIAS.find((c) => c.id === categoriaActivaId);
    return cat ? `${cat.icon} ${cat.label}` : '🛢️ Aceites';
  }, [categoriaActivaId, OPCIONES_CATEGORIAS]);

  const opcionesSubcategoriasActuales = useMemo(() => {
    if (subcategoriasActivas && subcategoriasActivas.length > 0) {
      return subcategoriasActivas;
    }
    if (categoriaActivaId === 'lub_aceite') {
      return [
        { id: 'lub_aceite_motor', label: 'Motor' },
        { id: 'lub_aditivos', label: 'Aditivos' },
        { id: 'lub_grasa', label: 'Grasa' },
      ];
    }
    return [{ id: 'ALL', label: 'Todas' }];
  }, [subcategoriasActivas, categoriaActivaId]);

  const labelSubcategoriaActiva = useMemo(() => {
    if (subcategoriaActivaId === 'ALL') return 'Todas';
    const sub = opcionesSubcategoriasActuales.find((s) => s.id === subcategoriaActivaId);
    return sub?.label || 'Motor';
  }, [subcategoriaActivaId, opcionesSubcategoriasActuales]);

  const setSubcategoriaActivaId = (subId: string) => {
    setSubcategoriaPorCat((prev) => ({
      ...prev,
      [categoriaActivaId]: subId,
    }));
  };

  const productosBentoAMostrar = useMemo(() => {
    let lista = [...BASE_LUBRICENTRO_POS_ITEMS];

    if (productos && productos.length > 0) {
      const idsBase = new Set(lista.map((p) => p.id));
      for (const p of productos) {
        if (!idsBase.has(p.id) && p.active !== false) {
          lista.push({
            id: p.id,
            code: p.code || p.id,
            name: p.name,
            fullName: p.name,
            brand: p.brand || 'Genérico',
            price: Number(p.price) || 0,
            viscosity: p.viscosity || p.name,
            lubCategoryId: p.lubCategoryId || 'lub_aceite',
            lubSubcategoryId: p.lubSubcategoryId || '',
            presentation: p.presentation || 'Galón',
            unitOfMeasure: p.unitOfMeasure || 'Galón',
            type: p.type || 'PART',
            color: '#eab308',
            imageUrl: p.imageUrl,
          });
        }
      }
    }

    if (categoriaActivaId) {
      lista = lista.filter((p) => p.lubCategoryId === categoriaActivaId);
    }

    if (subcategoriaActivaId && subcategoriaActivaId !== 'ALL') {
      lista = lista.filter((p) => p.lubSubcategoryId === subcategoriaActivaId);
    }

    if (envaseActivo && envaseActivo !== 'Todos') {
      lista = lista.filter((p) => {
        const pres = String(p.presentation || '').toLowerCase();
        const uom = String(p.unitOfMeasure || '').toLowerCase();
        const name = String(p.name || p.fullName || '').toLowerCase();
        const env = envaseActivo.toLowerCase();
        return pres.includes(env) || uom.includes(env) || name.includes(env);
      });
    }

    if (busquedaBento.trim()) {
      const q = busquedaBento.trim().toLowerCase();
      lista = lista.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.fullName && p.fullName.toLowerCase().includes(q)) ||
          (p.viscosity && p.viscosity.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    return lista;
  }, [productos, categoriaActivaId, subcategoriaActivaId, envaseActivo, busquedaBento]);

  const obtenerCantidadItemEnOrden = (targetId: string) => {
    const it = itemsOrden.find(
      (x: any) =>
        (x.productId && x.productId === targetId) ||
        (x.id && x.id === targetId) ||
        (x.code && x.code === targetId)
    );
    return it ? Number(it.qty) || 0 : 0;
  };

  const totalMontoActual = useMemo(() => {
    return itemsOrden.reduce((sum: number, it: any) => {
      const p = Number(it.price) || 0;
      const q = Number(it.qty) || 1;
      return sum + p * q;
    }, 0);
  }, [itemsOrden]);

  if (!config) return null;

  return (
    <div className="w-full space-y-3 pb-24 sm:pb-28 animate-fade-in">
      {/* Banner de confirmación / error */}
      {bannerAviso && (
        <div
          className={`p-2.5 sm:p-3 rounded-xl border text-xs font-normal flex items-center justify-between gap-2 shadow-xs ${bannerAviso.tipo === "ok"
            ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200"
            : "bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
            }`}
        >
          <span>{bannerAviso.texto}</span>
          <button
            type="button"
            onClick={() => setBannerAviso(null)}
            className="text-xs font-normal px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          DISEÑO BENTO GRID (PC: 3 TARJETAS INTELIGENTES / MÓVIL: VISTA LIMPIA)
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-start">

        {/* ===================================================================
            TARJETA 1: AUTO-SERVICIO DETECTADO (CERO BÚSQUEDA MANUAL)
            =================================================================== */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between min-h-[220px]">
          <div>
            {/* Kilometraje normal y legible */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200/70 dark:border-white/5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl sm:text-2xl font-bold font-sans tracking-normal text-zinc-900 dark:text-white">
                  {kmActual.toLocaleString()} km
                </span>
                <span className="text-lg text-blue-600 dark:text-blue-400 font-bold">➔</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-sans">
                <span className="font-semibold font-sans text-emerald-600 dark:text-emerald-400">
                  Próx: {kmProximo.toLocaleString()} km
                </span>
                <span className="text-[11px] font-medium font-sans text-zinc-500 dark:text-zinc-400">
                  (+5.000 km)
                </span>
              </div>
            </div>

            {/* Acceso directo al historial de cambios de aceite */}
            <Link
              href={`/taller/historial-aceite?placa=${encodeURIComponent(ordenActiva?.plate || "")}&cliente=${encodeURIComponent(ordenActiva?.clientName || ordenActiva?.customerName || ordenActiva?.client || "")}&vehiculo=${encodeURIComponent(ordenActiva?.vehicle || [ordenActiva?.vehicleBrand, ordenActiva?.vehicleModel].filter(Boolean).join(" ") || "")}`}
              className="mt-2.5 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-between hover:bg-blue-100/70 dark:hover:bg-blue-500/20 transition-all cursor-pointer group no-underline"
              title="Abrir historial de aceites"
            >
              <span className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <span>🛢️</span>
                <span>Historial de aceites</span>
              </span>
              <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 shrink-0 ml-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Consultar</span>
                <span>→</span>
              </span>
            </Link>
          </div>
        </div>

        {/* ===================================================================
            TARJETA 2: SEMÁFORO INTELIGENTE DE INSPECCIÓN RÁPIDA
            =================================================================== */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 p-3.5 sm:p-4 shadow-2xs">
          {/* Cabecera con título y botón rápido "Marcar todo OK" */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base sm:text-lg">🚦</span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-tight">
                  Semáforo
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleMarcarTodosOk}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer active:scale-95 shrink-0"
              title="Marcar todos los puntos en estado Verde (OK)"
            >
              Todo OK 🟢
            </button>
          </div>

          {/* Guía semafórica de 3 colores funcionales */}
          <div className="grid grid-cols-3 gap-1.5 mb-2.5 px-1 py-1 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 text-center text-[10px] font-semibold">
            <span className="text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>🟢 OK</span>
            </span>
            <span className="text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>🟡 Revisar</span>
            </span>
            <span className="text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>🔴 Cambiar</span>
            </span>
          </div>

          {/* Tablero de 9 íconos semafóricos (3x3) */}
          <div className="grid grid-cols-3 gap-y-3 gap-x-2 place-items-center py-1">
            {SEMAFORO_CIRCULOS.map((btn) => {
              const estado = semaforoEstados[btn.id] || 'neutral';
              const esCritico = estado === 'critico';
              const esAtencion = estado === 'atencion';
              const esOk = estado === 'ok';

              return (
                <div key={btn.id} className="flex flex-col items-center gap-1 text-center w-full">
                  <button
                    type="button"
                    onClick={() => void handleToggleSemaforoCirculo(btn.id)}
                    className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs ${esCritico
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30 scale-105 ring-2 ring-rose-400"
                      : esAtencion
                        ? "bg-amber-400 hover:bg-amber-500 text-zinc-950 shadow-md shadow-amber-400/30 scale-102 ring-2 ring-amber-300"
                        : esOk
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 scale-102 ring-2 ring-emerald-400"
                          : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10"
                      }`}
                    title={`${btn.label} (${btn.detalle}): Estado actual [${estado.toUpperCase()}]. Clic para ciclar: Neutro ➜ OK ➜ Revisar ➜ Cambiar (POS)`}
                  >
                    {btn.iconSvg("w-5.5 h-5.5 sm:w-6 sm:h-6")}

                    {/* Mini insignia con estado activo */}
                    {esCritico && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-black shadow-xs">
                        🛒
                      </span>
                    )}
                    {esAtencion && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-zinc-950 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-black shadow-xs">
                        !
                      </span>
                    )}
                    {esOk && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-black shadow-xs">
                        ✓
                      </span>
                    )}
                  </button>

                  <div className="flex flex-col items-center leading-tight mt-1">
                    <span className={`text-sm sm:text-[15px] font-black tracking-tight text-center ${esCritico
                      ? "text-rose-600 dark:text-rose-400"
                      : esAtencion
                        ? "text-amber-600 dark:text-amber-400"
                        : esOk
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-800 dark:text-zinc-200"
                      }`}>
                      {btn.label}
                    </span>
                    <span className={`text-[11px] sm:text-xs font-bold mt-0.5 ${esCritico
                      ? "text-rose-600 dark:text-rose-400 font-extrabold"
                      : esAtencion
                        ? "text-amber-600 dark:text-amber-400 font-extrabold"
                        : esOk
                          ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}>
                      {esCritico ? "Cambiar" : esAtencion ? "Revisar" : esOk ? "OK" : "Pendiente"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          BUSCADOR Y FILTROS: ANCHO COMPLETO (CUBRE TODO EL ESPACIO EN PC Y MÓVIL)
          ===================================================================== */}
      <div className="w-full rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 p-3 sm:p-3.5 shadow-2xs space-y-3">
          {/* Fila de 3 píldoras desplegables contraíbles + Buscador */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            {/* Píldora 1: Categoría */}
            <div className="relative flex-1 min-w-[90px]">
              <button
                type="button"
                onClick={() => {
                  setMenuCatAbierto((prev) => !prev);
                  setMenuSubcatAbierto(false);
                  setMenuEnvaseDropdownAbierto(false);
                }}
                className="w-full h-9 px-2.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100 text-xs font-bold flex items-center justify-between gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs truncate"
              >
                <span className="truncate">{labelCategoriaActiva}</span>
                <span className="text-[10px] opacity-75">▾</span>
              </button>
              {menuCatAbierto && (
                <div className="absolute top-11 left-0 z-40 w-44 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1 shadow-xl animate-fade-in space-y-0.5">
                  {OPCIONES_CATEGORIAS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoriaActivaId(cat.id);
                        setMenuCatAbierto(false);
                      }}
                      className="w-full h-8 px-2.5 rounded-lg text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Píldora 2: Subcategoría */}
            <div className="relative flex-1 min-w-[90px]">
              <button
                type="button"
                onClick={() => {
                  setMenuSubcatAbierto((prev) => !prev);
                  setMenuCatAbierto(false);
                  setMenuEnvaseDropdownAbierto(false);
                }}
                className="w-full h-9 px-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 text-xs font-bold flex items-center justify-between gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs truncate"
              >
                <span className="truncate flex items-center gap-1.5">
                  <span className="text-sm shrink-0">
                    {(() => {
                      const s = (subcategoriaActivaId + " " + labelSubcategoriaActiva).toLowerCase();
                      if (s.includes("motor")) return "🚗";
                      if (s.includes("aditiv")) return "🧪";
                      if (s.includes("grasa")) return "🧈";
                      if (s.includes("transmi") || s.includes("caja")) return "⚙️";
                      if (s.includes("freno")) return "🛑";
                      if (s.includes("hidraul")) return "💧";
                      if (s.includes("filtro")) return "🌪️";
                      if (s.includes("tod") || subcategoriaActivaId === "ALL") return "📋";
                      return "🔧";
                    })()}
                  </span>
                  <span className="truncate">{labelSubcategoriaActiva}</span>
                </span>
                <span className="text-[10px] opacity-75">▾</span>
              </button>
              {menuSubcatAbierto && (
                <div className="absolute top-11 left-0 z-40 w-44 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1 shadow-xl animate-fade-in space-y-0.5 max-h-56 overflow-y-auto">
                  {opcionesSubcategoriasActuales.map((sub: any) => {
                    const s = (sub.id + " " + sub.label).toLowerCase();
                    const icono = sub.icon || (
                      s.includes("motor") ? "🚗" :
                        s.includes("aditiv") ? "🧪" :
                          s.includes("grasa") ? "🧈" :
                            s.includes("transmi") || s.includes("caja") ? "⚙️" :
                              s.includes("freno") ? "🛑" :
                                s.includes("hidraul") ? "💧" :
                                  s.includes("filtro") ? "🌪️" :
                                    s.includes("tod") ? "📋" : "🔧"
                    );
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setSubcategoriaActivaId(sub.id);
                          setMenuSubcatAbierto(false);
                        }}
                        className={`w-full h-8 px-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${subcategoriaActivaId === sub.id
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold"
                          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
                          }`}
                      >
                        <span className="text-sm shrink-0">{icono}</span>
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Píldora 3: Envase con íconos */}
            <div className="relative flex-1 min-w-[85px]">
              <button
                type="button"
                onClick={() => {
                  setMenuEnvaseDropdownAbierto((prev) => !prev);
                  setMenuCatAbierto(false);
                  setMenuSubcatAbierto(false);
                }}
                className="w-full h-9 px-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 text-xs font-bold flex items-center justify-between gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs truncate"
              >
                <span className="truncate flex items-center gap-1.5">
                  <span className="text-sm shrink-0">
                    {(() => {
                      const e = envaseActivo || "Galón";
                      if (e === "Galón") return "🧴";
                      if (e === "Litro") return "🍶";
                      if (e === "Cuarto") return "🥫";
                      if (e === "Caneca") return "🪣";
                      if (e === "Todos") return "📦";
                      return "🧴";
                    })()}
                  </span>
                  <span className="truncate">{envaseActivo || "Galón"}</span>
                </span>
                <span className="text-[10px] opacity-75">▾</span>
              </button>
              {menuEnvaseDropdownAbierto && (
                <div className="absolute top-11 right-0 z-40 w-36 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1 shadow-xl animate-fade-in space-y-0.5">
                  {[
                    { id: "Galón", label: "Galón", icon: "🧴" },
                    { id: "Litro", label: "Litro", icon: "🍶" },
                    { id: "Cuarto", label: "Cuarto", icon: "🥫" },
                    { id: "Caneca", label: "Caneca", icon: "🪣" },
                    { id: "Todos", label: "Todos", icon: "📦" },
                  ].map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => {
                        setEnvaseActivo(env.id === "Todos" ? "" : env.id);
                        setMenuEnvaseDropdownAbierto(false);
                      }}
                      className={`w-full h-8 px-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${(envaseActivo === env.id || (!envaseActivo && env.id === "Todos"))
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold"
                        : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
                        }`}
                    >
                      <span className="text-sm shrink-0">{env.icon}</span>
                      <span className="truncate">{env.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Buscador */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
            <input
              type="text"
              value={busquedaBento}
              onChange={(e) => setBusquedaBento(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-9 pl-8 pr-7 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-1 focus:ring-blue-400 shadow-2xs"
            />
            {busquedaBento && (
              <button
                type="button"
                onClick={() => setBusquedaBento("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

      {/* =====================================================================
          CUADRÍCULA DE PRODUCTOS DEL CATÁLOGO BENTO (OPCIONES LIMPIAS)
          ===================================================================== */}
  <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs">
    {productosBentoAMostrar.length === 0 ? (
      <div className="py-12 text-center text-zinc-400 space-y-1.5">
        <span className="text-3xl block">🛢️</span>
        <p className="text-xs sm:text-sm font-semibold">No se encontraron productos con los filtros seleccionados</p>
      </div>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
        {productosBentoAMostrar.map((prod) => {
          const cantEnOrden = obtenerCantidadItemEnOrden(prod.id);
          const enOrden = cantEnOrden > 0;
          return (
            <div
              key={prod.id}
              onClick={() => void handleAjustarItemBento(prod, 1)}
              className={`group relative flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] min-h-[175px] shadow-2xs ${enOrden
                ? "bg-blue-50/70 dark:bg-blue-500/10 border-blue-400 dark:border-blue-400/50 ring-2 ring-blue-300/60 dark:ring-blue-400/30 shadow-xs"
                : "bg-white hover:bg-zinc-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/40"
                }`}
            >
              {/* Botón restar "−" arriba a la izquierda */}
              {enOrden && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleAjustarItemBento(prod, -1);
                  }}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-sm font-bold flex items-center justify-center shadow-xs active:scale-90 transition-all z-10 cursor-pointer"
                  title="Restar 1"
                >
                  −
                </button>
              )}

              {/* Badge contador verde arriba a la derecha */}
              {enOrden && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs z-10">
                  +{cantEnOrden}
                </span>
              )}

              {/* Gráfico de botella o imagen del producto */}
              <div className="w-20 h-24 sm:w-24 sm:h-28 flex items-center justify-center shrink-0 mt-1">
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-contain" />
                ) : (
                  <BotellaAceiteGrafico viscosidad={prod.viscosity || prod.name} color={prod.color || "#eab308"} />
                )}
              </div>

              {/* Texto grande de viscosidad y precio */}
              <div className="w-full text-center mt-2 px-1">
                <span className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white block truncate">
                  {prod.viscosity || prod.name}
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300 mt-0.5 block">
                  ${Number(prod.price || 0).toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>

  {
    navegacionActiva && (
      <div className="w-full border-t border-zinc-200 dark:border-white/15 py-3 mt-6">
        <div className="flex w-full items-center justify-between gap-3">
          {onIrAAnterior && (
            <button
              type="button"
              onClick={onIrAAnterior}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-700 text-xs sm:text-sm font-semibold cursor-pointer transition-all hover:bg-zinc-200 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              ← Anterior
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSiguienteLubricentro()}
            className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5 ml-auto"
          >
            <span>Siguiente</span>
            <span>→</span>
          </button>
        </div>
      </div>
    )
  }

  {/* =====================================================================
          MODALES DE DETALLE, CREACIÓN/EDICIÓN DE PRODUCTO Y CONFIGURACIÓN MANUAL
          ===================================================================== */}
  {
    productoDetalleModal && (
      <ModalDetalleProductoLubricentro
        producto={productoDetalleModal}
        config={config}
        onClose={() => setProductoDetalleModal(null)}
        onEditar={(prod) => {
          setProductoAEditar(prod);
          setModalProductoFormAbierto(true);
        }}
        onAgregarAlCarrito={(prod, qty, presId) => {
          void handleValidarYAgregarAlCarrito(prod, qty, presId);
        }}
      />
    )
  }

  {
    modalProductoFormAbierto && (
      <ModalProductoLubricentroForm
        productoEditar={productoAEditar}
        config={config}
        defaultCategoryId={categoriaSeleccionadaObj?.id || "lub_aceite"}
        defaultSubcategoryId={subcategoriaActivaId || "lub_aceite_motor"}
        onClose={() => {
          setModalProductoFormAbierto(false);
          setProductoAEditar(null);
        }}
        onGuardado={(_prod, msg) => {
          notificar(msg, "ok");
          void cargarDatosLubricentro();
        }}
        onConfigActualizada={(nuevaConfig) => setConfig(nuevaConfig)}
      />
    )
  }

  {
    modalConfigAbierto && (
      <ModalConfiguracionManualLubricentro
        config={config}
        tabInicial={tabConfigInicial}
        onClose={() => setModalConfigAbierto(false)}
        onConfigGuardada={(nuevaConfig, msg) => {
          setConfig(nuevaConfig);
          notificar(msg, "ok");
          void cargarDatosLubricentro();
        }}
      />
    )
  }

  {
    mostrarModalHistorialAceite && (
      <ModalHistorialCambiosAceite
        isOpen={mostrarModalHistorialAceite}
        onClose={() => setMostrarModalHistorialAceite(false)}
        clienteNombre={ordenActiva?.clientName || ordenActiva?.customerName || ordenActiva?.client || "Cliente Mostrador"}
        placaVehiculo={ordenActiva?.plate || ""}
        descripcionVehiculo={descripcionVehiculo}
        kmActual={kmActual}
        kmProximo={kmProximo}
        cambios={todosCambiosAceiteAnteriores || []}
        cargando={cargandoHistorialRemoto}
        repitiendoCambio={repitiendoCambioAceite}
        onAplicarCambio={(prods) => void handleAplicarCambioEspecifico(prods)}
        onBuscarOtraPlaca={(placa) => void consultarHistorialPlaca(placa)}
      />
    )
  }
    </div >
  );
}
