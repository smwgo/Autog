"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type {
  TecnicentroConfigData,
  TecnicentroPackage,
} from "@/app/api/taller/tecnicentro/route";
import {
  TecnicentroEnrichedService,
  TecnicentroEnrichedTire,
  ModalDetalleTecnicentro,
  ModalServicioTecnicentroForm,
  ModalNeumaticoProductoForm,
  ModalConfiguracionTecnicentro,
} from "./TecnicentroAdminModals";

export interface ModuloTecnicentroCatalogoProps {
  empleadoLogueado: { id: string; nombre: string };
  ordenActiva?: any;
  itemsOrden: any[];
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
  onActualizarItemsOrden: (nuevosItems: any[]) => Promise<void>;
  onIrAAvisoYFirma: () => void;
  onIrASiguiente?: () => void;
  nombreSiguiente?: string;
  triggerAbrirConfig?: number;
}

// ============================================================================
// DEFINICIONES DE CATEGORÍAS Y SUBCATEGORÍAS (1 sola palabra cada una)
// ============================================================================
export interface TecnicentroSubcatDef {
  id: string;
  label: string;
  icon?: string;
  keywords: string[];
}

export interface TecnicentroCatDef {
  id: string;
  label: string;
  icon: string;
  subcategories: TecnicentroSubcatDef[];
}

export const TECNICENTRO_CATEGORIES: TecnicentroCatDef[] = [
  {
    id: "TODO",
    label: "Todo",
    icon: "✨",
    subcategories: [],
  },
  {
    id: "LLANTAS",
    label: "Llantas",
    icon: "🛞",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "PISTERA", label: "Pistera", icon: "🛣️", keywords: ["pistera", "h/t", "ht", "asfalto", "ciudad", "highway"] },
      { id: "MIXTA", label: "Mixta", icon: "⛰️", keywords: ["mixta", "a/t", "at", "all terrain", "todo terreno"] },
      { id: "LODO", label: "Lodo", icon: "🚜", keywords: ["lodo", "m/t", "mt", "mud", "pantano", "fango"] },
      { id: "CARGA", label: "Carga", icon: "🚚", keywords: ["carga", "comercial", "van", "pesada", "8pr", "10pr", "reforzada"] },
      { id: "AROS", label: "Aros", icon: "⚙️", keywords: ["aro", "aros", "rin", "rines", "aluminio", "magnesio"] },
    ],
  },
  {
    id: "ALINEACION",
    label: "Alineación",
    icon: "🎯",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "DELANTERA", label: "Delantera", icon: "⬆️", keywords: ["delantera", "delantero", "eje delantero", "tren delantero"] },
      { id: "COMPLETA", label: "Completa", icon: "🚗", keywords: ["completa", "4 ruedas", "ambos ejes", "3d", "computarizada"] },
      { id: "BALANCEO", label: "Balanceo", icon: "⚖️", keywords: ["balanceo", "plomo", "dinámico", "vibración"] },
      { id: "ROTACION", label: "Rotación", icon: "🔄", keywords: ["rotacion", "rotación", "cruce"] },
      { id: "CAMBER", label: "Camber", icon: "📐", keywords: ["camber", "comba", "caster", "caída", "convergencia", "geometría"] },
    ],
  },
  {
    id: "ENLLANTAJE",
    label: "Enllantaje",
    icon: "🔧",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "MONTAJE", label: "Montaje", icon: "🔩", keywords: ["montaje", "desmontaje", "enllante", "desenllante"] },
      { id: "PARCHE", label: "Parche", icon: "🩹", keywords: ["parche", "pinchazo", "pinchadura", "tarugo", "seta"] },
      { id: "VULCANIZADO", label: "Vulcanizado", icon: "🔥", keywords: ["vulcanizado", "vulcanizar", "sección", "termoparche"] },
      { id: "VALVULA", label: "Válvula", icon: "🔘", keywords: ["valvula", "válvula", "pitón", "tapon", "sensor tpms"] },
      { id: "NITROGENO", label: "Nitrógeno", icon: "💨", keywords: ["nitrogeno", "nitrógeno", "inflado", "n2", "presión"] },
    ],
  },
  {
    id: "FRENOS",
    label: "Frenos",
    icon: "🛑",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "PASTILLAS", label: "Pastillas", icon: "🟫", keywords: ["pastilla", "pastillas", "balata", "caliper"] },
      { id: "DISCOS", label: "Discos", icon: "💿", keywords: ["disco", "discos", "rotor", "ventilado"] },
      { id: "ZAPATAS", label: "Zapatas", icon: "👞", keywords: ["zapata", "zapatas", "tambor", "tambores", "cintas"] },
      { id: "RECTIFICADO", label: "Rectificado", icon: "⚙️", keywords: ["rectificado", "rectificar", "torneado", "torno"] },
      { id: "LIQUIDO", label: "Líquido", icon: "💧", keywords: ["liquido", "líquido", "dot3", "dot4", "dot5", "purgado"] },
    ],
  },
  {
    id: "SUSPENSION",
    label: "Suspensión",
    icon: "🔩",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "AMORTIGUADOR", label: "Amortiguador", icon: "🔽", keywords: ["amortiguador", "amortiguadores", "puntal", "strut", "espiral"] },
      { id: "TERMINAL", label: "Terminal", icon: "🔗", keywords: ["terminal", "terminales", "axial", "cremallera", "bieleta"] },
      { id: "ROTULA", label: "Rótula", icon: "🔩", keywords: ["rotula", "rótula", "rótulas", "ball joint"] },
      { id: "BUJES", label: "Bujes", icon: "⭕", keywords: ["buje", "bujes", "silentblock", "caucho", "bocina"] },
      { id: "MESA", label: "Mesa", icon: "🔧", keywords: ["mesa", "trapecio", "brazo", "tijera", "parrilla"] },
    ],
  },
  {
    id: "BATERIAS",
    label: "Baterías",
    icon: "🔋",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "LIVIANO", label: "Liviano", icon: "🚗", keywords: ["liviano", "auto", "12v", "45ah", "60ah", "70ah", "ns40", "ns60"] },
      { id: "PESADO", label: "Pesado", icon: "🚚", keywords: ["pesado", "camion", "camión", "diesel", "100ah", "150ah", "24v", "n100"] },
      { id: "CARGA", label: "Carga", icon: "⚡", keywords: ["carga", "recarga", "alternador", "arrancador", "test batería"] },
      { id: "BORNES", label: "Bornes", icon: "🔌", keywords: ["borne", "bornes", "terminales bateria", "limpieza bornes", "sulfatado"] },
    ],
  },
];

