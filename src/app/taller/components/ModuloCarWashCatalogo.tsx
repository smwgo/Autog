"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type {
  CarWashConfigData,
  CarWashPackage,
  CarWashVehicleType,
} from "@/app/api/taller/carwash/route";
import {
  CarWashEnrichedService,
  ModalDetalleServicioCarWash,
  ModalServicioCarWashForm,
  ModalConfiguracionCarWash,
} from "./CarWashAdminModals";

export interface ModuloCarWashCatalogoProps {
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
export interface CarWashSubcatDef {
  id: string;
  label: string;
  icon?: string;
  keywords: string[];
}

export interface CarWashCatDef {
  id: string;
  label: string;
  icon: string;
  subcategories: CarWashSubcatDef[];
}

const CARWASH_CATEGORIES: CarWashCatDef[] = [
  {
    id: "TODO",
    label: "Todo",
    icon: "✨",
    subcategories: [],
  },
  {
    id: "LAVADO",
    label: "Lavado",
    icon: "🚿",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "EXPRES", label: "Exprés", icon: "⚡", keywords: ["expres", "express", "rápido", "rapido", "exterior"] },
      { id: "COMPLETO", label: "Completo", icon: "🌊", keywords: ["completo", "full", "estandar", "ejecutivo", "spa", "integral"] },
      { id: "MOTOR", label: "Motor", icon: "⚙️", keywords: ["motor", "vapor", "dielectrico", "dieléctrico"] },
      { id: "MOTOS", label: "Motos", icon: "🏍️", keywords: ["moto", "motos", "scooter", "touring"] },
    ],
  },
  {
    id: "CHASIS",
    label: "Chasis",
    icon: "🔩",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "AGUA", label: "Agua", icon: "💧", keywords: ["agua", "presion", "presión", "enjuague"] },
      { id: "GRAFITADO", label: "Grafitado", icon: "🛡️", keywords: ["grafitado", "grafito", "chasis", "protector"] },
      { id: "DESENGRASE", label: "Desengrase", icon: "🧪", keywords: ["desengrase", "desengrasante", "petroleado", "químico"] },
      { id: "SUSPENSION", label: "Suspensión", icon: "🔧", keywords: ["suspension", "suspensión", "guardabarros", "bajos"] },
    ],
  },
  {
    id: "INTERIOR",
    label: "Interior",
    icon: "🧹",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "ASPIRADO", label: "Aspirado", icon: "🧹", keywords: ["aspirado", "cabina", "alfombra", "maletero"] },
      { id: "TAPICERIA", label: "Tapicería", icon: "🛋️", keywords: ["tapiceria", "tapicería", "asientos", "inyeccion", "inyección", "tela"] },
      { id: "CUERO", label: "Cuero", icon: "🧴", keywords: ["cuero", "hidratacion", "hidratación", "piel", "nutricion"] },
      { id: "TECHO", label: "Techo", icon: "🏠", keywords: ["techo", "cielo", "viseras", "postes"] },
      { id: "OZONO", label: "Ozono", icon: "🌬️", keywords: ["ozono", "desinfeccion", "desinfección", "olores", "bacterias", "aire"] },
    ],
  },
  {
    id: "DETAILING",
    label: "Detailing",
    icon: "💎",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "CERA", label: "Cera", icon: "✨", keywords: ["cera", "encerado", "carnauba", "hidrofobico"] },
      { id: "PULIDO", label: "Pulido", icon: "🌟", keywords: ["pulido", "correccion", "corrección", "brillo", "barniz", "pasta"] },
      { id: "FAROS", label: "Faros", icon: "💡", keywords: ["faro", "faros", "opticas", "ópticas", "restauracion faros"] },
      { id: "GOTASECA", label: "Gotaseca", icon: "🌧️", keywords: ["gotaseca", "gota seca", "lluvia acida", "lluvia ácida", "calcarea"] },
      { id: "AROS", label: "Aros", icon: "🛞", keywords: ["aro", "aros", "llantas", "rines", "férrico", "ferrico"] },
    ],
  },
  {
    id: "EXTRAS",
    label: "Extras",
    icon: "➕",
    subcategories: [
      { id: "TODOS", label: "Todos", icon: "✨", keywords: [] },
      { id: "AROMA", label: "Aroma", icon: "🌸", keywords: ["aroma", "ambientador", "fragancia", "perfume", "aromatizante"] },
      { id: "SILICONA", label: "Silicona", icon: "🧽", keywords: ["silicona", "abrillantador", "tablero", "llantilar"] },
      { id: "SHAMPOO", label: "Shampoo", icon: "🫧", keywords: ["shampoo", "jabon", "jabón", "espuma", "snow"] },
      { id: "MICROFIBRA", label: "Microfibra", icon: "🧣", keywords: ["microfibra", "toalla", "paño", "bayeta"] },
    ],
  },
];

// Selector de porte / tamaño de vehículo en 1 sola palabra
export const VEHICULOS_CARWASH = [
  { id: "Auto", label: "Auto", icon: "🚗", vehicleTypeId: "vt_sedan" },
  { id: "SUV", label: "SUV", icon: "🚙", vehicleTypeId: "vt_suv" },
  { id: "Camioneta", label: "Camioneta", icon: "🛻", vehicleTypeId: "vt_camioneta" },
  { id: "Moto", label: "Moto", icon: "🏍️", vehicleTypeId: "vt_moto" },
  { id: "Pesado", label: "Pesado", icon: "🚐", vehicleTypeId: "vt_mayor_tamano" },
];

