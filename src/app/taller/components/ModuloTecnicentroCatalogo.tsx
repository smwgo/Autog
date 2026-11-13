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
  ocultarResumenInferior?: boolean;
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
  item: { name: string; code?: string; subCategory?: string }
): string {
  const text = `${item.name} ${item.code || ""} ${item.subCategory || ""}`.toLowerCase();
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
  ocultarResumenInferior = false,
}: ModuloTecnicentroCatalogoProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<TecnicentroConfigData | null>(null);
  const [services, setServices] = useState<TecnicentroEnrichedService[]>([]);
  const [tires, setTires] = useState<TecnicentroEnrichedTire[]>([]);

  // Categorías y subcategorías contraíbles
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("TODO");
  const dropdownCatRef = React.useRef<HTMLDivElement>(null);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "PART" | "SERVICE">("todos");
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
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownCatRef.current && !dropdownCatRef.current.contains(e.target as Node)) {
        setMenuCatAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      presentation?: string;
      itemIcon: string;
    }> = [];

    const existingKeywords = new Set<string>();

    // 1. Neumáticos / Llantas de la base de datos
    tires.forEach((tire) => {
      if (!tire.active) return;
      const cat = classifyItemCategoryTec(tire);
      const sub = classifyItemSubcategoryTec(cat, tire);
      const kw = extractKeywordTecnicentro(tire.name, tire.tireSize);
      existingKeywords.add(kw);

      list.push({
        id: tire.id,
        kind: cat === "LLANTAS" ? "TIRE" : "PRODUCT",
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
        presentation: tire.presentation,
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
      subcategoryMapped: string;
      keyword: string;
      brand?: string;
      tireSize?: string;
      presentation?: string;
    },
    delta: number
  ) => {
    try {
      const isTire = item.kind === "TIRE";
      const isService = item.kind === "SERVICE";
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
          serviceId: isService ? item.id : undefined,
          productId: isService ? undefined : item.id,
          type: isService ? ("SERVICE" as const) : ("PART" as const),
          category: isService ? "Tecnicentro" : `Tecnicentro - ${item.categoryMapped}`,
          subCategory: isService ? item.categoryMapped : item.subcategoryMapped,
          cwCategoryId: categoriaActivaId,
          code,
          name: item.name,
          brand: item.brand || "Tecnicentro",
          presentation: isTire
            ? item.tireSize || "Unidad"
            : item.kind === "PRODUCT"
              ? item.presentation || "Unidad"
              : `${item.durationMinutes || 30} min`,
          unitOfMeasure: isService ? "Servicio" : "Unidad",
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

  const handleAjustarItemOrden = async (it: any, delta: number) => {
    try {
      const targetId = it.id || it.productId || it.serviceId || it.code;
      const listaActual = [...(itemsOrden || [])];
      const idx = listaActual.findIndex(
        (x) =>
          x === it ||
          (targetId && (x.id === targetId || x.productId === targetId || x.serviceId === targetId)) ||
          (x.code && it.code && x.code === it.code)
      );
      if (idx < 0) return;
      const actualQty = Number(listaActual[idx].qty) || 1;
      const nextQty = actualQty + delta;
      if (nextQty <= 0) {
        const filtrados = listaActual.filter((_, i) => i !== idx);
        await onActualizarItemsOrden(filtrados);
      } else {
        const priceUnit = Number(listaActual[idx].price || 0);
        const actualizados = listaActual.map((item, i) =>
          i === idx
            ? {
                ...item,
                qty: nextQty,
                price: priceUnit,
                total: Number((priceUnit * nextQty).toFixed(2)),
              }
            : item
        );
        await onActualizarItemsOrden(actualizados);
      }
    } catch {
      mostrarToast?.("Error al actualizar ítem en la orden", "err");
    }
  };

  const handleEliminarItemOrden = async (it: any) => {
    try {
      const targetId = it.id || it.productId || it.serviceId || it.code;
      const filtrados = (itemsOrden || []).filter(
        (x: any) =>
          x !== it &&
          (!targetId || (x.id !== targetId && x.productId !== targetId && x.serviceId !== targetId)) &&
          (!x.code || !it.code || x.code !== it.code)
      );
      await onActualizarItemsOrden(filtrados);
      mostrarToast?.(`Eliminado: ${it.name || it.fullName}`, "ok");
    } catch {
      mostrarToast?.("Error al eliminar ítem de la orden", "err");
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
  const [filtrosFlotantesAbiertos, setFiltrosFlotantesAbiertos] = React.useState(false);
  const [busquedaTec, setBusquedaTec] = React.useState('');

  // Semaforo Bento de tren delantero (18 items: 9 en pág 1, 9 en pág 2 + manuales)
  type EstadoSemaforoBento = 'ok' | 'revisar' | 'alerta';
  const [itemsManualesSemaforo, setItemsManualesSemaforo] = React.useState<Array<{ id: string; label: string; detalle: string; catId?: string; subcatId?: string }>>([]);
  const [nuevoManualTexto, setNuevoManualTexto] = React.useState('');
  const [mostrarInputManual, setMostrarInputManual] = React.useState(false);
  const [paginaSemaforo, setPaginaSemaforo] = React.useState<number>(0);
  const touchStartXRef = React.useRef<number | null>(null);

  interface SemaforoItemTecnicentro {
    id: string;
    label: string;
    subLabel: string;
    estado0?: EstadoSemaforoBento;
    catId: string;
    subcatId: string;
    iconSvg: (className: string) => React.ReactNode;
  }

  const SEMAFORO_TREN_DEF: SemaforoItemTecnicentro[] = React.useMemo(() => [
    // PÁGINA 1: 9 puntos prioritarios de inspección en Tecnicentro
    {
      id: 'Llantas',
      label: 'Llantas',
      subLabel: 'Desgaste',
      estado0: 'alerta',
      catId: 'LLANTAS',
      subcatId: 'PISTERA',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="3" x2="12" y2="8" />
          <line x1="12" y1="16" x2="12" y2="21" />
          <line x1="3" y1="12" x2="8" y2="12" />
          <line x1="16" y1="12" x2="21" y2="12" />
        </svg>
      ),
    },
    {
      id: 'Frenos',
      label: 'Frenos',
      subLabel: 'Pastillas',
      estado0: 'revisar',
      catId: 'FRENOS',
      subcatId: 'PASTILLAS',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" strokeDasharray="3 3" />
          <path d="M7 9a7 7 0 0 1 10 0" />
        </svg>
      ),
    },
    {
      id: 'Suspension',
      label: 'Suspensión',
      subLabel: 'Bujes/Brazos',
      estado0: 'ok',
      catId: 'SUSPENSION',
      subcatId: 'AMORTIGUADOR',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M12 2v3m0 14v3M9 5h6M9 19h6" />
          <path d="M9 8h6l-6 3h6l-6 3h6" />
        </svg>
      ),
    },
    {
      id: 'Amortiguador',
      label: 'Amortiguador',
      subLabel: 'Fugas/Rebote',
      estado0: 'ok',
      catId: 'SUSPENSION',
      subcatId: 'AMORTIGUADOR',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M12 6v3m0 9v4" />
          <path d="M9 11h6l-6 2.5h6l-6 2.5h6" />
          <rect x="9" y="18" width="6" height="3" rx="1" />
        </svg>
      ),
    },
    {
      id: 'Alineacion',
      label: 'Alineación',
      subLabel: 'Dirección',
      estado0: 'ok',
      catId: 'ALINEACION',
      subcatId: 'COMPLETA',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      ),
    },
    {
      id: 'Balanceo',
      label: 'Balanceo',
      subLabel: 'Vibración',
      estado0: 'ok',
      catId: 'ALINEACION',
      subcatId: 'BALANCEO',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3a9 9 0 0 1 9 9" />
          <circle cx="12" cy="6" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'Rotacion',
      label: 'Rotación',
      subLabel: 'X / Cruzada',
      estado0: 'ok',
      catId: 'ALINEACION',
      subcatId: 'ROTACION',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
        </svg>
      ),
    },
    {
      id: 'Bateria',
      label: 'Batería',
      subLabel: 'Voltaje/Bornes',
      estado0: 'ok',
      catId: 'BATERIAS',
      subcatId: 'LIVIANO',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <rect x="6" y="6" width="12" height="15" rx="2" />
          <path d="M9 3v3M15 3v3M9 11h6M9 15h3" />
        </svg>
      ),
    },
    {
      id: 'Presion',
      label: 'Presión',
      subLabel: 'Calibrar PSI',
      estado0: 'ok',
      catId: 'LLANTAS',
      subcatId: 'PISTERA',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 5a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4" />
          <line x1="12" y1="12" x2="15" y2="9" />
        </svg>
      ),
    },

    // PÁGINA 2: 9 puntos complementarios de inspección en Tecnicentro
    {
      id: 'Discos',
      label: 'Discos',
      subLabel: 'Rebase/Alabeo',
      estado0: 'ok',
      catId: 'FRENOS',
      subcatId: 'PASTILLAS',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="6" r="1" fill="currentColor" />
          <circle cx="18" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="18" r="1" fill="currentColor" />
          <circle cx="6" cy="12" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'LiquidoFrenos',
      label: 'Líq. Frenos',
      subLabel: 'DOT3 / DOT4',
      estado0: 'ok',
      catId: 'FRENOS',
      subcatId: 'PASTILLAS',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
      ),
    },
    {
      id: 'Terminales',
      label: 'Terminales',
      subLabel: 'Juego dirección',
      estado0: 'ok',
      catId: 'SUSPENSION',
      subcatId: 'AMORTIGUADOR',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="6" cy="12" r="3" />
          <path d="M9 12h11M16 8l4 4-4 4" />
        </svg>
      ),
    },
    {
      id: 'Rotulas',
      label: 'Rótulas',
      subLabel: 'Holgura/Juego',
      estado0: 'ok',
      catId: 'SUSPENSION',
      subcatId: 'AMORTIGUADOR',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="8" r="4" />
          <path d="M12 12v8M8 20h8" />
        </svg>
      ),
    },
    {
      id: 'Bujes',
      label: 'Bujes',
      subLabel: 'Mesas/Gomas',
      estado0: 'ok',
      catId: 'SUSPENSION',
      subcatId: 'AMORTIGUADOR',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'Cremallera',
      label: 'Cremallera',
      subLabel: 'Fuga/Juego',
      estado0: 'ok',
      catId: 'SUSPENSION',
      subcatId: 'AMORTIGUADOR',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <rect x="2" y="10" width="20" height="4" rx="1" />
          <path d="M5 8v2M8 8v2M11 8v2M14 8v2M17 8v2M20 8v2" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      id: 'Guardapolvos',
      label: 'Guardapolvo',
      subLabel: 'Palier/Semieje',
      estado0: 'ok',
      catId: 'SUSPENSION',
      subcatId: 'AMORTIGUADOR',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <ellipse cx="12" cy="6" rx="4" ry="2" />
          <path d="M8 6l-2 4h12l-2-4M6 10l-2 4h16l-2-4M4 14l-1 4h18l-1-4" />
          <ellipse cx="12" cy="18" rx="8" ry="2" />
        </svg>
      ),
    },
    {
      id: 'Rines',
      label: 'Aros/Rines',
      subLabel: 'Golpes/Fisura',
      estado0: 'ok',
      catId: 'LLANTAS',
      subcatId: 'PISTERA',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
        </svg>
      ),
    },
    {
      id: 'Valvulas',
      label: 'Válvulas',
      subLabel: 'TPMS/Pitones',
      estado0: 'ok',
      catId: 'LLANTAS',
      subcatId: 'PISTERA',
      iconSvg: (cls) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M12 2v6M9 8h6v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V8z" />
          <circle cx="12" cy="5" r="2" />
        </svg>
      ),
    },
  ], []);

  const itemsManualesCompletos = React.useMemo(() => {
    return itemsManualesSemaforo.map((m) => ({
      id: m.id,
      label: m.label,
      subLabel: m.detalle || "Manual",
      catId: m.catId || "SUSPENSION",
      subcatId: m.subcatId || "AMORTIGUADOR",
      iconSvg: (cls: string) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
    }));
  }, [itemsManualesSemaforo]);

  const todosLosItemsSemaforo = React.useMemo(() => {
    return [...SEMAFORO_TREN_DEF, ...itemsManualesCompletos];
  }, [SEMAFORO_TREN_DEF, itemsManualesCompletos]);

  const itemsPorPagina = 9;
  const totalPaginas = Math.max(1, Math.ceil(todosLosItemsSemaforo.length / itemsPorPagina));

  const itemsPaginaActual = React.useMemo(() => {
    return todosLosItemsSemaforo.slice(paginaSemaforo * itemsPorPagina, (paginaSemaforo + 1) * itemsPorPagina);
  }, [todosLosItemsSemaforo, paginaSemaforo]);

  const handleAgregarItemManual = () => {
    const nombre = nuevoManualTexto.trim();
    if (!nombre) return;
    const nuevoId = `manual_sem_${Date.now()}`;
    setItemsManualesSemaforo((prev) => [
      ...prev,
      { id: nuevoId, label: nombre, detalle: "Manual", catId: "SUSPENSION", subcatId: "AMORTIGUADOR" },
    ]);
    setNuevoManualTexto("");
    setMostrarInputManual(false);
    const nuevoTotal = todosLosItemsSemaforo.length + 1;
    const nuevaPag = Math.floor((nuevoTotal - 1) / itemsPorPagina);
    setPaginaSemaforo(nuevaPag);
    mostrarToast?.(`✅ Chequeo manual "${nombre}" agregado al semáforo`, "ok");
  };

  const [semaforoBentoEstados, setSemaforoBentoEstados] = React.useState<Record<string, EstadoSemaforoBento>>(():Record<string,EstadoSemaforoBento> => ({
    Llantas: 'alerta', Frenos: 'revisar', Suspension: 'ok', Amortiguador: 'ok', Alineacion: 'ok', Balanceo: 'ok', Rotacion: 'ok', Bateria: 'ok', Presion: 'ok'
  }));

  const handleToggleSemaforoBento = React.useCallback((id: string, catId?: string) => {
    const ciclo: EstadoSemaforoBento[] = ['ok', 'revisar', 'alerta'];
    setSemaforoBentoEstados(prev => {
      const actual = prev[id] || 'ok';
      const idx = ciclo.indexOf(actual);
      const siguiente = ciclo[(idx + 1) % ciclo.length];
      if (siguiente === 'alerta' && catId) {
        setCategoriaActivaId(catId);
        mostrarToast?.(`⚠️ Alerta en ${id}: mostrando catálogo de ${catId}`, 'ok');
      }
      return { ...prev, [id]: siguiente };
    });
  }, [mostrarToast]);

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

  const categoriasProductosTEC = React.useMemo(() => {
    return [
      { id: "LLANTAS", label: "Llantas", icon: "🛞" },
      { id: "BATERIAS", label: "Baterías", icon: "🔋" },
      { id: "AROS", label: "Aros", icon: "⚙️" },
      { id: "FRENOS", label: "Frenos", icon: "🛑" },
      { id: "SUSPENSION", label: "Suspensión", icon: "🔩" },
    ];
  }, []);

  const categoriasServiciosTEC = React.useMemo(() => {
    return [
      { id: "ALINEACION", label: "Alineación", icon: "🎯" },
      { id: "ENLLANTAJE", label: "Enllantaje", icon: "🔧" },
      { id: "BALANCEO", label: "Balanceo", icon: "⚖️" },
      { id: "FRENOS", label: "Frenos", icon: "🛑" },
      { id: "SUSPENSION", label: "Suspensión", icon: "🔩" },
    ];
  }, []);

  const categoriasTodasTEC = React.useMemo(() => {
    return [
      { id: "LLANTAS", label: "Llantas", icon: "🛞" },
      { id: "ALINEACION", label: "Alineación", icon: "🎯" },
      { id: "ENLLANTAJE", label: "Enllantaje", icon: "🔧" },
      { id: "FRENOS", label: "Frenos", icon: "🛑" },
      { id: "SUSPENSION", label: "Suspensión", icon: "🔩" },
      { id: "BATERIAS", label: "Baterías", icon: "🔋" },
    ];
  }, []);

  const opcionesCategoriasMostrarTEC = React.useMemo(() => {
    if (filtroTipo === "PART") return categoriasProductosTEC;
    if (filtroTipo === "SERVICE") return categoriasServiciosTEC;
    return categoriasTodasTEC;
  }, [filtroTipo, categoriasProductosTEC, categoriasServiciosTEC, categoriasTodasTEC]);

  const labelCategoriaActivaTEC = React.useMemo(() => {
    if (categoriaActivaId === "TODO") return "Todas";
    const cat = opcionesCategoriasMostrarTEC.find((c) => c.id === categoriaActivaId);
    if (cat) return cat.label.trim().split(/\s+/)[0];
    return "Todas";
  }, [categoriaActivaId, opcionesCategoriasMostrarTEC]);

  const iconoCategoriaActivaTEC = React.useMemo(() => {
    if (categoriaActivaId === "TODO") return "📋";
    const cat = opcionesCategoriasMostrarTEC.find((c) => c.id === categoriaActivaId);
    return cat?.icon || "📋";
  }, [categoriaActivaId, opcionesCategoriasMostrarTEC]);

  const toggleFiltroTipoTEC = (tipo: "PART" | "SERVICE") => {
    setFiltroTipo((prev) => {
      const nuevo = prev === tipo ? "todos" : tipo;
      setCategoriaActivaId("TODO");
      setSubcategoriaActivaId("TODOS");
      return nuevo;
    });
  };

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
      // 1. Filtro Tipo P / S
      const esProd = item.kind === "TIRE" || item.kind === "PRODUCT";
      if (filtroTipo === "PART" && !esProd) return false;
      if (filtroTipo === "SERVICE" && esProd) return false;

      // 2. Filtro Categoría
      if (categoriaActivaId !== 'TODO') {
        const catNorm = categoriaActivaId.toUpperCase();
        const itemCat = String(item.categoryMapped || "").toUpperCase();
        const itemSub = String(item.subcategoryMapped || "").toUpperCase();
        const itemKw = String(item.keyword || "").toUpperCase();
        const itemName = String(item.name || "").toUpperCase();

        const match =
          itemCat === catNorm ||
          itemSub === catNorm ||
          itemKw.includes(catNorm) ||
          itemName.includes(catNorm);
        if (!match) return false;
      }

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
  }, [todosLosItemsPOS, filtroTipo, categoriaActivaId, subcategoriaActivaId, rinActivo, busquedaTec]);

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

  // Guardar en localStorage los últimos ítems de Tecnicentro del vehículo para permitir "Repetir último"
  useEffect(() => {
    if (itemsTecnicentroEnOrden.length > 0) {
      try {
        const keyPlate = `tecnicentro_last_${ordenActiva?.plate || "general"}`;
        localStorage.setItem(keyPlate, JSON.stringify(itemsTecnicentroEnOrden));
      } catch {}
    }
  }, [itemsTecnicentroEnOrden, ordenActiva?.plate]);

  const handleRepetirUltimoTecnicentro = async () => {
    try {
      let itemsRecuperados: any[] = [];
      const keyPlate = `tecnicentro_last_${ordenActiva?.plate || "general"}`;

      if (typeof window !== "undefined") {
        const guardado = localStorage.getItem(keyPlate) || localStorage.getItem("tecnicentro_last_general");
        if (guardado) {
          try {
            itemsRecuperados = JSON.parse(guardado);
          } catch {}
        }
      }

      // Si no hay historial previo en localStorage, sugerir alineación completa y balanceo
      if (!itemsRecuperados || itemsRecuperados.length === 0) {
        const ali = todosLosItemsPOS.find(
          (it) => it.id === "tc_ali_completa" || (it.categoryMapped === "ALINEACION" && it.subcategoryMapped === "COMPLETA")
        );
        const bal = todosLosItemsPOS.find(
          (it) => it.id === "tc_bal_dinamico" || (it.categoryMapped === "ALINEACION" && it.subcategoryMapped === "BALANCEO")
        );
        itemsRecuperados = [
          ...(ali ? [{ ...ali, qty: 1 }] : []),
          ...(bal ? [{ ...bal, qty: 4 }] : []),
        ];
      }

      if (itemsRecuperados.length === 0) {
        mostrarToast("No hay servicios previos registrados para repetir", "err");
        return;
      }

      // Conservar ítems que no sean de Tecnicentro
      const noTecnicentro = (itemsOrden || []).filter((it) => {
        const cat = String(it.category || "");
        const code = String(it.code || "");
        return (
          cat !== "Tecnicentro" &&
          cat !== "Llantas" &&
          cat !== "Alineación" &&
          cat !== "Frenos" &&
          cat !== "Suspensión" &&
          cat !== "Baterías" &&
          !code.startsWith("TC-") &&
          !code.startsWith("NEU-") &&
          !code.startsWith("PRD-TC-")
        );
      });

      const regenerados = itemsRecuperados.map((it) => {
        const matchPOS = todosLosItemsPOS.find((p) => p.id === it.id || p.id === it.serviceId || p.code === it.code);
        const unitPrice = matchPOS ? matchPOS.price : Number(it.price || 0);
        const qty = Number(it.qty) || 1;
        const esServicio = it.kind === "SERVICE" || it.type === "SERVICE";
        return {
          ...it,
          id: `tc_rep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          serviceId: esServicio ? it.serviceId || it.id : undefined,
          productId: esServicio ? undefined : it.productId || it.id,
          type: esServicio ? "SERVICE" : "PRODUCT",
          category: it.categoryMapped || it.category || "Tecnicentro",
          subCategory: it.subcategoryMapped || it.subCategory || "Alineación",
          code: it.code || `TC-${it.id}`,
          name: it.name,
          brand: it.brand || "Tecnicentro",
          presentation: "Servicio",
          unitOfMeasure: "Unidad",
          price: unitPrice,
          total: Number((unitPrice * qty).toFixed(2)),
          qty,
          estimatedMinutes: it.durationMinutes || 30,
          vehicleType: vehiculoTipo,
          status: "Listo",
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        };
      });

      await onActualizarItemsOrden([...noTecnicentro, ...regenerados]);
      mostrarToast(`✓ Último servicio de Tecnicentro cargado (${regenerados.length} servicio(s))`, "ok");
    } catch {
      mostrarToast("Error al cargar el último servicio de Tecnicentro", "err");
    }
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
    <div className="w-full">
      <div className="w-full animate-fade-in pb-28">
        {/* BENTO GRID TECNICENTRO: 2 tarjetas superiores (Alineación y Semáforo) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">

          {/* ===================================================================
              TARJETA 1: RECEPCIÓN (TECNICENTRO)
              =================================================================== */}
          <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                  Recepción
                </h2>
              </div>

              {/* Detección de vehículo y tiempo estimado */}
              <div className="mt-2 p-3 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200/70 dark:border-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl shrink-0 leading-none">
                      {vehiculoTipo === "SUV" ? "🚙" : vehiculoTipo === "Camión" ? "🚚" : "🚗"}
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      ⏱️ {tiempoEstimadoTecnicentro > 0 ? `${tiempoEstimadoTecnicentro} min` : "30 min"}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-zinc-200/60 dark:border-white/10">
                    Rin {rinLabel}
                  </span>
                </div>
              </div>

              {/* Botón rápido Repetir último servicio */}
              <button
                type="button"
                onClick={handleRepetirUltimoTecnicentro}
                className="mt-3 w-full h-10 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 hover:bg-blue-100/70 dark:hover:bg-blue-500/20 border border-blue-200/60 dark:border-blue-500/20 text-blue-800 dark:text-blue-200 text-xs sm:text-sm font-bold flex items-center justify-between px-3 cursor-pointer transition-all active:scale-98 shadow-2xs"
                title="Consultar historial y repetir servicios previos de Tecnicentro"
              >
                <span className="flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Repetir último</span>
                </span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400">→</span>
              </button>
            </div>
          </div>

          {/* ===== CARD DERECHA: Semaforo ===== */}
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 p-3.5 sm:p-4 shadow-2xs">
            <div>
              {/* Cabecera del semáforo con título, botón manual y flechas de paginación */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-100 dark:border-white/5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base sm:text-lg">🚦</span>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-tight">
                    Semáforo
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Botón para abrir input manual */}
                  <button
                    type="button"
                    onClick={() => setMostrarInputManual((prev) => !prev)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                      mostrarInputManual
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                        : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10"
                    }`}
                    title="Agregar chequeo manual al semáforo"
                  >
                    <span>＋</span>
                    <span>Manual</span>
                  </button>

                  {/* Flechas de paginación para ver más iconos (9 en cada página) */}
                  <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-white/5 p-0.5 rounded-lg border border-zinc-200/80 dark:border-white/10 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPaginaSemaforo((prev) => Math.max(0, prev - 1))}
                      disabled={paginaSemaforo === 0}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-white/15 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all"
                      title="Página anterior"
                    >
                      ◀
                    </button>
                    <span className="px-1.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 select-none">
                      {paginaSemaforo + 1} / {totalPaginas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaginaSemaforo((prev) => Math.min(totalPaginas - 1, prev + 1))}
                      disabled={paginaSemaforo >= totalPaginas - 1}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-white/15 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all"
                      title="Ver más iconos"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>

              {/* Campo para ingresar punto o chequeo manualmente */}
              {mostrarInputManual && (
                <div className="mb-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 flex items-center gap-2 animate-fade-in shadow-2xs">
                  <input
                    type="text"
                    value={nuevoManualTexto}
                    onChange={(e) => setNuevoManualTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAgregarItemManual();
                      }
                    }}
                    placeholder="Nombre del chequeo manual (ej. Terminal de dirección)..."
                    className="flex-1 h-8 rounded-lg bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 px-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white/30"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAgregarItemManual}
                    disabled={!nuevoManualTexto.trim()}
                    className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer transition-all shrink-0 active:scale-95"
                  >
                    Agregar
                  </button>
                </div>
              )}

              {/* Guía semafórica de 3 niveles */}
              <div className="grid grid-cols-3 gap-1.5 mb-2.5 px-1 py-1 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5 text-center text-xs sm:text-sm font-semibold">
                <span className="text-emerald-700 dark:text-emerald-400">Normal</span>
                <span className="text-amber-700 dark:text-amber-400">Revisar</span>
                <span className="text-rose-700 dark:text-rose-400">Cambiar</span>
              </div>

              {/* Tablero de 9 íconos semafóricos (3x3) con soporte de swipe/deslizar */}
              <div
                onTouchStart={(e) => {
                  touchStartXRef.current = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  if (touchStartXRef.current === null) return;
                  const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
                  touchStartXRef.current = null;
                  if (Math.abs(diffX) > 40) {
                    if (diffX > 0) {
                      setPaginaSemaforo((prev) => Math.min(totalPaginas - 1, prev + 1));
                    } else {
                      setPaginaSemaforo((prev) => Math.max(0, prev - 1));
                    }
                  }
                }}
                className="grid grid-cols-3 gap-y-3.5 gap-x-2 place-items-center py-1 transition-all"
              >
                {itemsPaginaActual.map((btn) => {
                  const estado = semaforoBentoEstados[btn.id] || 'ok';
                  const esAlerta = estado === 'alerta';
                  const esRevisar = estado === 'revisar';
                  const esOk = estado === 'ok';
                  const esManual = btn.id.startsWith("manual_sem_");

                  return (
                    <div key={btn.id} className="relative flex flex-col items-center gap-1 text-center w-full group">
                      {/* Botón de eliminar si es un ítem creado manualmente */}
                      {esManual && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemsManualesSemaforo((prev) => prev.filter((it) => it.id !== btn.id));
                            setSemaforoBentoEstados((prev) => {
                              const copy = { ...prev };
                              delete copy[btn.id];
                              return copy;
                            });
                          }}
                          className="absolute -top-1.5 right-1 w-4 h-4 rounded-full bg-zinc-200 hover:bg-rose-500 hover:text-white dark:bg-white/10 dark:hover:bg-rose-500 text-zinc-400 text-[10px] flex items-center justify-center cursor-pointer transition-colors z-10"
                          title="Eliminar chequeo manual"
                        >
                          ×
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleSemaforoBento(btn.id, btn.catId)}
                        className={`relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs ${
                          esAlerta
                            ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30 scale-105 ring-2 ring-rose-400 border border-rose-400"
                            : esRevisar
                              ? "bg-amber-400 hover:bg-amber-500 text-zinc-950 shadow-md shadow-amber-400/30 scale-102 ring-2 ring-amber-300 border border-amber-300"
                              : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 border border-zinc-200/90 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                        }`}
                        title={`${btn.label} (${btn.subLabel}): Estado [${esAlerta ? 'CAMBIAR' : esRevisar ? 'REVISAR' : 'NORMAL'}]. Clic para cambiar nivel`}
                      >
                        {btn.iconSvg("w-6 h-6 sm:w-6.5 sm:h-6.5")}

                        {/* Insignia en esquina */}
                        {esAlerta && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-black shadow-xs">
                            ✕
                          </span>
                        )}
                        {esRevisar && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-zinc-950 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-black shadow-xs">
                            !
                          </span>
                        )}
                      </button>

                      <div className="flex flex-col items-center leading-tight mt-1 px-1 max-w-full">
                        <span className={`text-xs sm:text-sm font-bold tracking-tight text-center truncate max-w-full ${
                          esAlerta
                            ? "text-rose-600 dark:text-rose-400"
                            : esRevisar
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-zinc-800 dark:text-zinc-200"
                        }`}>
                          {btn.label}
                        </span>
                        <span className={`text-[10px] sm:text-[11px] font-semibold mt-0.5 ${
                          esAlerta
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : esRevisar
                              ? "text-amber-600 dark:text-amber-400 font-bold"
                              : "text-emerald-600 dark:text-emerald-400 font-bold"
                        }`}>
                          {esAlerta ? 'Cambiar' : esRevisar ? 'Revisar' : 'Normal'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Indicadores de puntos de página (Dots) si hay más de 1 página */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-2 mt-1 border-t border-zinc-100 dark:border-white/5">
                  {Array.from({ length: totalPaginas }).map((_, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setPaginaSemaforo(pIdx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        paginaSemaforo === pIdx
                          ? "w-6 bg-zinc-800 dark:bg-white"
                          : "w-1.5 bg-zinc-300 dark:bg-white/20 hover:bg-zinc-400"
                      }`}
                      aria-label={`Ir a página ${pIdx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== CONTENEDOR DE FILTROS, BÚSQUEDA Y CATÁLOGO DEBAJO DE SEMÁFORO (CUBRE TODA LA PÁGINA) ===== */}
        <div className="relative w-full rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs p-3.5 sm:p-4 mt-3">
          {/* Fila 1: Dropdown de categorías desplegable (arriba) */}
          <div className="relative w-full mb-2" ref={dropdownCatRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuCatAbierto((prev) => !prev)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-800 dark:text-zinc-100 text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-white/10 shadow-2xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{iconoCategoriaActivaTEC}</span>
                  <span className="truncate">{labelCategoriaActivaTEC}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
                  {categoriaActivaId !== "TODO" && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoriaActivaId("TODO");
                        setSubcategoriaActivaId("TODOS");
                      }}
                      className="w-4 h-4 rounded-full hover:bg-zinc-200 dark:hover:bg-white/20 flex items-center justify-center text-[11px] text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                      title="Quitar filtro de categoría"
                    >
                      ✕
                    </span>
                  )}
                  <span className="text-[10px] opacity-75">▾</span>
                </div>
              </button>

              {menuCatAbierto && (
                <div className="absolute top-11 left-0 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1 shadow-xl animate-fade-in space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriaActivaId("TODO");
                      setSubcategoriaActivaId("TODOS");
                      setMenuCatAbierto(false);
                    }}
                    className={`w-full h-8 px-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                      categoriaActivaId === "TODO"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold"
                        : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
                    }`}
                  >
                    <span>📋</span>
                    <span>Todas</span>
                  </button>
                  {opcionesCategoriasMostrarTEC.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoriaActivaId(cat.id);
                        setSubcategoriaActivaId("TODOS");
                        setMenuCatAbierto(false);
                      }}
                      className={`w-full h-8 px-2.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                        categoriaActivaId === cat.id
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 font-bold"
                        : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fila 2: Buscador + Botones P y S */}
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
              <input
                type="text"
                value={busquedaTec}
                onChange={(e) => setBusquedaTec(e.target.value)}
                placeholder="Buscar..."
                className="w-full h-9 pl-8 pr-7 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-1 focus:ring-blue-400 shadow-2xs"
              />
              {busquedaTec && (
                <button
                  type="button"
                  onClick={() => setBusquedaTec("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => toggleFiltroTipoTEC("PART")}
                className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs select-none active:scale-95 ${
                  filtroTipo === "PART"
                    ? "bg-blue-600 text-white border border-blue-600 shadow-xs"
                    : "bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/10"
                }`}
                title="Filtrar por Productos"
              >
                P
              </button>
              <button
                type="button"
                onClick={() => toggleFiltroTipoTEC("SERVICE")}
                className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs select-none active:scale-95 ${
                  filtroTipo === "SERVICE"
                    ? "bg-blue-600 text-white border border-blue-600 shadow-xs"
                    : "bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/10"
                }`}
                title="Filtrar por Servicios"
              >
                S
              </button>
            </div>
          </div>

          {/* Grid de productos a ancho completo cubriendo toda la pantalla */}
          <div className="w-full">
            {productosBentoFiltrados.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 space-y-1.5">
                <span className="text-3xl block">🛞</span>
                <p className="text-xs sm:text-sm font-semibold">Sin resultados</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
                {productosBentoFiltrados.map((item) => {
                  const cant = obtenerCantidadEnPedido(item);
                  const enPedido = cant > 0;
                  const estaAgotado = (item as any).stock !== undefined && (item as any).stock !== null ? Number((item as any).stock) <= 0 : false;

                  return (
                    <div
                      key={item.id + item.keyword}
                      onClick={() => {
                        if (estaAgotado) {
                          mostrarToast?.(`El producto o servicio ${item.keyword} está agotado`, 'err');
                          return;
                        }
                        void handleAjustarCantidadItem(item as any, 1);
                      }}
                      className={`group relative flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] min-h-[175px] shadow-2xs ${
                        enPedido
                          ? "bg-blue-50/70 dark:bg-blue-500/10 border-blue-400 dark:border-blue-400/50 ring-2 ring-blue-300/60 dark:ring-blue-400/30 shadow-xs"
                          : estaAgotado
                          ? "bg-zinc-50/70 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 opacity-75"
                          : "bg-white hover:bg-zinc-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/40"
                      }`}
                    >
                      {/* Botón restar "−" e indicador de Stock/Agotado (una sola letra: S en verde, A en rojo) */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                        {enPedido && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleAjustarCantidadItem(item as any, -1);
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
                          title={estaAgotado ? "Agotado (Sin stock)" : "Stock disponible"}
                        >
                          {estaAgotado ? "A" : "S"}
                        </span>
                      </div>

                      {/* Contador verde arriba a la derecha */}
                      {enPedido && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-emerald-500 text-white shadow-xs z-10">
                          +{cant}
                        </span>
                      )}

                      {/* Ilustración / Imagen */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0 mt-1">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.keyword}
                            className="w-full h-full object-contain rounded-xl"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-3xl sm:text-4xl leading-none">{item.itemIcon}</span>
                        )}
                      </div>

                      {/* Palabra clave y descripción sin precios */}
                      <div className="w-full text-center mt-2 px-1">
                        <span className="text-sm sm:text-base font-medium tracking-tight text-zinc-900 dark:text-white block truncate">
                          {formatearPrimeraMayuscula(item.keyword)}
                        </span>
                        <span className="text-[11px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 block truncate mt-0.5" title={formatearPrimeraMayuscula(item.name)}>
                          {formatearPrimeraMayuscula(item.name)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          RESUMEN DE ÍTEMS EN LA ORDEN ESTILO FACTURA: PRODUCTOS Y SERVICIOS
          ===================================================================== */}
      {(itemsOrden || []).length > 0 && (() => {
        const esServicioItem = (it: any) =>
          it.type === "SERVICE" ||
          it.kind === "SERVICE" ||
          (it.category && it.category.toLowerCase().includes("servicio")) ||
          (it.category && it.category.toLowerCase().includes("alineacion")) ||
          (it.category && it.category.toLowerCase().includes("alineación")) ||
          (it.category && it.category.toLowerCase().includes("balanceo")) ||
          (it.category && it.category.toLowerCase().includes("enllantaje")) ||
          (it.category && it.category.toLowerCase().includes("lavado")) ||
          (it.category && it.category.toLowerCase().includes("car wash")) ||
          (it.code && it.code.toUpperCase().startsWith("TC-SRV")) ||
          (it.code && it.code.toUpperCase().startsWith("SRV")) ||
          (it.code && it.code.toUpperCase().startsWith("CW-"));

        const esManual = (it: any) =>
          it.category === "Manual" ||
          it.code?.startsWith("MANUAL-") ||
          it.id?.startsWith("manual-") ||
          Boolean(it.isManual);

        const productosSeleccionados = (itemsOrden || [])
          .filter((it: any) => !esServicioItem(it))
          .sort((a: any, b: any) => (esManual(a) ? 1 : 0) - (esManual(b) ? 1 : 0));

        const serviciosSeleccionados = (itemsOrden || [])
          .filter((it: any) => esServicioItem(it))
          .sort((a: any, b: any) => (esManual(a) ? 1 : 0) - (esManual(b) ? 1 : 0));

        if (ocultarResumenInferior) return null;
        const totalProductos = productosSeleccionados.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0);
        const totalServicios = serviciosSeleccionados.reduce((acc: number, it: any) => acc + (Number(it.qty) || 1), 0);

        return (
          <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs space-y-3.5 animate-fade-in">
            {/* 1. SECCIÓN PRODUCTOS */}
            {productosSeleccionados.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <span>📦</span>
                  <span>Productos ({totalProductos}):</span>
                </span>

                <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black/20 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold">
                        <th className="py-2 px-3 w-24 text-center">Cant.</th>
                        <th className="py-2 px-3">Descripción</th>
                        <th className="py-2 px-2.5 w-28">Detalle</th>
                        <th className="py-2 px-2 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                      {productosSeleccionados.map((it: any, idx: number) => {
                        const cant = Number(it.qty) || 1;
                        const detalle = it.presentation || it.viscosity || it.rimDiameter || it.subCategory || (esManual(it) ? "Manual" : (it.brand || "Producto"));
                        return (
                          <tr key={it.id || it.code || `tec-prod-${idx}`} className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-2 px-3 text-center">
                              <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-white/[0.04]">
                                <button
                                  type="button"
                                  onClick={() => void handleAjustarItemOrden(it, -1)}
                                  className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 text-xs font-bold cursor-pointer transition-colors"
                                  title="Restar 1"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                  {cant}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleAjustarItemOrden(it, 1)}
                                  className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 text-xs font-bold cursor-pointer transition-colors"
                                  title="Sumar 1"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                              <span>{formatearPrimeraMayuscula(it.name || it.fullName)}</span>
                            </td>
                            <td className="py-2 px-2.5">
                              {detalle ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                    detalle === "Manual"
                                      ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-500/30"
                                      : "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-500/30"
                                  }`}
                                >
                                  {formatearPrimeraMayuscula(detalle)}
                                </span>
                              ) : (
                                <span className="text-zinc-400 text-[10px]">-</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => void handleEliminarItemOrden(it)}
                                className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold cursor-pointer transition-colors"
                                title="Eliminar producto"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. SECCIÓN SERVICIOS */}
            {serviciosSeleccionados.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <span>🔧</span>
                  <span>Servicios ({totalServicios}):</span>
                </span>

                <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black/20 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold">
                        <th className="py-2 px-3 w-24 text-center">Cant.</th>
                        <th className="py-2 px-3">Descripción</th>
                        <th className="py-2 px-2.5 w-28">Detalle</th>
                        <th className="py-2 px-2 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                      {serviciosSeleccionados.map((it: any, idx: number) => {
                        const cant = Number(it.qty) || 1;
                        const detalle = it.category || it.subCategory || (esManual(it) ? "Manual" : "Tecnicentro");
                        return (
                          <tr key={it.id || it.code || `tec-srv-${idx}`} className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-2 px-3 text-center">
                              <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-white/[0.04]">
                                <button
                                  type="button"
                                  onClick={() => void handleAjustarItemOrden(it, -1)}
                                  className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 text-xs font-bold cursor-pointer transition-colors"
                                  title="Restar 1"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                  {cant}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleAjustarItemOrden(it, 1)}
                                  className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 text-xs font-bold cursor-pointer transition-colors"
                                  title="Sumar 1"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                              <span>{formatearPrimeraMayuscula(it.name || it.fullName)}</span>
                            </td>
                            <td className="py-2 px-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  detalle === "Manual"
                                    ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/80 dark:border-amber-500/30"
                                    : "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-500/30"
                                }`}
                              >
                                {formatearPrimeraMayuscula(detalle)}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => void handleEliminarItemOrden(it)}
                                className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold cursor-pointer transition-colors"
                                title="Eliminar servicio"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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

            {/* Resumen PC */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold shadow-xs">
              <span className="text-base">🛒</span>
              <span>
                {totalUnidadesTecnicentro} {totalUnidadesTecnicentro === 1 ? 'servicio' : 'servicios'} • ⏱ {tiempoEstimadoTecnicentro} min
              </span>
            </div>

            {/* Resumen Móvil */}
            <div className="sm:hidden flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                {totalUnidadesTecnicentro} {totalUnidadesTecnicentro === 1 ? 'servicio' : 'servicios'}
              </span>
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
