"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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
  triggerAbrirConfig?: number;
  onIrAAvisoYFirma: () => void;
  onIrAAnterior?: () => void;
  navegacionActiva?: boolean;
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


// ============================================================================
// DEFINICIONES DE RUEDAS Y COMBOS RÁPIDOS DE TECNICENTRO (1 sola palabra)
// ============================================================================
export const RUEDAS_SEMAFORO_ITEMS = [
  { id: "DI", label: "DI", desc: "Delantera Izq" },
  { id: "DD", label: "DD", desc: "Delantera Der" },
  { id: "TI", label: "TI", desc: "Trasera Izq" },
  { id: "TD", label: "TD", desc: "Trasera Der" },
  { id: "Repuesto", label: "Repuesto", desc: "Rueda Repuesto" },
  { id: "Frenos", label: "Frenos", desc: "Frenos" },
  { id: "Suspensión", label: "Suspensión", desc: "Suspensión" },
] as const;

export type EstadoSemaforoRueda = "ok" | "rotar" | "cambiar";

export const PAQUETES_COMBO_ITEMS = [
  {
    id: "ABC" as const,
    label: "ABC",
    icon: "🎯",
    desc: "Alineación + Balanceo x4 + Rotación",
  },
  {
    id: "Nitrógeno" as const,
    label: "Nitrógeno",
    icon: "💨",
    desc: "Inflado Nitrógeno x4 + Válvulas",
  },
  {
    id: "Enllantaje" as const,
    label: "Enllantaje",
    icon: "🛞",
    desc: "Montaje x4 + Balanceo x4 + Alineación",
  },
  {
    id: "Frenos" as const,
    label: "Frenos",
    icon: "🛑",
    desc: "Pastillas + Rectificado + Líquido",
  },
] as const;