// Combos de lavado rápido en 1 sola palabra
export interface CarWashComboDef {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export const CARWASH_COMBOS: CarWashComboDef[] = [
  {
    id: "combo_expres",
    label: "Exprés",
    icon: "⚡",
    keywords: ["EXPRÉS", "ASPIRADO"],
  },
  {
    id: "combo_completo",
    label: "Completo",
    icon: "🌊",
    keywords: ["EXPRÉS", "ASPIRADO", "AGUA", "GRAFITADO", "MOTOR"],
  },
  {
    id: "combo_interior",
    label: "Interior",
    icon: "🛋️",
    keywords: ["TAPICERÍA", "TECHO", "OZONO"],
  },
  {
    id: "combo_brillo",
    label: "Brillo",
    icon: "✨",
    keywords: ["CERA", "GOTASECA", "FAROS"],
  },
];

// Extracción de una sola palabra clave en mayúsculas para cada tarjeta
const KEYWORD_RULES: Array<{ match: RegExp; keyword: string }> = [
  { match: /expr[eé]s/i, keyword: "EXPRÉS" },
  { match: /grafitad/i, keyword: "GRAFITADO" },
  { match: /motor/i, keyword: "MOTOR" },
  { match: /tapicer[ií]a/i, keyword: "TAPICERÍA" },
  { match: /gotaseca|gota\s*seca|lluvia\s*[aá]cida/i, keyword: "GOTASECA" },
  { match: /faro/i, keyword: "FAROS" },
  { match: /chasis/i, keyword: "CHASIS" },
  { match: /complet/i, keyword: "COMPLETO" },
  { match: /aspirad/i, keyword: "ASPIRADO" },
  { match: /cuero/i, keyword: "CUERO" },
  { match: /techo/i, keyword: "TECHO" },
  { match: /ozono|desinfecci/i, keyword: "OZONO" },
  { match: /cera|encerad/i, keyword: "CERA" },
  { match: /pulid/i, keyword: "PULIDO" },
  { match: /aro|rin/i, keyword: "AROS" },
  { match: /desengras/i, keyword: "DESENGRASE" },
  { match: /suspensi/i, keyword: "SUSPENSIÓN" },
  { match: /agua|presi[oó]n/i, keyword: "AGUA" },
  { match: /moto/i, keyword: "MOTOS" },
  { match: /aroma|ambientador|fragancia|perfume/i, keyword: "AROMA" },
  { match: /silicona|abrillantador/i, keyword: "SILICONA" },
  { match: /shampoo|jab[oó]n/i, keyword: "SHAMPOO" },
  { match: /microfibra|toalla|pa[ñn]o/i, keyword: "MICROFIBRA" },
  { match: /vidrio|cristal/i, keyword: "VIDRIOS" },
  { match: /espuma/i, keyword: "ESPUMA" },
  { match: /premium/i, keyword: "PREMIUM" },
];

function extractKeyword(name: string): string {
  if (!name) return "SERVICIO";
  for (const rule of KEYWORD_RULES) {
    if (rule.match.test(name)) {
      return rule.keyword;
    }
  }
  const cleaned = name
    .replace(/^(Lavado|Limpieza|Servicio|Tratamiento|Paquete|Aplicación|Kit)\s+(de\s+|del\s+)?/i, "")
    .replace(/^De\s+/i, "")
    .trim();
  const first = cleaned.split(/[\s/+,&-_]+/)[0];
  return (first || name).toUpperCase();
}

const FALLBACK_KEYWORD_ICONS: Record<string, string> = {
  EXPRÉS: "⚡",
  COMPLETO: "🌊",
  MOTOR: "⚙️",
  MOTOS: "🏍️",
  AGUA: "💧",
  GRAFITADO: "🛡️",
  DESENGRASE: "🧪",
  SUSPENSIÓN: "🔧",
  ASPIRADO: "🧹",
  TAPICERÍA: "🛋️",
  CUERO: "🧴",
  TECHO: "🏠",
  OZONO: "🌬️",
  CERA: "✨",
  PULIDO: "🌟",
  FAROS: "💡",
  GOTASECA: "🌧️",
  AROS: "🛞",
  AROMA: "🌸",
  SILICONA: "🧽",
  SHAMPOO: "🫧",
  MICROFIBRA: "🧣",
  DEFAULT: "🚿",
};

// Servicios base de Car Wash con clasificación y precios según porte
const SERVICIOS_BASE_CARWASH = [
  // Lavado
  { id: "cw_base_expres", name: "Lavado Exprés", category: "LAVADO", subcategory: "EXPRES", basePrice: 6.0, estimatedMinutes: 15, icon: "⚡" },
  { id: "cw_base_completo", name: "Lavado Completo", category: "LAVADO", subcategory: "COMPLETO", basePrice: 12.0, estimatedMinutes: 35, icon: "🌊" },
  { id: "cw_base_motor", name: "Lavado de Motor", category: "LAVADO", subcategory: "MOTOR", basePrice: 15.0, estimatedMinutes: 20, icon: "⚙️" },
  { id: "cw_base_motos", name: "Lavado de Motos", category: "LAVADO", subcategory: "MOTOS", basePrice: 5.0, estimatedMinutes: 15, icon: "🏍️" },
  // Chasis
  { id: "cw_base_agua", name: "Lavado de Chasis Agua", category: "CHASIS", subcategory: "AGUA", basePrice: 8.0, estimatedMinutes: 20, icon: "💧" },
  { id: "cw_base_grafitado", name: "Grafitado de Chasis", category: "CHASIS", subcategory: "GRAFITADO", basePrice: 14.0, estimatedMinutes: 20, icon: "🛡️" },
  { id: "cw_base_desengrase", name: "Desengrase de Chasis", category: "CHASIS", subcategory: "DESENGRASE", basePrice: 16.0, estimatedMinutes: 20, icon: "🧪" },
  { id: "cw_base_suspension", name: "Lavado de Suspensión", category: "CHASIS", subcategory: "SUSPENSION", basePrice: 10.0, estimatedMinutes: 20, icon: "🔧" },
  // Interior
  { id: "cw_base_aspirado", name: "Aspirado Interior", category: "INTERIOR", subcategory: "ASPIRADO", basePrice: 8.0, estimatedMinutes: 15, icon: "🧹" },
  { id: "cw_base_tapiceria", name: "Limpieza de Tapicería", category: "INTERIOR", subcategory: "TAPICERIA", basePrice: 35.0, estimatedMinutes: 30, icon: "🛋️" },
  { id: "cw_base_cuero", name: "Nutrición de Cuero", category: "INTERIOR", subcategory: "CUERO", basePrice: 25.0, estimatedMinutes: 30, icon: "🧴" },
  { id: "cw_base_techo", name: "Limpieza de Techo", category: "INTERIOR", subcategory: "TECHO", basePrice: 18.0, estimatedMinutes: 30, icon: "🏠" },
  { id: "cw_base_ozono", name: "Desinfección con Ozono", category: "INTERIOR", subcategory: "OZONO", basePrice: 15.0, estimatedMinutes: 30, icon: "🌬️" },
  // Detailing
  { id: "cw_base_cera", name: "Encerado Carnauba", category: "DETAILING", subcategory: "CERA", basePrice: 18.0, estimatedMinutes: 30, icon: "✨" },
  { id: "cw_base_pulido", name: "Pulido Espejo", category: "DETAILING", subcategory: "PULIDO", basePrice: 45.0, estimatedMinutes: 30, icon: "🌟" },
  { id: "cw_base_faros", name: "Restauración de Faros", category: "DETAILING", subcategory: "FAROS", basePrice: 20.0, estimatedMinutes: 30, icon: "💡" },
  { id: "cw_base_gotaseca", name: "Eliminación Gotaseca", category: "DETAILING", subcategory: "GOTASECA", basePrice: 25.0, estimatedMinutes: 30, icon: "🌧️" },
  { id: "cw_base_aros", name: "Descontaminado Aros", category: "DETAILING", subcategory: "AROS", basePrice: 15.0, estimatedMinutes: 30, icon: "🛞" },
  // Extras
  { id: "cw_base_aroma", name: "Ambientador de Aroma", category: "EXTRAS", subcategory: "AROMA", basePrice: 4.0, estimatedMinutes: 5, icon: "🌸" },
  { id: "cw_base_silicona", name: "Silicona para Tablero", category: "EXTRAS", subcategory: "SILICONA", basePrice: 3.5, estimatedMinutes: 5, icon: "🧽" },
  { id: "cw_base_shampoo", name: "Shampoo Espuma Activa", category: "EXTRAS", subcategory: "SHAMPOO", basePrice: 6.5, estimatedMinutes: 5, icon: "🫧" },
  { id: "cw_base_microfibra", name: "Toalla Microfibra", category: "EXTRAS", subcategory: "MICROFIBRA", basePrice: 4.5, estimatedMinutes: 5, icon: "🧣" },
];

function classifyItemCategory(
  item: { name: string; code?: string; brand?: string; category?: string; categoryId?: string; description?: string }
): "LAVADO" | "CHASIS" | "INTERIOR" | "DETAILING" | "EXTRAS" {
  const text = `${item.name} ${item.code || ""} ${item.category || ""} ${item.categoryId || ""} ${item.description || ""}`.toLowerCase();
  if (
    text.includes("detailing") ||
    text.includes("encerad") ||
    text.includes("pulid") ||
    text.includes("cera") ||
    text.includes("faro") ||
    text.includes("gotaseca") ||
    text.includes("gota seca") ||
    text.includes("lluvia acida") ||
    text.includes("lluvia ácida") ||
    text.includes("aro") ||
    text.includes("rin")
  ) {
    return "DETAILING";
  }
  if (
    text.includes("chasis") ||
    text.includes("grafitad") ||
    text.includes("grafito") ||
    text.includes("desengrase") ||
    text.includes("suspensi") ||
    text.includes("bajos") ||
    text.includes("petrolead")
  ) {
    return "CHASIS";
  }
  if (
    text.includes("interior") ||
    text.includes("cabina") ||
    text.includes("aspirad") ||
    text.includes("tapicer") ||
    text.includes("asiento") ||
    text.includes("cuero") ||
    text.includes("techo") ||
    text.includes("ozono") ||
    text.includes("desinfecci")
  ) {
    return "INTERIOR";
  }
  if (
    text.includes("adicional") ||
    text.includes("extra") ||
    text.includes("aroma") ||
    text.includes("ambientador") ||
    text.includes("silicona") ||
    text.includes("shampoo") ||
    text.includes("microfibra") ||
    text.includes("toalla") ||
    text.includes("insumo") ||
    text.includes("producto")
  ) {
    return "EXTRAS";
  }
  return "LAVADO";
}

function classifyItemSubcategory(
  category: "LAVADO" | "CHASIS" | "INTERIOR" | "DETAILING" | "EXTRAS",
  item: { name: string; code?: string; description?: string }
): string {
  const text = `${item.name} ${item.code || ""} ${item.description || ""}`.toLowerCase();
  if (category === "LAVADO") {
    if (text.includes("moto") || text.includes("scooter")) return "MOTOS";
    if (text.includes("motor") || text.includes("vapor") || text.includes("dielectric")) return "MOTOR";
    if (text.includes("complet") || text.includes("full") || text.includes("ejecutiv") || text.includes("spa")) return "COMPLETO";
    return "EXPRES";
  }
  if (category === "CHASIS") {
    if (text.includes("grafitad") || text.includes("grafito")) return "GRAFITADO";
    if (text.includes("desengras") || text.includes("petrolead")) return "DESENGRASE";
    if (text.includes("suspensi") || text.includes("guardabarro")) return "SUSPENSION";
    return "AGUA";
  }
  if (category === "INTERIOR") {
    if (text.includes("cuero") || text.includes("piel")) return "CUERO";
    if (text.includes("tapicer") || text.includes("inyecci") || text.includes("asiento")) return "TAPICERIA";
    if (text.includes("techo") || text.includes("cielo")) return "TECHO";
    if (text.includes("ozono") || text.includes("desinfecci") || text.includes("olor")) return "OZONO";
    return "ASPIRADO";
  }
  if (category === "DETAILING") {
    if (text.includes("faro") || text.includes("optica")) return "FAROS";
    if (text.includes("gotaseca") || text.includes("gota seca") || text.includes("lluvia acida") || text.includes("calcare")) return "GOTASECA";
    if (text.includes("aro") || text.includes("rin") || text.includes("llanta")) return "AROS";
    if (text.includes("pulid") || text.includes("correcci") || text.includes("pasta")) return "PULIDO";
    return "CERA";
  }
  if (category === "EXTRAS") {
    if (text.includes("aroma") || text.includes("ambientador") || text.includes("perfume")) return "AROMA";
    if (text.includes("silicona") || text.includes("abrillantador")) return "SILICONA";
    if (text.includes("microfibra") || text.includes("toalla") || text.includes("paño")) return "MICROFIBRA";
    return "SHAMPOO";
  }
  return "TODOS";
}

function computePriceForVehicle(
  item: {
    basePrice?: number | null;
    price?: number | null;
    promoPrice?: number | null;
    priceByVehicleType?: Record<string, number>;
    priceConfigured?: boolean;
  },
  vehicleTypeId: string
): { unitPrice: number; isPromo: boolean } {
  if (item.priceConfigured === false) {
    return { unitPrice: 0, isPromo: false };
  }
  let vtVal = item.priceByVehicleType?.[vehicleTypeId];
  if (vtVal === undefined || vtVal === null || vtVal <= 0) {
    if (vehicleTypeId === "vt_sedan" || vehicleTypeId === "vt_auto_pequeno" || vehicleTypeId === "vt_hatchback") {
      vtVal = item.priceByVehicleType?.["vt_sedan"] ?? item.priceByVehicleType?.["vt_auto_pequeno"] ?? item.priceByVehicleType?.["vt_hatchback"];
    } else if (vehicleTypeId === "vt_camioneta" || vehicleTypeId === "vt_camioneta_grande") {
      vtVal = item.priceByVehicleType?.["vt_camioneta"] ?? item.priceByVehicleType?.["vt_camioneta_grande"];
    } else if (vehicleTypeId === "vt_mayor_tamano" || vehicleTypeId === "vt_furgoneta") {
      vtVal = item.priceByVehicleType?.["vt_mayor_tamano"] ?? item.priceByVehicleType?.["vt_furgoneta"];
    }
  }

  const rawBase =
    item.basePrice !== undefined && item.basePrice !== null
      ? Number(item.basePrice)
      : item.price !== undefined && item.price !== null
      ? Number(item.price)
      : 0;

  if (typeof vtVal === "number" && vtVal > 0) {
    if (item.promoPrice && item.promoPrice > 0 && item.promoPrice < vtVal) {
      return { unitPrice: Number(item.promoPrice), isPromo: true };
    }
    return { unitPrice: vtVal, isPromo: false };
  }

  if (rawBase <= 0) {
    return { unitPrice: 0, isPromo: false };
  }

  // Multiplicador automático según tamaño de vehículo si no hay tarifa fija cargada
  let multiplier = 1.0;
  if (vehicleTypeId === "vt_suv") multiplier = 1.25;
  else if (vehicleTypeId === "vt_camioneta" || vehicleTypeId === "vt_camioneta_grande") multiplier = 1.4;
  else if (vehicleTypeId === "vt_mayor_tamano" || vehicleTypeId === "vt_furgoneta") multiplier = 1.8;
  else if (vehicleTypeId === "vt_moto") multiplier = 0.65;

  const adjusted = Math.round(rawBase * multiplier * 100) / 100;
  if (item.promoPrice && item.promoPrice > 0 && item.promoPrice < adjusted) {
    return { unitPrice: Number(item.promoPrice), isPromo: true };
  }

  return { unitPrice: adjusted, isPromo: false };
}

async function uploadImageToR2CarWash(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "carwash");
  const res = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error(data.error || "Error al subir imagen");
  return data.url;
}