// Selector de medida de rin en 1 sola palabra
export const RINES_TECNICENTRO = [
  { id: "Aro", label: "Aro" },
  { id: "R13", label: "R13" },
  { id: "R14", label: "R14" },
  { id: "R15", label: "R15" },
  { id: "R16", label: "R16" },
  { id: "R17", label: "R17" },
  { id: "R18+", label: "R18+" },
];

// Reglas de extracción de palabras clave para Tecnicentro
const KEYWORD_RULES_TECNICENTRO: Array<{ match: RegExp; keyword: string }> = [
  { match: /alineaci[oó]n/i, keyword: "ALINEACIÓN" },
  { match: /balanceo/i, keyword: "BALANCEO" },
  { match: /rotaci[oó]n/i, keyword: "ROTACIÓN" },
  { match: /camber|comba/i, keyword: "CAMBER" },
  { match: /montaje|desmontaje|enllant/i, keyword: "MONTAJE" },
  { match: /parche|pinchazo/i, keyword: "PARCHE" },
  { match: /vulcaniz/i, keyword: "VULCANIZADO" },
  { match: /v[aá]lvula|pit[oó]n/i, keyword: "VÁLVULA" },
  { match: /nitr[oó]geno/i, keyword: "NITRÓGENO" },
  { match: /pastilla|balata/i, keyword: "PASTILLAS" },
  { match: /disco/i, keyword: "DISCOS" },
  { match: /zapata|tambor/i, keyword: "ZAPATAS" },
  { match: /rectific/i, keyword: "RECTIFICADO" },
  { match: /l[ií]quido.*freno|l[ií]quido/i, keyword: "LÍQUIDO" },
  { match: /amortiguador/i, keyword: "AMORTIGUADOR" },
  { match: /terminal|axial/i, keyword: "TERMINAL" },
  { match: /r[oó]tula/i, keyword: "RÓTULA" },
  { match: /buje/i, keyword: "BUJES" },
  { match: /mesa|trapecio/i, keyword: "MESA" },
  { match: /bater[ií]a/i, keyword: "BATERÍA" },
  { match: /borne/i, keyword: "BORNES" },
  { match: /aro|rin/i, keyword: "AROS" },
];

function extractKeywordTecnicentro(name: string, tireSize?: string): string {
  if (tireSize && tireSize.length >= 5) {
    return tireSize.replace(/\s+/g, "").toUpperCase();
  }
  const sizeMatch = name.match(/(\d{3}\/\d{2}\s*R\d{2}\+?|\d{3}\/\d{2}R\d{2})/i);
  if (sizeMatch) {
    return sizeMatch[0].replace(/\s+/g, "").toUpperCase();
  }
  for (const rule of KEYWORD_RULES_TECNICENTRO) {
    if (rule.match.test(name)) {
      return rule.keyword;
    }
  }
  const cleaned = name
    .replace(/^(Servicio|Cambio|Instalación|Revisión|Reparación|Mantenimiento)\s+(de\s+|del\s+)?/i, "")
    .replace(/^De\s+/i, "")
    .trim();
  const first = cleaned.split(/[\s/+,&-_]+/)[0];
  return (first || name).toUpperCase();
}

const FALLBACK_TEC_ICONS: Record<string, string> = {
  ALINEACIÓN: "🎯",
  BALANCEO: "⚖️",
  ROTACIÓN: "🔄",
  CAMBER: "📐",
  MONTAJE: "🔧",
  PARCHE: "🩹",
  VULCANIZADO: "🔥",
  VÁLVULA: "🔘",
  NITRÓGENO: "💨",
  PASTILLAS: "🟫",
  DISCOS: "💿",
  ZAPATAS: "👞",
  RECTIFICADO: "⚙️",
  LÍQUIDO: "💧",
  AMORTIGUADOR: "🔽",
  TERMINAL: "🔗",
  RÓTULA: "🔩",
  BUJES: "⭕",
  MESA: "🔧",
  BATERÍA: "🔋",
  BORNES: "🔌",
  AROS: "⚙️",
  DEFAULT: "🛞",
};