export default function ModuloTecnicentroCatalogo({
  empleadoLogueado,
  ordenActiva,
  itemsOrden,
  mostrarToast,
  onActualizarItemsOrden,
  triggerAbrirConfig,
  onIrAAvisoYFirma,
  onIrAAnterior,
  navegacionActiva = false,
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

  // Estados para fila rápida superior: Repetir, Ruedas (Semáforo) y Combo
  const [mostrarRuedas, setMostrarRuedas] = useState<boolean>(false);
  const [mostrarCombos, setMostrarCombos] = useState<boolean>(false);
  const [cargandoRepetir, setCargandoRepetir] = useState<boolean>(false);
  const [semaforoRuedas, setSemaforoRuedas] = useState<Record<string, EstadoSemaforoRueda>>({
    DI: "ok",
    DD: "ok",
    TI: "ok",
    TD: "ok",
    Repuesto: "ok",
    Frenos: "ok",
    Suspensión: "ok",
  });

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
    return itemsTecnicentroEnOrden.reduce((acc, it) => acc + (Number(it.total) || (Number(it.price) * (Number(it.qty) || 1)) || 0), 0);
  }, [itemsTecnicentroEnOrden]);

  const tiempoEstimadoTecnicentro = useMemo(() => {
    if (totalUnidadesTecnicentro === 0) return 0;
    return Math.max(30, totalUnidadesTecnicentro * 20);
  }, [totalUnidadesTecnicentro]);

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

  // 1. Manejo del semáforo de 7 puntos (Verde -> Amarillo -> Rojo -> Verde)
  const handleToggleSemaforo = (id: string) => {
    setSemaforoRuedas((prev) => {
      const actual = prev[id] || "ok";
      const siguiente: EstadoSemaforoRueda =
        actual === "ok" ? "rotar" : actual === "rotar" ? "cambiar" : "ok";

      // Si el técnico marca en Rojo ("cambiar")
      if (siguiente === "cambiar") {
        if (id === "DI" || id === "DD" || id === "TI" || id === "TD" || id === "Repuesto") {
          // Filtrar automáticamente categoría "Llantas" o "Alineación"
          setCategoriaActivaId((curr) => (curr === "LLANTAS" ? "ALINEACION" : "LLANTAS"));
          setSubcategoriaActivaId("TODOS");
          setMostrarCategorias(false);
          setMostrarSubcategorias(true);
          mostrarToast(`Alerta de desgaste en ${id}: filtrando Llantas y Alineación`, "ok");
        } else if (id === "Frenos") {
          setCategoriaActivaId("FRENOS");
          setSubcategoriaActivaId("TODOS");
          setMostrarCategorias(false);
          setMostrarSubcategorias(true);
          mostrarToast("Alerta en Frenos: mostrando catálogo de Frenos", "ok");
        } else if (id === "Suspensión") {
          setCategoriaActivaId("SUSPENSION");
          setSubcategoriaActivaId("TODOS");
          setMostrarCategorias(false);
          setMostrarSubcategorias(true);
          mostrarToast("Alerta en Suspensión: mostrando catálogo de Suspensión", "ok");
        }
      }

      return { ...prev, [id]: siguiente };
    });
  };

  // 2. Aplicar paquete Combo automático (agrega al carrito y contrae el selector)
  const handleAplicarCombo = async (tipo: "ABC" | "Nitrógeno" | "Enllantaje" | "Frenos") => {
    try {
      type ComboItemDef = {
        idFallback: string;
        name: string;
        categoryMapped: "LLANTAS" | "ALINEACION" | "ENLLANTAJE" | "FRENOS" | "SUSPENSION" | "BATERIAS";
        subcategoryMapped: string;
        price: number;
        qty: number;
        isTire?: boolean;
        durationMinutes?: number;
      };

      let itemsComboDef: ComboItemDef[] = [];

      if (tipo === "ABC") {
        itemsComboDef = [
          {
            idFallback: "tc_ali_completa",
            name: "Alineación Completa 3D",
            categoryMapped: "ALINEACION",
            subcategoryMapped: "COMPLETA",
            price: 25.0,
            qty: 1,
            durationMinutes: 40,
          },
          {
            idFallback: "tc_bal_dinamico",
            name: "Balanceo Dinámico",
            categoryMapped: "ALINEACION",
            subcategoryMapped: "BALANCEO",
            price: 5.0,
            qty: 4,
            durationMinutes: 30,
          },
          {
            idFallback: "tc_rot_ruedas",
            name: "Rotación de 4 Ruedas",
            categoryMapped: "ALINEACION",
            subcategoryMapped: "ROTACION",
            price: 8.0,
            qty: 1,
            durationMinutes: 20,
          },
        ];
      } else if (tipo === "Nitrógeno") {
        itemsComboDef = [
          {
            idFallback: "tc_enl_nitrogeno",
            name: "Inflado con Nitrógeno",
            categoryMapped: "ENLLANTAJE",
            subcategoryMapped: "NITROGENO",
            price: 4.0,
            qty: 4,
            durationMinutes: 20,
          },
          {
            idFallback: "tc_enl_valvula",
            name: "Válvula de Aire Cromada",
            categoryMapped: "ENLLANTAJE",
            subcategoryMapped: "VALVULA",
            price: 2.5,
            qty: 4,
            durationMinutes: 15,
          },
        ];
      } else if (tipo === "Enllantaje") {
        itemsComboDef = [
          {
            idFallback: "tc_enl_montaje",
            name: "Montaje y Desmontaje",
            categoryMapped: "ENLLANTAJE",
            subcategoryMapped: "MONTAJE",
            price: 4.0,
            qty: 4,
            durationMinutes: 30,
          },
          {
            idFallback: "tc_bal_dinamico",
            name: "Balanceo Dinámico",
            categoryMapped: "ALINEACION",
            subcategoryMapped: "BALANCEO",
            price: 5.0,
            qty: 4,
            durationMinutes: 30,
          },
          {
            idFallback: "tc_ali_delantera",
            name: "Alineación Delantera",
            categoryMapped: "ALINEACION",
            subcategoryMapped: "DELANTERA",
            price: 15.0,
            qty: 1,
            durationMinutes: 30,
          },
        ];
      } else if (tipo === "Frenos") {
        itemsComboDef = [
          {
            idFallback: "tc_fre_pastillas",
            name: "Cambio Pastillas Frenos",
            categoryMapped: "FRENOS",
            subcategoryMapped: "PASTILLAS",
            price: 18.0,
            qty: 1,
            durationMinutes: 45,
          },
          {
            idFallback: "tc_fre_rectificado",
            name: "Rectificado de Discos",
            categoryMapped: "FRENOS",
            subcategoryMapped: "RECTIFICADO",
            price: 16.0,
            qty: 1,
            durationMinutes: 40,
          },
          {
            idFallback: "tc_fre_liquido",
            name: "Líquido de Frenos DOT4",
            categoryMapped: "FRENOS",
            subcategoryMapped: "LIQUIDO",
            price: 15.0,
            qty: 1,
            durationMinutes: 25,
          },
        ];
      }

      let listaActualizada = [...(itemsOrden || [])];
      const timestamp = Date.now();

      for (let i = 0; i < itemsComboDef.length; i++) {
        const itemDef = itemsComboDef[i];
        const enCatalogo = todosLosItemsPOS.find(
          (it) =>
            it.id === itemDef.idFallback ||
            (it.categoryMapped === itemDef.categoryMapped && it.subcategoryMapped === itemDef.subcategoryMapped) ||
            it.name.toLowerCase().includes(itemDef.name.toLowerCase().slice(0, 10))
        );

        const idUsar = enCatalogo?.id || itemDef.idFallback;
        const nombreUsar = enCatalogo?.name || itemDef.name;
        const precioUsar = Number(enCatalogo?.price ?? itemDef.price);
        const codeUsar = enCatalogo?.code || `TC-${idUsar.toUpperCase()}`;
        const isTire = Boolean(itemDef.isTire || enCatalogo?.kind === "TIRE");

        const idx = listaActualizada.findIndex(
          (it) =>
            it.id === idUsar ||
            it.id === `tc_${idUsar}` ||
            it.id?.startsWith?.(`tc_${idUsar}_`) ||
            it.serviceId === idUsar ||
            it.productId === idUsar ||
            (it.code && codeUsar && it.code === codeUsar)
        );

        if (idx >= 0) {
          const qtyNueva = (Number(listaActualizada[idx].qty) || 1) + itemDef.qty;
          listaActualizada[idx] = {
            ...listaActualizada[idx],
            qty: qtyNueva,
            price: precioUsar,
            total: Number((precioUsar * qtyNueva).toFixed(2)),
          };
        } else {
          const nuevoItem = {
            id: isTire ? `neu_${idUsar}_${timestamp}_${i}` : `tc_${idUsar}_${timestamp}_${i}`,
            key: `key_${idUsar}_${timestamp}_${i}`,
            serviceId: isTire ? undefined : idUsar,
            productId: isTire ? idUsar : undefined,
            type: isTire ? ("PART" as const) : ("SERVICE" as const),
            category: "Tecnicentro",
            subCategory: itemDef.categoryMapped,
            code: codeUsar,
            name: nombreUsar,
            brand: enCatalogo?.brand || "Tecnicentro",
            presentation: `${itemDef.durationMinutes || 30} min`,
            unitOfMeasure: isTire ? "Unidad" : "Servicio",
            price: precioUsar,
            total: Number((precioUsar * itemDef.qty).toFixed(2)),
            qty: itemDef.qty,
            estimatedMinutes: itemDef.durationMinutes || 30,
            vehicleType: "General",
            status: "Listo" as const,
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          };
          listaActualizada.push(nuevoItem);
        }
      }

      await onActualizarItemsOrden(listaActualizada);
      setMostrarCombos(false);
      mostrarToast(`Paquete ${tipo} agregado correctamente`, "ok");
    } catch {
      mostrarToast(`Error al aplicar combo ${tipo}`, "err");
    }
  };

  // 3. Cargar en el carrito el último servicio o medida de llantas de este vehículo
  const handleRepetirUltimoServicio = async () => {
    if (cargandoRepetir) return;
    setCargandoRepetir(true);
    try {
      const plate = ordenActiva?.plate || "";
      let itemsParaRepetir: any[] = [];

      if (plate) {
        try {
          const res = await fetch(`/api/taller/operacion?plate=${encodeURIComponent(plate)}&historial=true`, {
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const ordenesPrevias = Array.isArray(data.orders) ? data.orders : [];
            for (const ord of ordenesPrevias) {
              if (ord.id !== ordenActiva?.id && Array.isArray(ord.items) && ord.items.length > 0) {
                const itemsTec = ord.items.filter((it: any) => {
                  const txt = `${it.name || ""} ${it.category || ""} ${it.subCategory || ""}`.toLowerCase();
                  return (
                    txt.includes("llanta") ||
                    txt.includes("alineac") ||
                    txt.includes("balanceo") ||
                    txt.includes("rotac") ||
                    txt.includes("freno") ||
                    txt.includes("suspens") ||
                    txt.includes("tecnicentro") ||
                    it.category === "Tecnicentro"
                  );
                });
                if (itemsTec.length > 0) {
                  itemsParaRepetir = itemsTec;
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.warn("No se pudo consultar historial por API:", e);
        }
      }

      if (itemsParaRepetir.length > 0) {
        const timestamp = Date.now();
        const nuevosItems = itemsParaRepetir.map((it, idx) => ({
          ...it,
          id: `tc_rep_${timestamp}_${idx}`,
          key: `key_rep_${timestamp}_${idx}`,
          status: "Listo",
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        }));

        await onActualizarItemsOrden([...(itemsOrden || []), ...nuevosItems]);
        mostrarToast(`Último servicio repetido cargado (${nuevosItems.length} ítems)`, "ok");
        return;
      }

      // Si no hay historial en la API, comprobar si hay medida de llantas en datos del vehículo
      const textoVehiculo = `${ordenActiva?.vehicle || ""} ${ordenActiva?.notes || ""}`;
      const matchMedida = textoVehiculo.match(/(\d{3}\/\d{2}\s*R\d{2})/i);
      if (matchMedida) {
        const medida = matchMedida[1].toUpperCase();
        const llantaCoincidente =
          todosLosItemsPOS.find((it) => it.kind === "TIRE" && (it.name.includes(medida) || it.tireSize?.includes(medida))) ||
          todosLosItemsPOS.find((it) => it.kind === "TIRE") ||
          ITEMS_BASE_TECNICENTRO[0];

        await handleAjustarCantidadItem(llantaCoincidente as any, 4);
        mostrarToast(`Medida registrada (${medida}): 4 llantas cargadas`, "ok");
        return;
      }

      // Cargar paquete estándar de mantenimiento (Alineación Completa + Balanceo x4)
      const aliItem = todosLosItemsPOS.find((it) => it.id === "tc_ali_completa") || ITEMS_BASE_TECNICENTRO[6];
      const balItem = todosLosItemsPOS.find((it) => it.id === "tc_bal_dinamico") || ITEMS_BASE_TECNICENTRO[8];

      await handleAjustarCantidadItem(aliItem as any, 1);
      await handleAjustarCantidadItem(balItem as any, 4);
      mostrarToast("Cargado servicio preventivo recomendado (Alineación + Balanceo x4)", "ok");
    } catch {
      mostrarToast("Error al cargar servicio anterior", "err");
    } finally {
      setCargandoRepetir(false);
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

  // ── Bento: estados dropdown de las 3 tarjetas ───────────────────────────────────
  const [menuCatAbierto, setMenuCatAbierto] = React.useState(false);
  const [menuSubcatAbierto, setMenuSubcatAbierto] = React.useState(false);
  const [menuRinAbierto, setMenuRinAbierto] = React.useState(false);
  const [busquedaTec, setBusquedaTec] = React.useState('');

  // Semaforo Bento de tren delantero (6 circulos)
  type EstadoSemaforoBento = 'ok' | 'revisar' | 'alerta';
  const SEMAFORO_TREN_DEF = React.useMemo(() => [
    { id: 'Llantas',      label: 'Llantas',     subLabel: 'Desgaste',    estado0: 'alerta'  as EstadoSemaforoBento, catId: 'LLANTAS',    subcatId: 'PISTERA'       },
    { id: 'Frenos',       label: 'Frenos',       subLabel: 'Pastillas',   estado0: 'revisar' as EstadoSemaforoBento, catId: 'FRENOS',     subcatId: 'PASTILLAS'     },
    { id: 'Suspension',   label: 'Suspensión',  subLabel: 'Revisar',     estado0: 'ok'      as EstadoSemaforoBento, catId: 'SUSPENSION', subcatId: 'AMORTIGUADOR'  },
    { id: 'Amortiguador', label: 'Amortiguador', subLabel: 'OK',          estado0: 'ok'      as EstadoSemaforoBento, catId: 'SUSPENSION', subcatId: 'AMORTIGUADOR'  },
    { id: 'Bateria',      label: 'Batería',      subLabel: 'Normal',      estado0: 'ok'      as EstadoSemaforoBento, catId: 'BATERIAS',   subcatId: 'LIVIANO'       },
    { id: 'Rotacion',     label: 'Rotación',     subLabel: 'Recomendado', estado0: 'ok'      as EstadoSemaforoBento, catId: 'ALINEACION', subcatId: 'ROTACION'      },
  ], []);

  const [semaforoBentoEstados, setSemaforoBentoEstados] = React.useState<Record<string, EstadoSemaforoBento>>(():Record<string,EstadoSemaforoBento> => ({
    Llantas: 'alerta', Frenos: 'revisar', Suspension: 'ok', Amortiguador: 'ok', Bateria: 'ok', Rotacion: 'ok'
  }));

  const handleToggleSemaforoBento = React.useCallback((defItem: { id: string; catId: string; subcatId: string }) => {
    const ciclo: EstadoSemaforoBento[] = ['ok', 'revisar', 'alerta'];
    setSemaforoBentoEstados(prev => {
      const actual = prev[defItem.id] || 'ok';
      const idx = ciclo.indexOf(actual);
      const siguiente = ciclo[(idx + 1) % ciclo.length];
      return { ...prev, [defItem.id]: siguiente };
    });
  }, []);

  // Pre-carga automatica en primer render
  const autoCargaTecHecha = React.useRef(false);
  React.useEffect(() => {
    if (autoCargaTecHecha.current || !mounted || (loading && !config)) return;
    autoCargaTecHecha.current = true;
    const aliItem = todosLosItemsPOS.find(it => it.id === 'tc_ali_completa') ||
      todosLosItemsPOS.find(it => it.categoryMapped === 'ALINEACION' && it.subcategoryMapped === 'COMPLETA');
    const balItem = todosLosItemsPOS.find(it => it.id === 'tc_bal_dinamico') ||
      todosLosItemsPOS.find(it => it.categoryMapped === 'ALINEACION' && it.subcategoryMapped === 'BALANCEO');
    if (aliItem && obtenerCantidadEnPedido(aliItem) === 0) { void handleAjustarCantidadItem(aliItem as any, 1); }
    if (balItem && obtenerCantidadEnPedido(balItem) === 0) { void handleAjustarCantidadItem(balItem as any, 4); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, loading, config]);

  const labelCatBento = React.useMemo(() => {
    const cat = TECNICENTRO_CATEGORIES.find(c => c.id === categoriaActivaId);
    return cat ? cat.icon + ' ' + cat.label : '✨ Todo';
  }, [categoriaActivaId]);

  const labelSubcatBento = React.useMemo((): string | null => {
    if (categoriaActivaId === 'TODO') return null;
    const cat = TECNICENTRO_CATEGORIES.find(c => c.id === categoriaActivaId);
    if (!cat) return null;
    const sub = cat.subcategories.find(s => s.id === subcategoriaActivaId);
    return sub ? (sub.icon || '') + ' ' + sub.label : '✨ Todos';
  }, [categoriaActivaId, subcategoriaActivaId]);

  const productosBentoFiltrados = React.useMemo(() => {
    const q = busquedaTec.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return todosLosItemsPOS.filter(item => {
      if (categoriaActivaId !== 'TODO' && item.categoryMapped !== categoriaActivaId) return false;
      if (subcategoriaActivaId !== 'TODOS' && item.subcategoryMapped !== subcategoriaActivaId) return false;
      if (rinActivo !== 'Aro' && item.categoryMapped === 'LLANTAS') {
        const itemRim = (item.rimDiameter || '').toUpperCase();
        const text = (item.name + ' ' + item.keyword).toUpperCase();
        if (rinActivo === 'R18+') { if (!/R(18|19|20|21|22|23|24)/i.test(itemRim || text)) return false; }
        else { if (!itemRim.includes(rinActivo) && !text.includes(rinActivo)) return false; }
      }
      if (q) {
        const haystack = (item.name + ' ' + item.keyword + ' ' + (item.tireSize || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [todosLosItemsPOS, categoriaActivaId, subcategoriaActivaId, rinActivo, busquedaTec]);

  const sugerenciaSemaforoBento = React.useMemo(() => {
    const alertas = SEMAFORO_TREN_DEF.filter(d => semaforoBentoEstados[d.id] === 'alerta' || semaforoBentoEstados[d.id] === 'revisar');
    if (alertas.length === 0) return null;
    const primera = alertas[0];
    const match = todosLosItemsPOS.find(it => it.categoryMapped === primera.catId && it.subcategoryMapped === primera.subcatId);
    if (!match) return null;
    return { label: match.keyword, price: match.price, item: match };
  }, [SEMAFORO_TREN_DEF, semaforoBentoEstados, todosLosItemsPOS]);

  const vehiculoTipo = React.useMemo(() => {
    const v = (String(ordenActiva?.vehicle || ordenActiva?.vehicleType || '')).toLowerCase();
    if (v.includes('suv') || v.includes('4x4') || v.includes('pickup') || v.includes('camioneta')) return 'SUV';
    if (v.includes('camion') || v.includes('bus') || v.includes('furgon')) return 'Camión';
    return 'Sedan';
  }, [ordenActiva?.vehicle, ordenActiva?.vehicleType]);

  const rinLabel = React.useMemo(() => {
    if (rinActivo === 'Aro') return vehiculoTipo === 'SUV' ? '17"' : '15"';
    return rinActivo.replace('R', '') + '"';
  }, [rinActivo, vehiculoTipo]);

  const PRECARGA_BENTO_ITEMS = React.useMemo(() => {
    const ali = todosLosItemsPOS.find(it => it.id === 'tc_ali_completa') ||
      todosLosItemsPOS.find(it => it.categoryMapped === 'ALINEACION' && it.subcategoryMapped === 'COMPLETA');
    const bal = todosLosItemsPOS.find(it => it.id === 'tc_bal_dinamico') ||
      todosLosItemsPOS.find(it => it.categoryMapped === 'ALINEACION' && it.subcategoryMapped === 'BALANCEO');
    type PItem = typeof todosLosItemsPOS[number] & { labelCorto: string };
    const items: PItem[] = [];
    if (ali) items.push({ ...ali, labelCorto: 'Alineación 3D' });
    if (bal) items.push({ ...bal, labelCorto: 'Balanceo x4' });
    if (bal) items.push({ ...bal, labelCorto: 'Balanceo x4' });
    if (ali) items.push({ ...ali, labelCorto: 'Alineación 3D' });
    if (bal) items.push({ ...bal, labelCorto: 'Balanceo x4' });
    if (bal) items.push({ ...bal, labelCorto: 'Balanceo x4' });
    return items;
  }, [todosLosItemsPOS]);

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
    <div className="w-full">
      <div className="w-full animate-fade-in pb-28">
        {/* BENTO GRID TECNICENTRO: 3 tarjetas en PC, vertical en movil */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

          {/* ===== CARD IZQUIERDA: Alineacion y Llantas ===== */}
          <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden p-3.5 sm:p-4">
            <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mb-2.5">
              Alineación y Llantas ({vehiculoTipo})
            </p>
            <div className="rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/5 p-3.5 text-center">
              <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center justify-center gap-2">
                <span>{vehiculoTipo} Detectado</span> 🚗
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                • Rin {rinLabel}
              </p>
            </div>
            <p className="mt-3.5 mb-2 text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              Recepción Rápida
            </p>
            <div className="p-3 grid grid-cols-3 gap-2">
              {PRECARGA_BENTO_ITEMS.map((pItem, pIdx) => {
                const qty = obtenerCantidadEnPedido(pItem);
                const enPedido = qty > 0;
                return (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => void handleAjustarCantidadItem(pItem as any, enPedido ? -1 : 1)}
                    className={[
                      'flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 px-1 transition-all active:scale-95 cursor-pointer text-center',
                      enPedido
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
                        : 'bg-zinc-50 dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 hover:border-emerald-300',
                    ].join(' ')}
                  >
                    <div className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0',
                      enPedido
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-white/20 text-zinc-400',
                    ].join(' ')}
                    >
                      {enPedido ? '✓' : '○'}
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 leading-tight">{pItem.labelCorto}</span>
                  </button>
                );
              })}
            </div>
            <div className="mx-3 mb-3 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
              {(() => {
                const aliItem = todosLosItemsPOS.find(it => it.id === 'tc_ali_completa') ||
                  todosLosItemsPOS.find(it => it.categoryMapped === 'ALINEACION' && it.subcategoryMapped === 'COMPLETA');
                return (
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                    Sugiere: + {aliItem ? aliItem.keyword : 'Alineación 3D'} ({aliItem ? '$' + aliItem.price.toFixed(2) : '$15.00'})
                  </p>
                );
              })()}
            </div>
          </div>

          {/* ===== CARD CENTRAL: Semaforo de Tren Delantero ===== */}
          <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-white/[0.08]">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Semáforo de Tren Delantero</p>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2.5">
              {SEMAFORO_TREN_DEF.map((defItem) => {
                const estado = semaforoBentoEstados[defItem.id] || 'ok';
                const esAlerta = estado === 'alerta';
                const esRevisar = estado === 'revisar';
                const wrapCls = esAlerta
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-400/60'
                  : esRevisar
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-400/60'
                  : 'bg-zinc-50 dark:bg-white/[0.03] border-zinc-200 dark:border-white/10';
                const ringCls = esAlerta
                  ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-400'
                  : esRevisar
                  ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-400'
                  : (defItem.id === 'Amortiguador' || defItem.id === 'Rotacion')
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-400'
                  : 'bg-zinc-100 dark:bg-white/10 border-zinc-300 dark:border-white/20';
                const textCls = esAlerta
                  ? 'text-rose-600 dark:text-rose-400'
                  : esRevisar
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400';
                const labelSub = (esAlerta || esRevisar)
                  ? defItem.subLabel
                  : (defItem.id === 'Amortiguador' ? 'OK' : defItem.id === 'Rotacion' ? 'Recomendado' : 'Normal');
                return (
                  <button
                    key={defItem.id}
                    type="button"
                    onClick={() => handleToggleSemaforoBento(defItem)}
                    className={['relative flex flex-col items-center justify-center gap-1 rounded-xl border py-3 px-1 transition-all active:scale-95 cursor-pointer', wrapCls].join(' ')}
                  >
                    {(esAlerta || esRevisar) && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold z-10">⚠</span>
                    )}
                    <div className={['w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg', ringCls].join(' ')}>
                      {defItem.id === 'Llantas' && <span>🛞</span>}
                      {defItem.id === 'Frenos' && <span>🛑</span>}
                      {defItem.id === 'Suspension' && <span>🔩</span>}
                      {defItem.id === 'Amortiguador' && <span className="text-emerald-600 font-black">✓</span>}
                      {defItem.id === 'Bateria' && <span>🔋</span>}
                      {defItem.id === 'Rotacion' && <span className="text-emerald-600 font-black">↻</span>}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">{defItem.label}</span>
                    <span className={['text-[10px] font-semibold', textCls].join(' ')}>{labelSub}</span>
                  </button>
                );
              })}
            </div>
            {sugerenciaSemaforoBento && (
              <div
                className="mx-3 mb-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 cursor-pointer active:scale-[0.98] transition-all"
                onClick={() => sugerenciaSemaforoBento.item && void handleAjustarCantidadItem(sugerenciaSemaforoBento.item as any, 1)}
              >
                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  Sugiere: + {sugerenciaSemaforoBento.label} (${sugerenciaSemaforoBento.price.toFixed(2)})
                </p>
              </div>
            )}
          </div>

          {/* ===== CARD DERECHA: Pills + Busqueda + Catalogo ===== */}
          <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden">
            {/* Pills de filtro */}
            <div className="px-3 pt-3 pb-2 border-b border-zinc-100 dark:border-white/[0.08] flex items-center gap-1.5 flex-wrap">
              {/* Pill Categoria */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setMenuCatAbierto(p => !p); setMenuSubcatAbierto(false); setMenuRinAbierto(false); }}
                  className="h-8 px-3 rounded-full border border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/[0.05] text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1 cursor-pointer hover:border-blue-400 transition-all"
                >
                  {labelCatBento} <span className="text-[10px] opacity-60">▾</span>
                </button>
                {menuCatAbierto && (
                  <div className="absolute left-0 top-full mt-1 z-50 min-w-[145px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-xl shadow-xl overflow-hidden">
                    {TECNICENTRO_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setCategoriaActivaId(cat.id); setSubcategoriaActivaId('TODOS'); setMenuCatAbierto(false); }}
                        className={['w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all', cat.id === categoriaActivaId ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-zinc-700 dark:text-zinc-300'].join(' ')}
                      >
                        <span>{cat.icon}</span><span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pill Subcategoria */}
              {categoriaActivaId !== 'TODO' && (() => {
                const catDef = TECNICENTRO_CATEGORIES.find(c => c.id === categoriaActivaId);
                if (!catDef || catDef.subcategories.length === 0) return null;
                return (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setMenuSubcatAbierto(p => !p); setMenuCatAbierto(false); setMenuRinAbierto(false); }}
                      className="h-8 px-3 rounded-full border border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/[0.05] text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1 cursor-pointer hover:border-blue-400 transition-all"
                    >
                      {labelSubcatBento} <span className="text-[10px] opacity-60">▾</span>
                    </button>
                    {menuSubcatAbierto && (
                      <div className="absolute left-0 top-full mt-1 z-50 min-w-[145px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-xl shadow-xl overflow-hidden">
                        {[{ id: 'TODOS', label: 'Todos', icon: '✨' }, ...catDef.subcategories].map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => { setSubcategoriaActivaId(sub.id); setMenuSubcatAbierto(false); }}
                            className={['w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all', sub.id === subcategoriaActivaId ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-zinc-700 dark:text-zinc-300'].join(' ')}
                          >
                            <span>{(sub as any).icon || '•'}</span><span>{sub.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Pill Rin (solo LLANTAS) */}
              {categoriaActivaId === 'LLANTAS' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setMenuRinAbierto(p => !p); setMenuCatAbierto(false); setMenuSubcatAbierto(false); }}
                    className="h-8 px-3 rounded-full border border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/[0.05] text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1 cursor-pointer hover:border-blue-400 transition-all"
                  >
                    🛞 {rinActivo} <span className="text-[10px] opacity-60">▾</span>
                  </button>
                  {menuRinAbierto && (
                    <div className="absolute left-0 top-full mt-1 z-50 min-w-[100px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/15 rounded-xl shadow-xl overflow-hidden">
                      {RINES_TECNICENTRO.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setRinActivo(r.id); setMenuRinAbierto(false); }}
                          className={['w-full text-left px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-white/10 transition-all', r.id === rinActivo ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-zinc-700 dark:text-zinc-300'].join(' ')}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Busqueda */}
            <div className="px-3 pt-2 pb-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={busquedaTec}
                  onChange={e => setBusquedaTec(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full h-8 pl-8 pr-7 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs text-zinc-900 dark:text-white placeholder-zinc-400"
                />
                {busquedaTec && (
                  <button type="button" onClick={() => setBusquedaTec('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs cursor-pointer">✕</button>
                )}
              </div>
            </div>

            {/* Grid de productos */}
            <div className="px-3 pb-3 max-h-[380px] overflow-y-auto">
              {productosBentoFiltrados.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">Sin resultados</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {productosBentoFiltrados.slice(0, 12).map(item => {
                    const cant = obtenerCantidadEnPedido(item);
                    const enPedido = cant > 0;
                    return (
                      <div
                        key={item.id + item.keyword}
                        onClick={() => void handleAjustarCantidadItem(item as any, 1)}
                        className={[
                          'relative flex flex-col items-center p-2.5 rounded-xl border cursor-pointer active:scale-[0.97] transition-all select-none',
                          enPedido
                            ? 'bg-blue-50 dark:bg-blue-500/[0.08] border-blue-300 dark:border-blue-400/50 ring-1 ring-blue-300/50'
                            : 'bg-zinc-50 dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 hover:border-blue-200',
                        ].join(' ')}
                      >
                        {enPedido && (
                          <>
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white z-10">+{cant}</span>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); void handleAjustarCantidadItem(item as any, -1); }}
                              className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/20 text-zinc-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-rose-50 hover:text-rose-600 z-10"
                            >−</button>
                          </>
                        )}
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-black/20 border border-zinc-200/60 dark:border-white/5 mb-1.5">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.keyword} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-2xl leading-none">{item.itemIcon}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wide text-zinc-900 dark:text-white text-center leading-tight truncate w-full">{item.keyword}</span>
                        <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">${item.price.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {navegacionActiva && (
        <div className="w-full border-t border-zinc-200 dark:border-white/15 py-3 mt-6">
          <div className="flex w-full items-center justify-between gap-3">
            {onIrAAnterior && (
              <button
                type="button"
                onClick={onIrAAnterior}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 cursor-pointer active:scale-95 transition-all shrink-0"
              >
                ← Anterior
              </button>
            )}

            {/* Resumen PC (Imagen 1) */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold shadow-xs">
              <span className="text-base">🛒</span>
              <span>
                {totalUnidadesTecnicentro} {totalUnidadesTecnicentro === 1 ? 'servicio' : 'servicios'} | Total: ${totalMontoTecnicentro.toFixed(2)} • ⏱ {tiempoEstimadoTecnicentro} min
              </span>
            </div>

            {/* Resumen Móvil (Imagen 1 Móvil) */}
            <div className="sm:hidden flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">Total: ${totalMontoTecnicentro.toFixed(2)}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">• ⏱ {tiempoEstimadoTecnicentro} min</span>
            </div>

            <button
              type="button"
              onClick={onIrAAvisoYFirma}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-sm shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ml-auto"
            >
              <span>Siguiente</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

            {/* Modales administrativos opcionales (preservados) */}
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