type NivelAfeccion = "NORMAL" | "MODERADO" | "EXTREMO";

export default function ModuloCarWashCatalogo({
  empleadoLogueado,
  ordenActiva,
  itemsOrden,
  mostrarToast,
  onActualizarItemsOrden,
  onIrAAvisoYFirma,
  onIrASiguiente,
  triggerAbrirConfig,
}: ModuloCarWashCatalogoProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<CarWashConfigData | null>(null);
  const [services, setServices] = useState<CarWashEnrichedService[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // 1. Estados de accesos rápidos superiores
  const [mostrarEstado, setMostrarEstado] = useState<boolean>(false);
  const [mostrarCombos, setMostrarCombos] = useState<boolean>(false);

  // 2. Estados de recepción rápida en lavadora (Lodo, Pelos, Manchas, Gotaseca, Objetos, 📷)
  const [estadoAfecciones, setEstadoAfecciones] = useState<Record<string, NivelAfeccion>>({
    Lodo: "NORMAL",
    Pelos: "NORMAL",
    Manchas: "NORMAL",
    Gotaseca: "NORMAL",
  });
  const [objetosVerificados, setObjetosVerificados] = useState<boolean>(false);
  const [fotosEstado, setFotosEstado] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categorías y subcategorías contraíbles
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("TODO");
  const [mostrarCategorias, setMostrarCategorias] = useState<boolean>(true);
  const [subcategoriaActivaId, setSubcategoriaActivaId] = useState<string>("TODOS");
  const [mostrarSubcategorias, setMostrarSubcategorias] = useState<boolean>(true);

  // Selector contraíble de porte / tamaño de vehículo
  const [vehiculoActivo, setVehiculoActivo] = useState<string>("Auto");
  const [mostrarVehiculos, setMostrarVehiculos] = useState<boolean>(false);
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<string>("vt_sedan");

  // Buscador del POS
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modales
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState<{
    item: CarWashEnrichedService | CarWashPackage;
    kind: "SERVICE" | "PACKAGE";
  } | null>(null);
  const [serviceFormModal, setServiceFormModal] = useState<{
    open: boolean;
    service?: Partial<CarWashEnrichedService> | null;
  }>({ open: false, service: null });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escuchar trigger de cabecera exterior
  useEffect(() => {
    if (triggerAbrirConfig && triggerAbrirConfig > 0) {
      setConfigModalOpen(true);
    }
  }, [triggerAbrirConfig]);

  // Cargar catálogo desde la API
  const fetchCarWashData = useCallback(async () => {
    try {
      if (!config) setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/taller/carwash", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cargar el catálogo de Car Wash");
      }
      setConfig(data.config);
      setServices(data.services || []);
      setProducts(data.products || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con Car Wash");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void fetchCarWashData();
    const handleCatalogoActualizado = () => {
      void fetchCarWashData();
    };
    window.addEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    return () => {
      window.removeEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    };
  }, [fetchCarWashData]);

  // Sincronizar sugerencia de porte según el vehículo de la orden
  useEffect(() => {
    if (!ordenActiva?.vehicle) return;
    const vText = String(ordenActiva.vehicle).toLowerCase();
    if (vText.includes("moto") || vText.includes("yamaha") || vText.includes("honda cb")) {
      setVehiculoActivo("Moto");
      setSelectedVehicleTypeId("vt_moto");
    } else if (vText.includes("hilux") || vText.includes("d-max") || vText.includes("amarok") || vText.includes("pickup") || vText.includes("camioneta")) {
      setVehiculoActivo("Camioneta");
      setSelectedVehicleTypeId("vt_camioneta");
    } else if (vText.includes("tahoe") || vText.includes("prado") || vText.includes("fortuner") || vText.includes("furgoneta") || vText.includes("camion")) {
      setVehiculoActivo("Pesado");
      setSelectedVehicleTypeId("vt_mayor_tamano");
    } else if (vText.includes("sportage") || vText.includes("tucson") || vText.includes("rav4") || vText.includes("cr-v") || vText.includes("suv")) {
      setVehiculoActivo("SUV");
      setSelectedVehicleTypeId("vt_suv");
    } else {
      setVehiculoActivo("Auto");
      setSelectedVehicleTypeId("vt_sedan");
    }
  }, [ordenActiva?.vehicle]);

  // Manejo de categorías
  const categoriaSeleccionadaObj = useMemo(() => {
    return CARWASH_CATEGORIES.find((c) => c.id === categoriaActivaId) || CARWASH_CATEGORIES[0];
  }, [categoriaActivaId]);

  const subcategoriasActivas = useMemo(() => {
    if (categoriaActivaId === "TODO") return [];
    return categoriaSeleccionadaObj.subcategories;
  }, [categoriaActivaId, categoriaSeleccionadaObj]);

  const subcategoriaSeleccionadaObj = useMemo(() => {
    if (subcategoriaActivaId === "TODOS") return null;
    return subcategoriasActivas.find((s) => s.id === subcategoriaActivaId) || null;
  }, [subcategoriaActivaId, subcategoriasActivas]);

  const vehiculoSeleccionadoObj = useMemo(() => {
    return VEHICULOS_CARWASH.find((v) => v.id === vehiculoActivo) || VEHICULOS_CARWASH[0];
  }, [vehiculoActivo]);

  // Construcción unificada de ítems para el POS
  const todosLosItemsPOS = useMemo(() => {
    const list: Array<{
      id: string;
      kind: "SERVICE" | "PRODUCT" | "PACKAGE" | "ADDON";
      name: string;
      code: string;
      brand: string;
      price: number;
      durationMinutes?: number;
      imageUrl?: string;
      categoryMapped: "LAVADO" | "CHASIS" | "INTERIOR" | "DETAILING" | "EXTRAS";
      subcategoryMapped: string;
      keyword: string;
      itemIcon: string;
      rawService?: CarWashEnrichedService;
    }> = [];

    const existingKeywords = new Set<string>();

    // 1. Servicios reales de Neon
    services.forEach((srv) => {
      if (!srv.active || srv.archived) return;
      const cat = classifyItemCategory(srv);
      const sub = classifyItemSubcategory(cat, srv);
      const pInfo = computePriceForVehicle(srv, selectedVehicleTypeId);
      const kw = extractKeyword(srv.name);
      existingKeywords.add(kw);

      list.push({
        id: srv.id,
        kind: "SERVICE",
        name: srv.name,
        code: srv.code,
        brand: "Car Wash",
        price: pInfo.unitPrice,
        durationMinutes: srv.estimatedMinutes || 25,
        imageUrl: srv.imageUrl,
        categoryMapped: cat,
        subcategoryMapped: sub,
        keyword: kw,
        itemIcon: FALLBACK_KEYWORD_ICONS[kw] || FALLBACK_KEYWORD_ICONS.DEFAULT,
        rawService: srv,
      });
    });

    // 2. Paquetes configurados
    (config?.packages || []).forEach((pkg) => {
      if (!pkg.active) return;
      const cat = classifyItemCategory(pkg);
      const sub = classifyItemSubcategory(cat, pkg);
      const pInfo = computePriceForVehicle(pkg, selectedVehicleTypeId);
      const kw = extractKeyword(pkg.name);
      existingKeywords.add(kw);

      list.push({
        id: pkg.id,
        kind: "PACKAGE",
        name: pkg.name,
        code: pkg.code,
        brand: "Paquete",
        price: pInfo.unitPrice,
        durationMinutes: pkg.estimatedMinutes || 35,
        imageUrl: pkg.imageUrl,
        categoryMapped: cat,
        subcategoryMapped: sub,
        keyword: kw,
        itemIcon: FALLBACK_KEYWORD_ICONS[kw] || "🏷️",
      });
    });

    // 3. Insumos y productos del POS
    products.forEach((prod) => {
      const cat = classifyItemCategory(prod);
      const sub = classifyItemSubcategory(cat, prod);
      const kw = extractKeyword(prod.name);

      list.push({
        id: prod.id,
        kind: "PRODUCT",
        name: prod.name,
        code: prod.code,
        brand: prod.brand || "Insumo",
        price: Number(prod.price || 0),
        durationMinutes: 5,
        imageUrl: prod.imageUrl,
        categoryMapped: cat,
        subcategoryMapped: sub,
        keyword: kw,
        itemIcon: FALLBACK_KEYWORD_ICONS[kw] || "📦",
      });
    });

    // 4. Catálogo base complementario para asegurar opciones en todas las categorías
    SERVICIOS_BASE_CARWASH.forEach((base) => {
      const kw = extractKeyword(base.name);
      if (!existingKeywords.has(kw)) {
        const pInfo = computePriceForVehicle({ basePrice: base.basePrice }, selectedVehicleTypeId);
        list.push({
          id: base.id,
          kind: "SERVICE",
          name: base.name,
          code: `CW-${base.id.toUpperCase()}`,
          brand: "Car Wash",
          price: pInfo.unitPrice,
          durationMinutes: base.estimatedMinutes,
          categoryMapped: base.category as any,
          subcategoryMapped: base.subcategory,
          keyword: kw,
          itemIcon: base.icon,
        });
      }
    });

    return list;
  }, [services, products, config?.packages, selectedVehicleTypeId]);

  // Ítems de Car Wash en la orden activa
  const itemsCarWashEnOrden = useMemo(() => {
    return (itemsOrden || []).filter((it) => {
      const code = String(it.code || "");
      const cat = String(it.category || "");
      return (
        cat === "Lavado" ||
        cat === "Car Wash" ||
        cat === "Insumo" ||
        code.startsWith("CW-") ||
        code.startsWith("PKG-CW-") ||
        code.startsWith("ADD-CW-") ||
        code.startsWith("PRD-") ||
        Boolean(it.productId) ||
        Boolean(it.serviceId)
      );
    });
  }, [itemsOrden]);

  const totalUnidadesCarWash = useMemo(() => {
    return itemsCarWashEnOrden.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  }, [itemsCarWashEnOrden]);

  const totalMontoCarWash = useMemo(() => {
    return itemsCarWashEnOrden.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
  }, [itemsCarWashEnOrden]);

  // Cálculo automático del tiempo estimado de lavado según los servicios seleccionados
  const totalMinutosEstimados = useMemo(() => {
    if (itemsCarWashEnOrden.length === 0) return 0;
    return itemsCarWashEnOrden.reduce((sum, it) => {
      const qty = Number(it.qty) || 1;
      let mins = Number(it.estimatedMinutes);
      if (!mins || mins <= 0) {
        const kw = extractKeyword(it.name || "");
        if (kw === "EXPRÉS" || kw === "ASPIRADO") mins = 15;
        else if (kw === "COMPLETO") mins = 35;
        else if (
          kw === "CHASIS" ||
          kw === "MOTOR" ||
          kw === "GRAFITADO" ||
          kw === "DESENGRASE" ||
          kw === "AGUA" ||
          kw === "SUSPENSIÓN"
        )
          mins = 20;
        else if (
          kw === "TAPICERÍA" ||
          kw === "CUERO" ||
          kw === "TECHO" ||
          kw === "OZONO" ||
          kw === "CERA" ||
          kw === "PULIDO" ||
          kw === "FAROS" ||
          kw === "GOTASECA" ||
          kw === "AROS"
        )
          mins = 30;
        else mins = 10;
      }
      return sum + mins * qty;
    }, 0);
  }, [itemsCarWashEnOrden]);

  // Persistir último servicio de este vehículo en localStorage para "⚡ Repetir"
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (itemsCarWashEnOrden.length > 0) {
      try {
        const key = `carwash_last_${ordenActiva?.plate || "general"}`;
        localStorage.setItem(key, JSON.stringify(itemsCarWashEnOrden));
      } catch {}
    }
  }, [itemsCarWashEnOrden, ordenActiva?.plate]);

  // Conteos por categoría
  const conteoItemsPorCategoria = useMemo(() => {
    const map: Record<string, number> = { TODO: todosLosItemsPOS.length };
    todosLosItemsPOS.forEach((it) => {
      map[it.categoryMapped] = (map[it.categoryMapped] || 0) + 1;
    });
    return map;
  }, [todosLosItemsPOS]);

  const conteoEnPedidoPorCategoria = useMemo(() => {
    const map: Record<string, number> = { TODO: totalUnidadesCarWash };
    itemsCarWashEnOrden.forEach((it) => {
      const cat = classifyItemCategory({ name: it.name, code: it.code, category: it.category });
      map[cat] = (map[cat] || 0) + (Number(it.qty) || 1);
    });
    return map;
  }, [itemsCarWashEnOrden, totalUnidadesCarWash]);

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
    itemsCarWashEnOrden.forEach((it) => {
      const cat = classifyItemCategory({ name: it.name, code: it.code, category: it.category });
      if (categoriaActivaId === "TODO" || cat === categoriaActivaId) {
        const sub = classifyItemSubcategory(cat, { name: it.name, code: it.code });
        map[sub] = (map[sub] || 0) + (Number(it.qty) || 1);
      }
    });
    return map;
  }, [itemsCarWashEnOrden, categoriaActivaId, conteoEnPedidoPorCategoria]);

  // Ítems finales filtrados para la cuadrícula del POS
  const itemsFiltrados = useMemo(() => {
    const q = searchQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    return todosLosItemsPOS.filter((item) => {
      if (categoriaActivaId !== "TODO" && item.categoryMapped !== categoriaActivaId) {
        return false;
      }
      if (subcategoriaActivaId !== "TODOS" && item.subcategoryMapped !== subcategoriaActivaId) {
        return false;
      }
      if (q) {
        const haystack = `${item.name} ${item.keyword} ${item.code} ${item.brand}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [todosLosItemsPOS, categoriaActivaId, subcategoriaActivaId, searchQuery]);

  // Obtener cantidad en la orden activa para un ítem
  const obtenerCantidadEnPedido = (item: { id: string; code?: string; kind?: string }) => {
    const isProduct = item.kind === "PRODUCT";
    const expectedCode = item.code || (isProduct ? `PRD-${item.id}` : `CW-${item.id}`);
    const matches = (itemsOrden || []).filter(
      (it) =>
        it.id === item.id ||
        it.id === `prod_${item.id}` ||
        it.id === `cw_${item.id}` ||
        it.id?.startsWith?.(`prod_${item.id}_`) ||
        it.id?.startsWith?.(`cw_${item.id}_`) ||
        it.productId === item.id ||
        it.serviceId === item.id ||
        (it.code && expectedCode && it.code === expectedCode)
    );
    return matches.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
  };

  // Ajustar cantidad (+1 / -1) de forma inmediata al tocar
  const handleAjustarCantidadItem = async (
    item: {
      id: string;
      kind: "PACKAGE" | "SERVICE" | "ADDON" | "PRODUCT";
      name: string;
      code: string;
      price: number;
      durationMinutes?: number;
      keyword: string;
      brand?: string;
    },
    delta: number
  ) => {
    try {
      const isProduct = item.kind === "PRODUCT";
      const code = item.code || (isProduct ? `PRD-${item.id}` : `CW-${item.id}`);
      const vehLabel = vehiculoActivo;
      const listaActual = [...(itemsOrden || [])];
      const idx = listaActual.findIndex(
        (it) =>
          it.id === item.id ||
          it.id === `prod_${item.id}` ||
          it.id === `cw_${item.id}` ||
          it.id?.startsWith?.(`prod_${item.id}_`) ||
          it.id?.startsWith?.(`cw_${item.id}_`) ||
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
        const displayName = isProduct ? item.name : `${item.keyword} (${vehLabel})`;

        const nuevoItem = {
          id: isProduct ? `prod_${item.id}_${Date.now()}` : `cw_${item.id}_${Date.now()}`,
          key: `key_${item.id}_${Date.now()}`,
          serviceId: isProduct ? undefined : item.id,
          productId: isProduct ? item.id : undefined,
          type: isProduct ? ("PART" as const) : ("SERVICE" as const),
          category: isProduct ? "Insumo" : "Lavado",
          cwCategoryId: categoriaActivaId,
          subCategory: isProduct ? "Producto" : "Car Wash",
          code,
          name: displayName,
          brand: isProduct ? (item.brand || "Insumo") : "Car Wash",
          presentation: isProduct ? "Unidad" : item.durationMinutes ? `${item.durationMinutes} min` : "Servicio",
          unitOfMeasure: isProduct ? "Unidad" : "Servicio",
          price: priceUnit,
          total: Number((priceUnit * delta).toFixed(2)),
          qty: delta,
          estimatedMinutes: isProduct ? undefined : (item.durationMinutes || 25),
          vehicleType: isProduct ? undefined : vehLabel,
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

  // Función 1: Repetir último servicio de Carwash para este vehículo
  const handleRepetirUltimoServicio = async () => {
    try {
      let itemsRecuperados: any[] = [];
      const keyPlate = `carwash_last_${ordenActiva?.plate || "general"}`;

      if (typeof window !== "undefined") {
        const guardado = localStorage.getItem(keyPlate) || localStorage.getItem("carwash_last_general");
        if (guardado) {
          try {
            itemsRecuperados = JSON.parse(guardado);
          } catch {}
        }
      }

      // Si no hay historial previo en localStorage, usar el servicio más representativo (Lavado Completo o Exprés)
      if (!itemsRecuperados || itemsRecuperados.length === 0) {
        const targetKeyword = "COMPLETO";
        const baseItem = todosLosItemsPOS.find((it) => it.keyword === targetKeyword) || todosLosItemsPOS[0];
        if (baseItem) {
          const vehLabel = vehiculoActivo;
          itemsRecuperados = [
            {
              id: `cw_${baseItem.id}_${Date.now()}`,
              key: `key_${baseItem.id}_${Date.now()}`,
              serviceId: baseItem.id,
              type: "SERVICE",
              category: "Lavado",
              cwCategoryId: "LAVADO",
              subCategory: "Car Wash",
              code: baseItem.code,
              name: `${baseItem.keyword} (${vehLabel})`,
              brand: "Car Wash",
              presentation: `${baseItem.durationMinutes || 35} min`,
              unitOfMeasure: "Servicio",
              price: baseItem.price,
              total: baseItem.price,
              qty: 1,
              estimatedMinutes: baseItem.durationMinutes || 35,
              vehicleType: vehLabel,
              status: "Listo",
              completed: true,
              empleado_id: empleadoLogueado.id,
              empleado_nombre: empleadoLogueado.nombre,
            },
          ];
        }
      }

      if (itemsRecuperados.length === 0) {
        mostrarToast("No hay servicios previos registrados para repetir", "err");
        return;
      }

      // Conservar ítems que no sean de Carwash
      const noCarwash = (itemsOrden || []).filter((it) => {
        const cat = String(it.category || "");
        const code = String(it.code || "");
        return (
          cat !== "Lavado" &&
          cat !== "Car Wash" &&
          !code.startsWith("CW-") &&
          !code.startsWith("PKG-CW-") &&
          !code.startsWith("ADD-CW-")
        );
      });

      // Recalcular precios con la tarifa del vehículo actual
      const regenerados = itemsRecuperados.map((it) => {
        const matchPOS = todosLosItemsPOS.find(
          (p) => p.id === it.serviceId || p.code === it.code || it.name.includes(p.keyword)
        );
        const unitPrice = matchPOS ? matchPOS.price : Number(it.price || 0);
        const qty = Number(it.qty) || 1;
        return {
          ...it,
          id: `cw_rep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          vehicleType: vehiculoActivo,
          price: unitPrice,
          total: Number((unitPrice * qty).toFixed(2)),
          name: matchPOS ? `${matchPOS.keyword} (${vehiculoActivo})` : it.name,
        };
      });

      await onActualizarItemsOrden([...noCarwash, ...regenerados]);
      mostrarToast(`✓ Último servicio de Carwash cargado al carrito (${regenerados.length} servicio(s))`, "ok");
    } catch {
      mostrarToast("Error al cargar el último servicio", "err");
    }
  };

  // Función 2: Ciclo de afección de estado (Normal -> Moderado -> Extremo/Recargo)
  const handleCiclarEstadoAfeccion = (clave: string) => {
    setEstadoAfecciones((prev) => {
      const actual = prev[clave] || "NORMAL";
      let siguiente: NivelAfeccion = "NORMAL";
      if (actual === "NORMAL") siguiente = "MODERADO";
      else if (actual === "MODERADO") siguiente = "EXTREMO";
      else siguiente = "NORMAL";

      // Si se marca en Rojo (Extremo), sugerir / filtrar automáticamente el servicio correspondiente
      if (siguiente === "EXTREMO") {
        if (clave === "Lodo") {
          setCategoriaActivaId("CHASIS");
          setSubcategoriaActivaId("DESENGRASE");
          mostrarToast("⚠️ Lodo extremo detectado: Sugerido Desengrase / Chasis", "ok");
        } else if (clave === "Pelos") {
          setCategoriaActivaId("INTERIOR");
          setSubcategoriaActivaId("TAPICERIA");
          mostrarToast("⚠️ Pelos extremo detectado: Sugerido Lavado de Tapicería", "ok");
        } else if (clave === "Manchas") {
          setCategoriaActivaId("INTERIOR");
          setSubcategoriaActivaId("TAPICERIA");
          mostrarToast("⚠️ Manchas extremas detectadas: Sugerido Lavado de Tapicería", "ok");
        } else if (clave === "Gotaseca") {
          setCategoriaActivaId("DETAILING");
          setSubcategoriaActivaId("GOTASECA");
          mostrarToast("⚠️ Gota seca extrema: Sugerido Tratamiento Gotaseca", "ok");
        }
      }

      return { ...prev, [clave]: siguiente };
    });
  };

  // Función 3: Subida rápida de foto del estado (R2)
  const handleSubirFotoEstado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSubiendoFoto(true);
      const url = await uploadImageToR2CarWash(file);
      setFotosEstado((prev) => [...prev, url]);
      mostrarToast("✓ Foto del estado del vehículo guardada en R2", "ok");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir foto", "err");
    } finally {
      setSubiendoFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Función 4: Aplicar combo completo en 1 toque
  const handleAplicarCombo = async (combo: CarWashComboDef) => {
    try {
      const listaActual = [...(itemsOrden || [])];
      const itemsAgregados: any[] = [];
      const vehLabel = vehiculoActivo;

      for (const kw of combo.keywords) {
        const itemMatch = todosLosItemsPOS.find((it) => it.keyword === kw);
        if (itemMatch) {
          const yaExiste = listaActual.some(
            (it) => it.serviceId === itemMatch.id || it.code === itemMatch.code || (it.name && it.name.includes(kw))
          );
          if (!yaExiste) {
            itemsAgregados.push({
              id: `cw_combo_${itemMatch.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              key: `key_${itemMatch.id}_${Date.now()}`,
              serviceId: itemMatch.id,
              type: "SERVICE",
              category: "Lavado",
              cwCategoryId: itemMatch.categoryMapped,
              subCategory: "Car Wash",
              code: itemMatch.code,
              name: `${itemMatch.keyword} (${vehLabel})`,
              brand: "Car Wash",
              presentation: `${itemMatch.durationMinutes || 25} min`,
              unitOfMeasure: "Servicio",
              price: itemMatch.price,
              total: itemMatch.price,
              qty: 1,
              estimatedMinutes: itemMatch.durationMinutes || 25,
              vehicleType: vehLabel,
              status: "Listo",
              completed: true,
              empleado_id: empleadoLogueado.id,
              empleado_nombre: empleadoLogueado.nombre,
            });
          }
        }
      }

      if (itemsAgregados.length === 0) {
        mostrarToast(`Los servicios del Combo ${combo.label} ya están en el carrito`, "ok");
      } else {
        await onActualizarItemsOrden([...listaActual, ...itemsAgregados]);
        mostrarToast(`✓ Combo ${combo.label} aplicado (+${itemsAgregados.length} servicio(s))`, "ok");
      }
      setMostrarCombos(false);
    } catch {
      mostrarToast("Error al aplicar combo", "err");
    }
  };

  // Guardar configuración administrativa si se abre modal
  const handleSaveConfigAdmin = async (updatedConfig: CarWashConfigData) => {
    const res = await fetch("/api/taller/carwash", {
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
    const res = await fetch("/api/taller/carwash", {
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
    const res = await fetch(`/api/taller/carwash?id=${encodeURIComponent(id)}&type=service`, {
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

  if (!mounted || (loading && !config)) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 text-center space-y-3 animate-pulse">
        <div className="text-3xl">🚿</div>
        <p className="text-sm font-normal text-zinc-700 dark:text-zinc-300">
          Cargando catálogo de Car Wash y tarifas...
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
          onClick={() => void fetchCarWashData()}
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
          0. FILA SUPERIOR DE ACCESOS RÁPIDOS (⚡ Repetir, 🧽 Estado, ⚡ Combo)
          ===================================================================== */}
      <div className="space-y-2 rounded-2xl bg-zinc-50/80 dark:bg-black/20 p-2 sm:p-2.5 border border-zinc-200/80 dark:border-white/10 shadow-2xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* ⚡ Repetir */}
          <button
            type="button"
            onClick={handleRepetirUltimoServicio}
            className="flex-1 h-8 sm:h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs whitespace-nowrap"
            title="Cargar el último servicio realizado a este vehículo"
          >
            <span>⚡</span>
            <span>Repetir</span>
          </button>

          {/* 🧽 Estado */}
          <button
            type="button"
            onClick={() => {
              setMostrarEstado((prev) => !prev);
            }}
            className={`flex-1 h-8 sm:h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs whitespace-nowrap ${
              mostrarEstado
                ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                : "border-zinc-200 dark:border-white/10 bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-800 dark:text-zinc-200"
            }`}
            title="Recepción rápida de estado del vehículo en lavadora"
          >
            <span>🧽</span>
            <span>Estado</span>
            <span className="text-[10px] opacity-75">{mostrarEstado ? "▲" : "▼"}</span>
          </button>

          {/* ⚡ Combo */}
          <button
            type="button"
            onClick={() => {
              setMostrarCombos((prev) => !prev);
            }}
            className={`flex-1 h-8 sm:h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs whitespace-nowrap ${
              mostrarCombos
                ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                : "border-zinc-200 dark:border-white/10 bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-800 dark:text-zinc-200"
            }`}
            title="Combos de servicios rápidos"
          >
            <span>⚡</span>
            <span>Combo</span>
            <span className="text-[10px] opacity-75">{mostrarCombos ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Despliegue de 🧽 Estado (Lodo, Pelos, Manchas, Gotaseca, Objetos, 📷) */}
        {mostrarEstado && (
          <div className="pt-2 border-t border-zinc-200/80 dark:border-white/10 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 px-0.5">
              <span className="font-semibold uppercase tracking-wider">Recepción en Lavadora</span>
              <span>Gris: Normal • Amarillo: Moderado • Rojo: Extremo</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {(["Lodo", "Pelos", "Manchas", "Gotaseca"] as const).map((clave) => {
                const niv = estadoAfecciones[clave] || "NORMAL";
                return (
                  <button
                    key={clave}
                    type="button"
                    onClick={() => handleCiclarEstadoAfeccion(clave)}
                    className={`h-8 sm:h-8.5 px-2 rounded-lg border text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs whitespace-nowrap ${
                      niv === "EXTREMO"
                        ? "bg-rose-100 dark:bg-rose-500/25 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-400/50 font-bold shadow-xs"
                        : niv === "MODERADO"
                        ? "bg-amber-100 dark:bg-amber-500/25 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-400/50 font-semibold shadow-xs"
                        : "bg-white dark:bg-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 font-medium"
                    }`}
                  >
                    <span>{clave}</span>
                    {niv === "EXTREMO" && <span className="text-[10px]">🚨</span>}
                    {niv === "MODERADO" && <span className="text-[10px]">⚠️</span>}
                  </button>
                );
              })}

              {/* Objetos */}
              <button
                type="button"
                onClick={() => {
                  const nuevo = !objetosVerificados;
                  setObjetosVerificados(nuevo);
                  if (nuevo) {
                    mostrarToast("✓ Pertenencias verificadas en cabina y baúl", "ok");
                  }
                }}
                className={`h-8 sm:h-8.5 px-2 rounded-lg border text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs whitespace-nowrap ${
                  objetosVerificados
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/30 font-semibold shadow-xs"
                    : "bg-white dark:bg-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 font-medium"
                }`}
                title="Marcar verificación de objetos personales"
              >
                {objetosVerificados && <span>✓</span>}
                <span>Objetos</span>
              </button>

              {/* 📷 Foto R2 */}
              <button
                type="button"
                disabled={subiendoFoto}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 sm:h-8.5 px-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs whitespace-nowrap disabled:opacity-50"
                title="Tomar o subir foto de recepción"
              >
                <span>📷</span>
                <span>{subiendoFoto ? "..." : fotosEstado.length > 0 ? `(${fotosEstado.length})` : "Foto"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleSubirFotoEstado}
              />
            </div>

            {/* Mini preview de fotos guardadas */}
            {fotosEstado.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                {fotosEstado.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Recepción ${i + 1}`}
                    className="w-8 h-8 rounded-lg object-cover border border-zinc-300 dark:border-white/20 shrink-0"
                  />
                ))}
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                  ✓ {fotosEstado.length} foto(s) de estado
                </span>
              </div>
            )}
          </div>
        )}

        {/* Despliegue de ⚡ Combo (Exprés, Completo, Interior, Brillo) */}
        {mostrarCombos && (
          <div className="pt-2 border-t border-zinc-200/80 dark:border-white/10 space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 px-0.5">
              <span className="font-semibold uppercase tracking-wider">Combos de Lavado en 1 toque</span>
              <span>Marca servicios automáticamente en el pedido</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CARWASH_COMBOS.map((combo) => (
                <button
                  key={combo.id}
                  type="button"
                  onClick={() => void handleAplicarCombo(combo)}
                  className="h-8.5 sm:h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs whitespace-nowrap"
                >
                  <span className="text-sm leading-none">{combo.icon}</span>
                  <span>{combo.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          1. CATEGORÍAS PRINCIPALES CONTRAÍBLES
          ===================================================================== */}
      <div className="space-y-2 rounded-2xl bg-zinc-50/80 dark:bg-black/20 p-2.5 sm:p-3 border border-zinc-200/80 dark:border-white/10 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {mostrarCategorias ? (
            <>
              {CARWASH_CATEGORIES.map((cat) => {
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
                    className={`flex-1 min-w-[95px] sm:min-w-[115px] h-9 sm:h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
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

        {/* =====================================================================
            SUBCATEGORÍAS CONTRAÍBLES
            ===================================================================== */}
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
          2. BUSCADOR + SELECTOR CONTRAÍBLE DE PORTE DE VEHÍCULO
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
              placeholder="Buscar servicio o producto..."
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

          {/* Selector contraíble de porte / tamaño de vehículo */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hidden lg:inline-block">
              Porte:
            </span>
            {mostrarVehiculos ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {VEHICULOS_CARWASH.map((v) => {
                  const sel = vehiculoActivo === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehiculoActivo(v.id);
                        setSelectedVehicleTypeId(v.vehicleTypeId);
                        setMostrarVehiculos(false);
                      }}
                      className={`h-9 sm:h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
                        sel
                          ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                          : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      <span className="text-sm leading-none shrink-0">{v.icon}</span>
                      <span>{v.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMostrarVehiculos(true)}
                aria-label="Desplegar porte de vehículo"
                className="h-9 sm:h-10 px-3.5 rounded-xl border bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap"
                title="Cambiar porte de vehículo"
              >
                <span className="text-sm leading-none shrink-0">{vehiculoSeleccionadoObj.icon}</span>
                <span>{vehiculoSeleccionadoObj.label}</span>
                <span className="text-[10px] opacity-75">▾</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. CUADRÍCULA DE SERVICIOS Y PRODUCTOS DEL POS
          ===================================================================== */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-2xs">
        {itemsFiltrados.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 space-y-2">
            <span className="text-3xl block">🔍</span>
            <p className="text-sm">No se encontraron servicios ni productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-3.5 gap-x-3.5">
            {itemsFiltrados.map((item) => {
              const qtyEnPedido = obtenerCantidadEnPedido(item);
              const estaEnPedido = qtyEnPedido > 0;

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={() => {
                    void handleAjustarCantidadItem(item, 1);
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
                      +{qtyEnPedido}
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

                  {/* Una sola palabra clave en letra grande y negrita */}
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
          4. BARRA INFERIOR FIJA CON TIEMPO ESTIMADO Y TOTAL
          ===================================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border-t sm:border border-zinc-200 dark:border-white/15 shadow-xl sm:rounded-2xl sm:bottom-3 sm:inset-x-4 sm:max-w-6xl sm:mx-auto pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-400/40 flex items-center justify-center text-base sm:text-lg shrink-0">
            🚿
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white block truncate">
                {totalUnidadesCarWash} {totalUnidadesCarWash === 1 ? "servicio" : "servicios"}
              </span>
              {totalMinutosEstimados > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 text-[11px] sm:text-xs font-semibold tabular-nums">
                  ⏱️ {totalMinutosEstimados} min
                </span>
              )}
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 block tabular-nums mt-0.5">
              Total: ${totalMontoCarWash.toFixed(2)}
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
      {detailModalItem && config && (
        <ModalDetalleServicioCarWash
          item={detailModalItem.item}
          kind={detailModalItem.kind}
          config={config}
          selectedVehicleTypeId={selectedVehicleTypeId}
          isSelected={false}
          selectedAddonIds={[]}
          onToggleSelect={() => {}}
          onToggleAddon={() => {}}
          onEditItem={() => {
            if (detailModalItem.kind === "SERVICE") {
              const srv = detailModalItem.item as CarWashEnrichedService;
              setDetailModalItem(null);
              setServiceFormModal({ open: true, service: srv });
            } else {
              setDetailModalItem(null);
              setConfigModalOpen(true);
            }
          }}
          onClose={() => setDetailModalItem(null)}
        />
      )}

      {serviceFormModal.open && config && (
        <ModalServicioCarWashForm
          initialService={serviceFormModal.service}
          config={config}
          onSave={handleSaveServiceAdmin}
          onDelete={handleDeleteServiceAdmin}
          onClose={() => setServiceFormModal({ open: false, service: null })}
          mostrarToast={mostrarToast}
        />
      )}

      {configModalOpen && config && (
        <ModalConfiguracionCarWash
          config={config}
          onSaveConfig={handleSaveConfigAdmin}
          onClose={() => setConfigModalOpen(false)}
          mostrarToast={mostrarToast}
        />
      )}
    </div>
  );
}