// Servicios y productos base de Tecnicentro
const ITEMS_BASE_TECNICENTRO = [
  // Llantas
  { id: "tc_neu_1856515", name: "Llanta 185/65 R15 Pistera", category: "LLANTAS", subcategory: "PISTERA", rim: "R15", price: 65.0, icon: "🛞" },
  { id: "tc_neu_2055516", name: "Llanta 205/55 R16 Pistera", category: "LLANTAS", subcategory: "PISTERA", rim: "R16", price: 78.0, icon: "🛞" },
  { id: "tc_neu_2657017", name: "Llanta 265/70 R17 Mixta A/T", category: "LLANTAS", subcategory: "MIXTA", rim: "R17", price: 145.0, icon: "🛞" },
  { id: "tc_neu_2857516", name: "Llanta 285/75 R16 Lodo M/T", category: "LLANTAS", subcategory: "LODO", rim: "R16", price: 180.0, icon: "🛞" },
  { id: "tc_neu_1957015", name: "Llanta 195/70 R15C Carga", category: "LLANTAS", subcategory: "CARGA", rim: "R15", price: 85.0, icon: "🛞" },
  { id: "tc_aro_mag15", name: "Aro de Aluminio R15", category: "LLANTAS", subcategory: "AROS", rim: "R15", price: 95.0, icon: "⚙️" },
  // Alineación
  { id: "tc_ali_delantera", name: "Alineación Delantera", category: "ALINEACION", subcategory: "DELANTERA", rim: "", price: 15.0, icon: "⬆️" },
  { id: "tc_ali_completa", name: "Alineación Completa 3D", category: "ALINEACION", subcategory: "COMPLETA", rim: "", price: 25.0, icon: "🚗" },
  { id: "tc_bal_dinamico", name: "Balanceo Dinámico", category: "ALINEACION", subcategory: "BALANCEO", rim: "", price: 5.0, icon: "⚖️" },
  { id: "tc_rot_ruedas", name: "Rotación de 4 Ruedas", category: "ALINEACION", subcategory: "ROTACION", rim: "", price: 8.0, icon: "🔄" },
  { id: "tc_cam_correccion", name: "Corrección de Camber", category: "ALINEACION", subcategory: "CAMBER", rim: "", price: 18.0, icon: "📐" },
  // Enllantaje
  { id: "tc_enl_montaje", name: "Montaje y Desmontaje", category: "ENLLANTAJE", subcategory: "MONTAJE", rim: "", price: 4.0, icon: "🔧" },
  { id: "tc_enl_parche", name: "Parche Tipo Seta", category: "ENLLANTAJE", subcategory: "PARCHE", rim: "", price: 6.0, icon: "🩹" },
  { id: "tc_enl_vulcanizado", name: "Vulcanizado de Llanta", category: "ENLLANTAJE", subcategory: "VULCANIZADO", rim: "", price: 12.0, icon: "🔥" },
  { id: "tc_enl_valvula", name: "Válvula de Aire Cromada", category: "ENLLANTAJE", subcategory: "VALVULA", rim: "", price: 2.5, icon: "🔘" },
  { id: "tc_enl_nitrogeno", name: "Inflado con Nitrógeno", category: "ENLLANTAJE", subcategory: "NITROGENO", rim: "", price: 4.0, icon: "💨" },
  // Frenos
  { id: "tc_fre_pastillas", name: "Cambio Pastillas Frenos", category: "FRENOS", subcategory: "PASTILLAS", rim: "", price: 18.0, icon: "🟫" },
  { id: "tc_fre_discos", name: "Cambio Discos de Freno", category: "FRENOS", subcategory: "DISCOS", rim: "", price: 28.0, icon: "💿" },
  { id: "tc_fre_zapatas", name: "Cambio Zapatas Tambor", category: "FRENOS", subcategory: "ZAPATAS", rim: "", price: 22.0, icon: "👞" },
  { id: "tc_fre_rectificado", name: "Rectificado de Discos", category: "FRENOS", subcategory: "RECTIFICADO", rim: "", price: 16.0, icon: "⚙️" },
  { id: "tc_fre_liquido", name: "Líquido de Frenos DOT4", category: "FRENOS", subcategory: "LIQUIDO", rim: "", price: 15.0, icon: "💧" },
  // Suspensión
  { id: "tc_sus_amortiguador", name: "Cambio Amortiguador", category: "SUSPENSION", subcategory: "AMORTIGUADOR", rim: "", price: 25.0, icon: "🔽" },
  { id: "tc_sus_terminal", name: "Cambio Terminal Dirección", category: "SUSPENSION", subcategory: "TERMINAL", rim: "", price: 15.0, icon: "🔗" },
  { id: "tc_sus_rotula", name: "Cambio de Rótula", category: "SUSPENSION", subcategory: "ROTULA", rim: "", price: 16.0, icon: "🔩" },
  { id: "tc_sus_bujes", name: "Cambio Bujes Trapecio", category: "SUSPENSION", subcategory: "BUJES", rim: "", price: 20.0, icon: "⭕" },
  { id: "tc_sus_mesa", name: "Cambio Mesa / Trapecio", category: "SUSPENSION", subcategory: "MESA", rim: "", price: 30.0, icon: "🔧" },
  // Baterías
  { id: "tc_bat_liviano", name: "Batería 12V 60Ah Liviano", category: "BATERIAS", subcategory: "LIVIANO", rim: "", price: 85.0, icon: "🔋" },
  { id: "tc_bat_pesado", name: "Batería 12V 100Ah Pesado", category: "BATERIAS", subcategory: "PESADO", rim: "", price: 140.0, icon: "🔋" },
  { id: "tc_bat_carga", name: "Test y Carga de Batería", category: "BATERIAS", subcategory: "CARGA", rim: "", price: 5.0, icon: "⚡" },
  { id: "tc_bat_bornes", name: "Limpieza y Cambio Bornes", category: "BATERIAS", subcategory: "BORNES", rim: "", price: 4.5, icon: "🔌" },
];

function classifyItemCategoryTec(
  item: { name: string; code?: string; brand?: string; category?: string; categoryId?: string }
): "LLANTAS" | "ALINEACION" | "ENLLANTAJE" | "FRENOS" | "SUSPENSION" | "BATERIAS" {
  const text = `${item.name} ${item.code || ""} ${item.category || ""} ${item.categoryId || ""}`.toLowerCase();
  if (text.includes("bater") || text.includes("borne") || text.includes("acumulador")) {
    return "BATERIAS";
  }
  if (text.includes("freno") || text.includes("pastilla") || text.includes("disco") || text.includes("zapata") || text.includes("balata") || text.includes("rectific")) {
    return "FRENOS";
  }
  if (text.includes("suspensi") || text.includes("amortiguador") || text.includes("terminal") || text.includes("rotula") || text.includes("rótula") || text.includes("buje") || text.includes("mesa") || text.includes("trapecio")) {
    return "SUSPENSION";
  }
  if (text.includes("alineaci") || text.includes("balanceo") || text.includes("rotaci") || text.includes("camber") || text.includes("geometría")) {
    return "ALINEACION";
  }
  if (text.includes("enllant") || text.includes("montaje") || text.includes("desmontaje") || text.includes("parche") || text.includes("vulcaniz") || text.includes("valvula") || text.includes("válvula") || text.includes("nitrogeno") || text.includes("nitrógeno")) {
    return "ENLLANTAJE";
  }
  return "LLANTAS";
}

function classifyItemSubcategoryTec(
  category: "LLANTAS" | "ALINEACION" | "ENLLANTAJE" | "FRENOS" | "SUSPENSION" | "BATERIAS",
  item: { name: string; code?: string }
): string {
  const text = `${item.name} ${item.code || ""}`.toLowerCase();
  if (category === "LLANTAS") {
    if (text.includes("aro") || text.includes("rin")) return "AROS";
    if (text.includes("carga") || text.includes("van") || text.includes("comercial") || text.includes("8pr")) return "CARGA";
    if (text.includes("lodo") || text.includes("m/t") || text.includes("mt") || text.includes("mud")) return "LODO";
    if (text.includes("mixta") || text.includes("a/t") || text.includes("at") || text.includes("terrain")) return "MIXTA";
    return "PISTERA";
  }
  if (category === "ALINEACION") {
    if (text.includes("delantera") || text.includes("delantero")) return "DELANTERA";
    if (text.includes("balanceo")) return "BALANCEO";
    if (text.includes("rotaci")) return "ROTACION";
    if (text.includes("camber") || text.includes("comba")) return "CAMBER";
    return "COMPLETA";
  }
  if (category === "ENLLANTAJE") {
    if (text.includes("parche") || text.includes("pinchazo")) return "PARCHE";
    if (text.includes("vulcaniz")) return "VULCANIZADO";
    if (text.includes("valvula") || text.includes("válvula")) return "VALVULA";
    if (text.includes("nitrogeno") || text.includes("nitrógeno")) return "NITROGENO";
    return "MONTAJE";
  }
  if (category === "FRENOS") {
    if (text.includes("disco")) return "DISCOS";
    if (text.includes("zapata") || text.includes("tambor")) return "ZAPATAS";
    if (text.includes("rectific")) return "RECTIFICADO";
    if (text.includes("liquido") || text.includes("líquido")) return "LIQUIDO";
    return "PASTILLAS";
  }
  if (category === "SUSPENSION") {
    if (text.includes("terminal") || text.includes("axial")) return "TERMINAL";
    if (text.includes("rotula") || text.includes("rótula")) return "ROTULA";
    if (text.includes("buje")) return "BUJES";
    if (text.includes("mesa") || text.includes("trapecio")) return "MESA";
    return "AMORTIGUADOR";
  }
  if (category === "BATERIAS") {
    if (text.includes("pesad") || text.includes("camion") || text.includes("100ah")) return "PESADO";
    if (text.includes("carga") || text.includes("recarga")) return "CARGA";
    if (text.includes("borne")) return "BORNES";
    return "LIVIANO";
  }
  return "TODOS";
}

export default function ModuloTecnicentroCatalogo({
  empleadoLogueado,
  ordenActiva,
  itemsOrden,
  mostrarToast,
  onActualizarItemsOrden,
  onIrAAvisoYFirma,
  onIrASiguiente,
  triggerAbrirConfig,
}: ModuloTecnicentroCatalogoProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<TecnicentroConfigData | null>(null);
  const [services, setServices] = useState<TecnicentroEnrichedService[]>([]);
  const [tires, setTires] = useState<TecnicentroEnrichedTire[]>([]);

  // Categorías y subcategorías contraíbles
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("TODO");
  const [mostrarCategorias, setMostrarCategorias] = useState<boolean>(true);
  const [subcategoriaActivaId, setSubcategoriaActivaId] = useState<string>("TODOS");
  const [mostrarSubcategorias, setMostrarSubcategorias] = useState<boolean>(true);

  // Selector contraíble de medida de Rin ("Aro", "R13", "R14", "R15", "R16", "R17", "R18+")
  const [rinActivo, setRinActivo] = useState<string>("Aro");
  const [mostrarRines, setMostrarRines] = useState<boolean>(false);

  // Multiplicadores rápidos: x1, x2, x4
  const [multiplicadorActivo, setMultiplicadorActivo] = useState<1 | 2 | 4>(1);

  // Buscador del POS
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modales administrativos preservados
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<{
    item: TecnicentroEnrichedService | TecnicentroPackage | TecnicentroEnrichedTire;
    kind: "SERVICE" | "PACKAGE" | "TIRE";
  } | null>(null);
  const [serviceFormModal, setServiceFormModal] = useState<{
    open: boolean;
    service?: Partial<TecnicentroEnrichedService> | null;
  }>({ open: false, service: null });
  const [tireFormModal, setTireFormModal] = useState<{
    open: boolean;
    tire?: Partial<TecnicentroEnrichedTire> | null;
  }>({ open: false, tire: null });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (triggerAbrirConfig && triggerAbrirConfig > 0) {
      setConfigModalOpen(true);
    }
  }, [triggerAbrirConfig]);

  // Cargar catálogo desde la API
  const fetchTecnicentroData = useCallback(async () => {
    try {
      if (!config) setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/taller/tecnicentro", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cargar el módulo Tecnicentro");
      }
      setConfig(data.config);
      setServices(data.services || []);
      setTires(data.tires || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con Tecnicentro");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void fetchTecnicentroData();
    const handleCatalogoActualizado = () => {
      void fetchTecnicentroData();
    };
    window.addEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    return () => {
      window.removeEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    };
  }, [fetchTecnicentroData]);

  // Manejo de categorías
  const categoriaSeleccionadaObj = useMemo(() => {
    return TECNICENTRO_CATEGORIES.find((c) => c.id === categoriaActivaId) || TECNICENTRO_CATEGORIES[0];
  }, [categoriaActivaId]);

  const subcategoriasActivas = useMemo(() => {
    if (categoriaActivaId === "TODO") return [];
    return categoriaSeleccionadaObj.subcategories;
  }, [categoriaActivaId, categoriaSeleccionadaObj]);

  const subcategoriaSeleccionadaObj = useMemo(() => {
    if (subcategoriaActivaId === "TODOS") return null;
    return subcategoriasActivas.find((s) => s.id === subcategoriaActivaId) || null;
  }, [subcategoriaActivaId, subcategoriasActivas]);

  // Construcción unificada de ítems para el POS
  const todosLosItemsPOS = useMemo(() => {
    const list: Array<{
      id: string;
      kind: "SERVICE" | "PRODUCT" | "TIRE";
      name: string;
      code: string;
      brand: string;
      price: number;
      durationMinutes?: number;
      imageUrl?: string;
      categoryMapped: "LLANTAS" | "ALINEACION" | "ENLLANTAJE" | "FRENOS" | "SUSPENSION" | "BATERIAS";
      subcategoryMapped: string;
      keyword: string;
      tireSize?: string;
      rimDiameter?: string;
      itemIcon: string;
    }> = [];

    const existingKeywords = new Set<string>();

    // 1. Neumáticos / Llantas de la base de datos
    tires.forEach((tire) => {
      if (!tire.active) return;
      const cat = "LLANTAS" as const;
      const sub = classifyItemSubcategoryTec(cat, tire);
      const kw = extractKeywordTecnicentro(tire.name, tire.tireSize);
      existingKeywords.add(kw);

      list.push({
        id: tire.id,
        kind: "TIRE",
        name: tire.name,
        code: tire.code,
        brand: tire.brand || "Llanta",
        price: Number(tire.price || 0),
        durationMinutes: 30,
        imageUrl: tire.imageUrl,
        categoryMapped: cat,
        subcategoryMapped: sub,
        keyword: kw,
        tireSize: tire.tireSize,
        rimDiameter: tire.rimDiameter,
        itemIcon: "🛞",
      });
    });

    // 2. Servicios de Tecnicentro de la base de datos
    services.forEach((srv) => {
      if (!srv.active) return;
      const cat = classifyItemCategoryTec(srv);
      const sub = classifyItemSubcategoryTec(cat, srv);
      const kw = extractKeywordTecnicentro(srv.name);
      existingKeywords.add(kw);

      list.push({
        id: srv.id,
        kind: "SERVICE",
        name: srv.name,
        code: srv.code,
        brand: "Tecnicentro",
        price: Number(srv.basePrice || srv.promoPrice || 0),
        durationMinutes: srv.estimatedMinutes || 30,
        imageUrl: srv.imageUrl,
        categoryMapped: cat,
        subcategoryMapped: sub,
        keyword: kw,
        itemIcon: FALLBACK_TEC_ICONS[kw] || FALLBACK_TEC_ICONS.DEFAULT,
      });
    });

    // 3. Catálogo base complementario para garantizar cobertura total de categorías
    ITEMS_BASE_TECNICENTRO.forEach((base) => {
      const kw = extractKeywordTecnicentro(base.name);
      if (!existingKeywords.has(kw)) {
        list.push({
          id: base.id,
          kind: base.category === "LLANTAS" ? "TIRE" : "SERVICE",
          name: base.name,
          code: `TC-${base.id.toUpperCase()}`,
          brand: "Tecnicentro",
          price: base.price,
          durationMinutes: 30,
          categoryMapped: base.category as any,
          subcategoryMapped: base.subcategory,
          keyword: kw,
          rimDiameter: base.rim || undefined,
          itemIcon: base.icon,
        });
      }
    });

    return list;
  }, [tires, services]);

  // Ítems de Tecnicentro en la orden activa
  const itemsTecnicentroEnOrden = useMemo(() => {
    return (itemsOrden || []).filter((it) => {
      const code = String(it.code || "");
      const cat = String(it.category || "");
      const sub = String(it.subCategory || "");
      return (
        cat === "Tecnicentro" ||
        cat === "Llantas" ||
        cat === "Alineación" ||
        cat === "Frenos" ||
        cat === "Suspensión" ||
        cat === "Baterías" ||
        code.startsWith("TC-") ||
        code.startsWith("NEU-") ||
        code.startsWith("PRD-TC-") ||
        sub.includes("Tecnicentro") ||
        sub.includes("Alineación") ||
        sub.includes("Llantas")
      );
    });
  }, [itemsOrden]);

  const totalUnidadesTecnicentro = useMemo(() => {
    return itemsTecnicentroEnOrden.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  }, [itemsTecnicentroEnOrden]);

  const totalMontoTecnicentro = useMemo(() => {
    return itemsTecnicentroEnOrden.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
  }, [itemsTecnicentroEnOrden]);

  // Conteos por categoría
  const conteoItemsPorCategoria = useMemo(() => {
    const map: Record<string, number> = { TODO: todosLosItemsPOS.length };
    todosLosItemsPOS.forEach((it) => {
      map[it.categoryMapped] = (map[it.categoryMapped] || 0) + 1;
    });
    return map;
  }, [todosLosItemsPOS]);

  const conteoEnPedidoPorCategoria = useMemo(() => {
    const map: Record<string, number> = { TODO: totalUnidadesTecnicentro };
    itemsTecnicentroEnOrden.forEach((it) => {
      const cat = classifyItemCategoryTec({ name: it.name, code: it.code, category: it.category });
      map[cat] = (map[cat] || 0) + (Number(it.qty) || 1);
    });
    return map;
  }, [itemsTecnicentroEnOrden, totalUnidadesTecnicentro]);

  // Conteos por subcategoría dentro de la categoría activa
  const conteoItemsPorSubcategoria = useMemo(() => {
    const map: Record<string, number> = { TODOS: conteoItemsPorCategoria[categoriaActivaId] || 0 };
    todosLosItemsPOS.forEach((it) => {
      if (categoriaActivaId === "TODO" || it.categoryMapped === categoriaActivaId) {
        map[it.subcategoryMapped] = (map[it.subcategoryMapped] || 0) + 1;
      }
    });
    return map;
  }, [todosLosItemsPOS, categoriaActivaId, conteoItemsPorCategoria]);

  const conteoEnPedidoPorSubcategoria = useMemo(() => {
    const map: Record<string, number> = { TODOS: conteoEnPedidoPorCategoria[categoriaActivaId] || 0 };
    itemsTecnicentroEnOrden.forEach((it) => {
      const cat = classifyItemCategoryTec({ name: it.name, code: it.code, category: it.category });
      if (categoriaActivaId === "TODO" || cat === categoriaActivaId) {
        const sub = classifyItemSubcategoryTec(cat, { name: it.name, code: it.code });
        map[sub] = (map[sub] || 0) + (Number(it.qty) || 1);
      }
    });
    return map;
  }, [itemsTecnicentroEnOrden, categoriaActivaId, conteoEnPedidoPorCategoria]);

  // Filtro de items para el POS
  const itemsFiltrados = useMemo(() => {
    const q = searchQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    return todosLosItemsPOS.filter((item) => {
      // Filtro de categoría
      if (categoriaActivaId !== "TODO" && item.categoryMapped !== categoriaActivaId) {
        return false;
      }
      // Filtro de subcategoría
      if (subcategoriaActivaId !== "TODOS" && item.subcategoryMapped !== subcategoriaActivaId) {
        return false;
      }
      // Filtro de Rin
      if (rinActivo !== "Aro") {
        if (item.categoryMapped === "LLANTAS") {
          const itemRim = item.rimDiameter?.toUpperCase() || "";
          const text = `${item.name} ${item.keyword}`.toUpperCase();
          if (rinActivo === "R18+") {
            const match18Plus = /R(18|19|20|21|22|23|24)/i.test(itemRim || text);
            if (!match18Plus) return false;
          } else {
            if (!itemRim.includes(rinActivo) && !text.includes(rinActivo)) {
              return false;
            }
          }
        }
      }
      // Filtro de búsqueda
      if (q) {
        const haystack = `${item.name} ${item.keyword} ${item.code} ${item.brand} ${item.tireSize || ""}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [todosLosItemsPOS, categoriaActivaId, subcategoriaActivaId, rinActivo, searchQuery]);

  // Cantidad de un item en el pedido actual
  const obtenerCantidadEnPedido = (item: { id: string; code?: string }) => {
    const matches = (itemsOrden || []).filter(
      (it) =>
        it.id === item.id ||
        it.id === `tc_${item.id}` ||
        it.id === `neu_${item.id}` ||
        it.id?.startsWith?.(`tc_${item.id}_`) ||
        it.id?.startsWith?.(`neu_${item.id}_`) ||
        it.productId === item.id ||
        it.serviceId === item.id ||
        (it.code && item.code && it.code === item.code)
    );
    return matches.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
  };

  // Ajustar cantidad (+multiplicadorActivo al pulsar la tarjeta / -1 con el botón −)
  const handleAjustarCantidadItem = async (
    item: {
      id: string;
      kind: "SERVICE" | "PRODUCT" | "TIRE";
      name: string;
      code: string;
      price: number;
      durationMinutes?: number;
      categoryMapped: string;
      keyword: string;
      brand?: string;
      tireSize?: string;
    },
    delta: number
  ) => {
    try {
      const isTire = item.kind === "TIRE";
      const code = item.code || `TC-${item.id}`;
      const listaActual = [...(itemsOrden || [])];
      const idx = listaActual.findIndex(
        (it) =>
          it.id === item.id ||
          it.id === `tc_${item.id}` ||
          it.id === `neu_${item.id}` ||
          it.id?.startsWith?.(`tc_${item.id}_`) ||
          it.id?.startsWith?.(`neu_${item.id}_`) ||
          it.serviceId === item.id ||
          it.productId === item.id ||
          (it.code && code && it.code === code)
      );

      if (idx >= 0) {
        const actualQty = Number(listaActual[idx].qty) || 1;
        const nextQty = actualQty + delta;
        if (nextQty <= 0) {
          const filtrados = listaActual.filter((_, i) => i !== idx);
          await onActualizarItemsOrden(filtrados);
        } else {
          const priceUnit = Number(item.price || listaActual[idx].price || 0);
          const actualizados = listaActual.map((it, i) =>
            i === idx
              ? {
                  ...it,
                  qty: nextQty,
                  price: priceUnit,
                  total: Number((priceUnit * nextQty).toFixed(2)),
                }
              : it
          );
          await onActualizarItemsOrden(actualizados);
        }
      } else if (delta > 0) {
        const priceUnit = Number(item.price || 0);
        const nuevoItem = {
          id: isTire ? `neu_${item.id}_${Date.now()}` : `tc_${item.id}_${Date.now()}`,
          key: `key_${item.id}_${Date.now()}`,
          serviceId: isTire ? undefined : item.id,
          productId: isTire ? item.id : undefined,
          type: isTire ? ("PART" as const) : ("SERVICE" as const),
          category: "Tecnicentro",
          subCategory: item.categoryMapped,
          cwCategoryId: categoriaActivaId,
          code,
          name: item.name,
          brand: item.brand || "Tecnicentro",
          presentation: isTire ? (item.tireSize || "Unidad") : `${item.durationMinutes || 30} min`,
          unitOfMeasure: isTire ? "Unidad" : "Servicio",
          price: priceUnit,
          total: Number((priceUnit * delta).toFixed(2)),
          qty: delta,
          estimatedMinutes: item.durationMinutes || 30,
          vehicleType: "General",
          status: "Listo" as const,
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        };
        await onActualizarItemsOrden([...listaActual, nuevoItem]);
      }
    } catch {
      mostrarToast("Error al actualizar ítem en la orden", "err");
    }
  };

  // Guardar configuración administrativa
  const handleSaveConfigAdmin = async (updatedConfig: TecnicentroConfigData) => {
    const res = await fetch("/api/taller/tecnicentro", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: updatedConfig }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "Error al guardar configuración", "err");
      throw new Error(data.error || "Error");
    }
    setConfig(data.config);
    setServices(data.services || []);
  };

  const handleSaveServiceAdmin = async (servicePayload: any) => {
    const res = await fetch("/api/taller/tecnicentro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SAVE_SERVICE",
        service: servicePayload,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "Error al guardar servicio", "err");
      throw new Error(data.error || "Error");
    }
    setConfig(data.config);
    setServices(data.services || []);
    mostrarToast("Servicio guardado correctamente", "ok");
  };

  const handleDeleteServiceAdmin = async (id: string) => {
    const res = await fetch(`/api/taller/tecnicentro?id=${encodeURIComponent(id)}&type=service`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "No se pudo eliminar el servicio", "err");
      return;
    }
    setServices(data.services || []);
    setServiceFormModal({ open: false, service: null });
    mostrarToast("Servicio eliminado", "ok");
  };

  const handleSaveTireAdmin = async (tirePayload: any) => {
    const res = await fetch("/api/taller/tecnicentro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SAVE_TIRE",
        tire: tirePayload,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "Error al guardar neumático", "err");
      throw new Error(data.error || "Error");
    }
    setTires(data.tires || []);
    setTireFormModal({ open: false, tire: null });
    mostrarToast("Neumático guardado correctamente", "ok");
  };

  const handleDeleteTireAdmin = async (id: string) => {
    const res = await fetch(`/api/taller/tecnicentro?id=${encodeURIComponent(id)}&type=tire`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "No se pudo eliminar el neumático", "err");
      return;
    }
    setTires(data.tires || []);
    setTireFormModal({ open: false, tire: null });
    mostrarToast("Neumático eliminado", "ok");
  };

  if (!mounted || (loading && !config)) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 text-center space-y-3 animate-pulse">
        <div className="text-3xl">🛞</div>
        <p className="text-sm font-normal text-zinc-700 dark:text-zinc-300">
          Cargando catálogo de Tecnicentro, llantas y servicios...
        </p>
      </div>
    );
  }

  if (errorMsg && !config) {
    return (
      <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-center space-y-3">
        <p className="text-sm font-normal text-rose-700 dark:text-rose-300">
          ⚠️ {errorMsg}
        </p>
        <button
          type="button"
          onClick={() => void fetchTecnicentroData()}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-normal cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 animate-fade-in pb-24 sm:pb-28">
      {/* =====================================================================
          1. CATEGORÍAS PRINCIPALES CONTRAÍBLES
          ===================================================================== */}
      <div className="space-y-2 rounded-2xl bg-zinc-50/80 dark:bg-black/20 p-2.5 sm:p-3 border border-zinc-200/80 dark:border-white/10 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {mostrarCategorias ? (
            <>
              {TECNICENTRO_CATEGORIES.map((cat) => {
                const sel = categoriaActivaId === cat.id;
                const totalCat = conteoItemsPorCategoria[cat.id] || 0;
                const enPedidoCat = conteoEnPedidoPorCategoria[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoriaActivaId(cat.id);
                      setSubcategoriaActivaId("TODOS");
                      setMostrarCategorias(false);
                      setMostrarSubcategorias(true);
                    }}
                    className={`flex-1 min-w-[90px] sm:min-w-[110px] h-9 sm:h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
                      sel
                        ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                        : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                    }`}
                  >
                    <span className="text-sm leading-none shrink-0">{cat.icon}</span>
                    <span className="whitespace-nowrap">{cat.label}</span>
                    {enPedidoCat > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-md text-xs leading-none tabular-nums font-bold bg-emerald-500 text-white shrink-0">
                        {enPedidoCat}
                      </span>
                    ) : (
                      <span
                        className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
                          sel
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
                            : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
                        }`}
                      >
                        {totalCat}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarCategorias(true)}
              aria-label="Desplegar categorías"
              className="min-w-[110px] h-9 sm:h-10 px-3.5 rounded-xl border bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap"
            >
              <span className="text-sm leading-none shrink-0">{categoriaSeleccionadaObj.icon}</span>
              <span>{categoriaSeleccionadaObj.label}</span>
              {conteoEnPedidoPorCategoria[categoriaActivaId] > 0 ? (
                <span className="px-1.5 py-0.5 rounded-md text-xs leading-none tabular-nums font-bold bg-emerald-500 text-white shrink-0">
                  {conteoEnPedidoPorCategoria[categoriaActivaId]}
                </span>
              ) : (
                <span className="text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30 font-medium">
                  {conteoItemsPorCategoria[categoriaActivaId] || 0}
                </span>
              )}
            </button>
          )}
        </div>

        {/* SUBCATEGORÍAS CONTRAÍBLES */}
        {categoriaActivaId !== "TODO" && subcategoriasActivas.length > 0 && (
          <div className="space-y-2 border-t border-zinc-200/80 pt-2.5 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {mostrarSubcategorias ? (
                <>
                  {subcategoriasActivas.map((sub) => {
                    const activa = subcategoriaActivaId === sub.id;
                    const countSub = conteoItemsPorSubcategoria[sub.id] || 0;
                    const enPedidoSub = conteoEnPedidoPorSubcategoria[sub.id] || 0;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setSubcategoriaActivaId(sub.id);
                          setMostrarSubcategorias(false);
                        }}
                        className={`flex-1 min-w-[85px] sm:min-w-[105px] h-8 sm:h-8.5 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap ${
                          activa
                            ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                            : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {sub.icon && <span className="text-xs leading-none shrink-0">{sub.icon}</span>}
                        <span className="whitespace-nowrap">{sub.label}</span>
                        {enPedidoSub > 0 ? (
                          <span className="px-1.5 py-0.5 rounded-md text-xs leading-none tabular-nums font-bold bg-emerald-500 text-white shrink-0">
                            {enPedidoSub}
                          </span>
                        ) : (
                          <span
                            className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md shrink-0 font-medium ${
                              activa
                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
                                : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
                            }`}
                          >
                            {countSub}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarSubcategorias(true)}
                  aria-label="Desplegar subcategorías"
                  className="min-w-[100px] h-8 sm:h-8.5 px-3 rounded-lg border bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
                >
                  {subcategoriaSeleccionadaObj?.icon && (
                    <span className="text-xs leading-none shrink-0">{subcategoriaSeleccionadaObj.icon}</span>
                  )}
                  <span className="whitespace-nowrap">
                    {subcategoriaSeleccionadaObj ? subcategoriaSeleccionadaObj.label : "Todos"}
                  </span>
                  {conteoEnPedidoPorSubcategoria[subcategoriaActivaId] > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-md text-xs leading-none tabular-nums font-bold bg-emerald-500 text-white shrink-0">
                      {conteoEnPedidoPorSubcategoria[subcategoriaActivaId]}
                    </span>
                  ) : (
                    <span className="text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30 font-medium">
                      {conteoItemsPorSubcategoria[subcategoriaActivaId] || 0}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. BUSCADOR + SELECTOR DE RIN CONTRAÍBLE + MULTIPLICADORES (x1, x2, x4)
          ===================================================================== */}
      <div className="space-y-2 rounded-2xl bg-zinc-50/80 dark:bg-black/20 p-2.5 sm:p-3 border border-zinc-200/80 dark:border-white/10 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Buscador */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar llanta, servicio o repuesto..."
              className="w-full h-9 sm:h-10 pl-8 pr-8 rounded-xl bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selector contraíble de medida de Rin */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hidden lg:inline-block">
              Rin:
            </span>
            {mostrarRines ? (
              <div className="flex items-center gap-1 flex-wrap">
                {RINES_TECNICENTRO.map((r) => {
                  const sel = rinActivo === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setRinActivo(r.id);
                        setMostrarRines(false);
                      }}
                      className={`h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
                        sel
                          ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                          : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMostrarRines(true)}
                aria-label="Desplegar medida de rin"
                className="h-9 sm:h-10 px-3.5 rounded-xl border bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap"
                title="Filtrar por medida de rin"
              >
                <span className="text-sm leading-none shrink-0">🛞</span>
                <span>{rinActivo}</span>
                <span className="text-[10px] opacity-75">▾</span>
              </button>
            )}

            {/* Multiplicadores rápidos: x1, x2, x4 */}
            <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-white/10 p-1 rounded-xl">
              {([1, 2, 4] as const).map((mult) => {
                const activo = multiplicadorActivo === mult;
                return (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setMultiplicadorActivo(mult)}
                    className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activo
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10"
                    }`}
                    title={`Agregar ${mult} unidad(es) por toque`}
                  >
                    x{mult}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. CUADRÍCULA DE PRODUCTOS Y SERVICIOS DEL POS
          ===================================================================== */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-2xs">
        {itemsFiltrados.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 space-y-2">
            <span className="text-3xl block">🔍</span>
            <p className="text-sm">No se encontraron productos ni servicios en Tecnicentro</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-3.5 gap-x-3.5">
            {itemsFiltrados.map((item) => {
              const cantEnOrden = obtenerCantidadEnPedido(item);
              const estaEnPedido = cantEnOrden > 0;

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={() => {
                    void handleAjustarCantidadItem(item, multiplicadorActivo);
                  }}
                  className={`group relative flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all select-none cursor-pointer active:scale-[0.98] min-h-[160px] sm:min-h-[175px] shadow-2xs ${
                    estaEnPedido
                      ? "bg-blue-50/60 dark:bg-blue-500/[0.08] border-blue-300 dark:border-blue-400/60 ring-2 ring-blue-300/60 dark:ring-blue-400/30 shadow-xs"
                      : "bg-white hover:bg-zinc-50/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-400/30"
                  }`}
                >
                  {/* Botón restar "−" arriba a la izquierda si está en el pedido */}
                  {estaEnPedido && (
                    <button
                      type="button"
                      aria-label="Restar 1"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAjustarCantidadItem(item, -1);
                      }}
                      className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-200 text-sm font-bold flex items-center justify-center shadow-xs active:scale-90 transition-all z-10 cursor-pointer"
                      title="Restar 1"
                    >
                      −
                    </button>
                  )}

                  {/* Contador verde arriba a la derecha si está en el pedido */}
                  {estaEnPedido && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-emerald-500 text-white shadow-xs z-10">
                      +{cantEnOrden}
                    </span>
                  )}

                  {/* Imagen (Cloudflare R2) o Ícono central */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-100/80 dark:bg-black/30 border border-zinc-200/60 dark:border-white/5 shrink-0 mt-1">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.keyword}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl sm:text-4xl select-none leading-none">
                        {item.itemIcon}
                      </span>
                    )}
                  </div>

                  {/* Una sola palabra clave o medida corta en letra grande y negrita */}
                  <div className="w-full text-center px-1 mt-2">
                    <span className="text-sm sm:text-base font-black tracking-wide text-zinc-900 dark:text-white uppercase truncate block">
                      {item.keyword}
                    </span>
                  </div>

                  {/* Precio debajo */}
                  <div className="w-full text-center mt-1">
                    <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          4. BARRA INFERIOR FIJA ("X productos | Total: $XX.XX" y "Siguiente →")
          ===================================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border-t sm:border border-zinc-200 dark:border-white/15 shadow-xl sm:rounded-2xl sm:bottom-3 sm:inset-x-4 sm:max-w-6xl sm:mx-auto pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-400/40 flex items-center justify-center text-base sm:text-lg shrink-0">
            🔧
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white block truncate">
              {totalUnidadesTecnicentro} {totalUnidadesTecnicentro === 1 ? "producto" : "productos"}
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 block tabular-nums mt-0.5">
              Total: ${totalMontoTecnicentro.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onIrASiguiente || onIrAAvisoYFirma}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>Siguiente</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Modales administrativos opcionales (preservados) */}
      {detailModal && config && (
        <ModalDetalleTecnicentro
          item={detailModal.item}
          kind={detailModal.kind}
          config={config}
          selectedVehicleTypeId="vt_sedan"
          isSelected={false}
          onToggleSelect={() => {}}
          onEdit={() => {}}
          onClose={() => setDetailModal(null)}
        />
      )}

      {serviceFormModal.open && config && (
        <ModalServicioTecnicentroForm
          initialService={serviceFormModal.service}
          config={config}
          onSave={handleSaveServiceAdmin}
          onDelete={handleDeleteServiceAdmin}
          onClose={() => setServiceFormModal({ open: false, service: null })}
          mostrarToast={mostrarToast}
        />
      )}

      {tireFormModal.open && config && (
        <ModalNeumaticoProductoForm
          initialTire={tireFormModal.tire}
          config={config}
          onSave={handleSaveTireAdmin}
          onDelete={handleDeleteTireAdmin}
          onClose={() => setTireFormModal({ open: false, tire: null })}
          mostrarToast={mostrarToast}
        />
      )}

      {configModalOpen && config && (
        <ModalConfiguracionTecnicentro
          config={config}
          onSaveConfig={handleSaveConfigAdmin}
          onClose={() => setConfigModalOpen(false)}
          mostrarToast={mostrarToast}
        />
      )}
    </div>
  );
}
