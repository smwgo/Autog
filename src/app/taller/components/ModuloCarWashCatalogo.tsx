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
  { match: /vapor\s*motor|motor/i, keyword: "VAPOR MOTOR" },
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
  if (vehicleTypeId === "vt_suv") multiplier = 1.0;
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


// Ilustraciones gráficas estilizadas SVG que replican exactamente el diseño Bento de Car Wash
function CarWashIllustration({ keyword }: { keyword: string }) {
  const kw = (keyword || "").toUpperCase();
  if (kw === "EXPRÉS" || kw === "EXPRES") {
    return (
      <svg viewBox="0 0 100 80" className="w-20 h-16 sm:w-24 sm:h-20 select-none drop-shadow-sm transition-transform group-hover:scale-105">
        <defs>
          <linearGradient id="cwFoamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>
        <path
          d="M 22 55 C 14 55, 10 46, 16 38 C 12 28, 24 18, 35 24 C 42 12, 60 12, 66 22 C 78 16, 88 26, 84 38 C 92 46, 86 55, 78 55 Z"
          fill="url(#cwFoamGrad)"
          stroke="#38bdf8"
          strokeWidth="2"
        />
        <circle cx="36" cy="38" r="8" fill="#ffffff" opacity="0.6" />
        <circle cx="56" cy="34" r="10" fill="#ffffff" opacity="0.5" />
        <circle cx="68" cy="44" r="6" fill="#ffffff" opacity="0.6" />
        <circle cx="26" cy="46" r="5" fill="#ffffff" opacity="0.5" />
        <circle cx="20" cy="20" r="3" fill="#bae6fd" stroke="#38bdf8" strokeWidth="1" />
        <circle cx="78" cy="18" r="4" fill="#bae6fd" stroke="#38bdf8" strokeWidth="1" />
        <circle cx="86" cy="28" r="2.5" fill="#bae6fd" stroke="#38bdf8" strokeWidth="1" />
        <path d="M 50 16 L 52 20 L 56 22 L 52 24 L 50 28 L 48 24 L 44 22 L 48 20 Z" fill="#facc15" />
        <path d="M 74 36 L 75 38 L 77 39 L 75 40 L 74 42 L 73 40 L 71 39 L 73 38 Z" fill="#facc15" />
      </svg>
    );
  }
  if (kw === "GRAFITADO") {
    return (
      <svg viewBox="0 0 100 80" className="w-20 h-16 sm:w-24 sm:h-20 select-none drop-shadow-sm transition-transform group-hover:scale-105">
        <rect x="18" y="24" width="6" height="52" rx="1.5" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        <rect x="76" y="24" width="6" height="52" rx="1.5" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
        <rect x="14" y="72" width="14" height="4" rx="1" fill="#0369a1" />
        <rect x="72" y="72" width="14" height="4" rx="1" fill="#0369a1" />
        <rect x="22" y="44" width="56" height="4" rx="1" fill="#eab308" />
        <path d="M 28 42 C 28 36, 34 32, 42 30 L 58 30 C 66 32, 72 36, 72 42 Z" fill="#475569" />
        <circle cx="34" cy="42" r="5" fill="#1e293b" />
        <circle cx="66" cy="42" r="5" fill="#1e293b" />
        <path d="M 44 68 L 47 48" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
        <path d="M 50 68 L 50 47" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="2 2" />
        <path d="M 56 68 L 53 48" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
        <path d="M 82 12 L 76 20" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
        <path d="M 74 20 L 78 22" stroke="#0284c7" strokeWidth="2" />
        <path d="M 72 24 L 62 34" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    );
  }
  if (kw === "COMPLETO") {
    return (
      <svg viewBox="0 0 100 80" className="w-20 h-16 sm:w-24 sm:h-20 select-none drop-shadow-sm transition-transform group-hover:scale-105">
        <rect x="15" y="16" width="70" height="50" rx="8" fill="#1e293b" />
        <path d="M 25 52 C 25 38, 35 32, 50 32 C 65 32, 75 38, 75 52 Z" fill="#94a3b8" />
        <circle cx="35" cy="52" r="5" fill="#0f172a" />
        <circle cx="65" cy="52" r="5" fill="#0f172a" />
        <path d="M 38 34 C 42 28, 58 28, 62 34 Z" fill="#ffffff" opacity="0.9" />
        <circle cx="20" cy="38" r="3.5" fill="#38bdf8" />
        <rect x="18" y="42" width="5" height="12" rx="2" fill="#0284c7" />
        <circle cx="80" cy="38" r="3.5" fill="#38bdf8" />
        <rect x="77" y="42" width="5" height="12" rx="2" fill="#0284c7" />
      </svg>
    );
  }
  if (kw === "VAPOR MOTOR" || kw === "MOTOR") {
    return (
      <svg viewBox="0 0 100 80" className="w-20 h-16 sm:w-24 sm:h-20 select-none drop-shadow-sm transition-transform group-hover:scale-105">
        <rect x="22" y="32" width="56" height="34" rx="4" fill="#334155" stroke="#475569" strokeWidth="1.5" />
        <rect x="30" y="26" width="40" height="8" rx="2" fill="#64748b" />
        <circle cx="36" cy="48" r="7" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1" />
        <circle cx="64" cy="48" r="7" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1" />
        <path d="M 34 22 C 34 16, 40 14, 40 8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M 50 22 C 50 14, 56 12, 56 6" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
        <path d="M 64 22 C 64 16, 70 14, 70 8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
    );
  }
  if (kw === "TAPICERÍA" || kw === "TAPICERIA") {
    return (
      <svg viewBox="0 0 100 80" className="w-20 h-16 sm:w-24 sm:h-20 select-none drop-shadow-sm transition-transform group-hover:scale-105">
        <rect x="20" y="20" width="26" height="36" rx="6" fill="#78350f" stroke="#92400e" strokeWidth="1.5" />
        <rect x="18" y="52" width="30" height="14" rx="4" fill="#92400e" />
        <rect x="25" y="14" width="16" height="8" rx="3" fill="#b45309" />
        <rect x="54" y="20" width="26" height="36" rx="6" fill="#78350f" stroke="#92400e" strokeWidth="1.5" />
        <rect x="52" y="52" width="30" height="14" rx="4" fill="#92400e" />
        <rect x="59" y="14" width="16" height="8" rx="3" fill="#b45309" />
        <line x1="33" y1="24" x2="33" y2="48" stroke="#d97706" strokeWidth="1" strokeDasharray="2 1" />
        <line x1="67" y1="24" x2="67" y2="48" stroke="#d97706" strokeWidth="1" strokeDasharray="2 1" />
      </svg>
    );
  }
  if (kw === "FAROS") {
    return (
      <svg viewBox="0 0 100 80" className="w-20 h-16 sm:w-24 sm:h-20 select-none drop-shadow-sm transition-transform group-hover:scale-105">
        <path
          d="M 16 38 C 22 24, 60 22, 84 32 C 86 38, 76 56, 56 58 C 34 60, 16 52, 16 38 Z"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <circle cx="44" cy="42" r="10" fill="#38bdf8" opacity="0.8" />
        <circle cx="44" cy="42" r="6" fill="#ffffff" />
        <path d="M 60 36 C 68 36, 76 38, 80 40 L 74 46 C 70 44, 64 42, 58 42 Z" fill="#f59e0b" />
        <path d="M 32 26 L 33 30 L 37 31 L 33 32 L 32 36 L 31 32 L 27 31 L 31 30 Z" fill="#ffffff" />
        <path d="M 70 24 L 71 27 L 74 28 L 71 29 L 70 32 L 69 29 L 66 28 L 69 27 Z" fill="#facc15" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 80" className="w-20 h-16 sm:w-24 sm:h-20 select-none drop-shadow-sm">
      <circle cx="50" cy="40" r="22" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2" />
      <text x="50" y="47" fontSize="24" textAnchor="middle">🚿</text>
    </svg>
  );
}

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
    Lodo: "EXTREMO",
    Pelos: "MODERADO",
    Manchas: "NORMAL",
    Gotaseca: "NORMAL",
  });
  const [objetosVerificados, setObjetosVerificados] = useState<boolean>(true);
  const [comboSeleccionado, setComboSeleccionado] = useState<string>("Completo");
  const [menuCatAbierto, setMenuCatAbierto] = useState<boolean>(false);
  const [menuSubcatAbierto, setMenuSubcatAbierto] = useState<boolean>(false);
  const [menuPorteAbierto, setMenuPorteAbierto] = useState<boolean>(false);
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

  // =========================================================================
  // HELPERS Y ESTADOS PARA EL MODELO BENTO DE CAR WASH
  // =========================================================================
  const sugerenciaRecepcion = useMemo(() => {
    if (estadoAfecciones.Lodo === "EXTREMO" || estadoAfecciones.Lodo === "MODERADO") {
      return "Sugiere: + Grafitado ($12.00) o desengrase";
    }
    if (estadoAfecciones.Pelos === "EXTREMO" || estadoAfecciones.Pelos === "MODERADO") {
      return "Sugiere: + Tapicería ($25.00) o aspirado profundo";
    }
    if (estadoAfecciones.Manchas === "EXTREMO" || estadoAfecciones.Manchas === "MODERADO") {
      return "Sugiere: + Tapicería ($25.00)";
    }
    if (estadoAfecciones.Gotaseca === "EXTREMO" || estadoAfecciones.Gotaseca === "MODERADO") {
      return "Sugiere: + Gotaseca ($20.00) o pulido";
    }
    return "Sugiere: + Grafitado ($12.00) o desengrase";
  }, [estadoAfecciones]);

  // Pre-carga inicial automática para Car Wash (Exprés $8.00 + Grafitado $12.00 = $20.00 / 45 min)
  const autoCargaCarWashHecha = useRef(false);
  useEffect(() => {
    if (autoCargaCarWashHecha.current) return;
    if (!ordenActiva) return;
    if (itemsOrden && itemsOrden.length > 0) {
      autoCargaCarWashHecha.current = true;
      return;
    }
    const itemExpres = todosLosItemsPOS.find((s) => s.keyword === "EXPRÉS" || s.id.includes("expres"));
    const itemGrafitado = todosLosItemsPOS.find((s) => s.keyword === "GRAFITADO" || s.id.includes("grafitado"));
    const initialItems: any[] = [];
    if (itemExpres) {
      initialItems.push({
        id: `cw_${itemExpres.id}_init`,
        key: `cw_init_${itemExpres.id}`,
        serviceId: itemExpres.id,
        type: "SERVICE",
        category: "Lavado",
        cwCategoryId: "LAVADO",
        subCategory: "Car Wash",
        code: itemExpres.code || "CW-EXPRES",
        name: `${itemExpres.keyword} (${vehiculoActivo})`,
        brand: "Car Wash",
        presentation: `${itemExpres.durationMinutes || 15} min`,
        unitOfMeasure: "Servicio",
        price: itemExpres.price || 8.0,
        total: itemExpres.price || 8.0,
        qty: 1,
        estimatedMinutes: itemExpres.durationMinutes || 15,
        vehicleType: vehiculoActivo,
        status: "Listo",
        completed: true,
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      });
    }
    if (itemGrafitado) {
      initialItems.push({
        id: `cw_${itemGrafitado.id}_init`,
        key: `cw_init_${itemGrafitado.id}`,
        serviceId: itemGrafitado.id,
        type: "SERVICE",
        category: "Chasis",
        cwCategoryId: "CHASIS",
        subCategory: "Car Wash",
        code: itemGrafitado.code || "CW-GRAFITADO",
        name: `${itemGrafitado.keyword} (${vehiculoActivo})`,
        brand: "Car Wash",
        presentation: `${itemGrafitado.durationMinutes || 20} min`,
        unitOfMeasure: "Servicio",
        price: itemGrafitado.price || 12.0,
        total: itemGrafitado.price || 12.0,
        qty: 1,
        estimatedMinutes: itemGrafitado.durationMinutes || 20,
        vehicleType: vehiculoActivo,
        status: "Listo",
        completed: true,
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      });
    }
    if (initialItems.length > 0) {
      autoCargaCarWashHecha.current = true;
      void onActualizarItemsOrden(initialItems);
    }
  }, [ordenActiva, itemsOrden, onActualizarItemsOrden, vehiculoActivo, empleadoLogueado, todosLosItemsPOS]);

  const ESTADO_CIRCULOS_RECEPCION = useMemo(() => [
    {
      id: "Lodo" as const,
      label: "Lodo",
      sublabel: estadoAfecciones.Lodo === "EXTREMO" ? "Recargo" : estadoAfecciones.Lodo === "MODERADO" ? "Moderado" : "Normal",
      color: estadoAfecciones.Lodo === "EXTREMO" ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400/60" : estadoAfecciones.Lodo === "MODERADO" ? "bg-amber-400 text-white ring-2 ring-amber-300" : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10",
      sublabelColor: estadoAfecciones.Lodo === "EXTREMO" ? "text-rose-600 dark:text-rose-400 font-bold" : estadoAfecciones.Lodo === "MODERADO" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-zinc-500 dark:text-zinc-400 font-medium",
      badge: estadoAfecciones.Lodo === "EXTREMO" ? "⚠️" : null,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 2C8.5 2 6 4.5 6 7c0 1.2.5 2.3 1.2 3.1C5 11 3 13.5 3 16.5 3 20 6 22 10 22c2 0 4-.8 5.5-2.2C17 21 19 22 21 22c1.7 0 3-1.3 3-3 0-2.2-2.5-3.8-4-4.8 0-.4.1-.8.1-1.2 0-3.9-3.6-7-8.1-7zm-1 8c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm4 4c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm-6 2c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
        </svg>
      ),
    },
    {
      id: "Pelos" as const,
      label: "Pelos",
      sublabel: estadoAfecciones.Pelos === "EXTREMO" ? "Recargo" : estadoAfecciones.Pelos === "MODERADO" ? "Moderado" : "Normal",
      color: estadoAfecciones.Pelos === "EXTREMO" ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400/60" : estadoAfecciones.Pelos === "MODERADO" ? "bg-amber-400 text-white shadow-md shadow-amber-400/30 ring-2 ring-amber-300" : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10",
      sublabelColor: estadoAfecciones.Pelos === "EXTREMO" ? "text-rose-600 dark:text-rose-400 font-bold" : estadoAfecciones.Pelos === "MODERADO" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-zinc-500 dark:text-zinc-400 font-medium",
      badge: estadoAfecciones.Pelos === "EXTREMO" ? "⚠️" : null,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    },
    {
      id: "Manchas" as const,
      label: "Manchas",
      sublabel: estadoAfecciones.Manchas === "EXTREMO" ? "Recargo" : estadoAfecciones.Manchas === "MODERADO" ? "Moderado" : "Normal",
      color: estadoAfecciones.Manchas === "EXTREMO" ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400/60" : estadoAfecciones.Manchas === "MODERADO" ? "bg-amber-400 text-white ring-2 ring-amber-300" : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10",
      sublabelColor: estadoAfecciones.Manchas === "EXTREMO" ? "text-rose-600 dark:text-rose-400 font-bold" : estadoAfecciones.Manchas === "MODERADO" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-zinc-500 dark:text-zinc-400 font-medium",
      badge: null,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 3c-1.5 0-2.8.8-3.5 2C7.3 4.4 6 5.2 5.5 6.5 4.3 6.9 3.5 8 3.5 9.3c0 .8.3 1.5.8 2C3.5 12.3 3 13.6 3 15c0 3.3 2.7 6 6 6 1.2 0 2.3-.4 3.2-1 .7.6 1.7 1 2.8 1 2.8 0 5-2.2 5-5 0-.8-.2-1.5-.5-2.2 1.1-.9 1.8-2.2 1.8-3.8 0-2.8-2.2-5-5-5-.4 0-.8.1-1.2.2C14.4 3.9 13.3 3 12 3z" />
        </svg>
      ),
    },
    {
      id: "Gotaseca" as const,
      label: "Gotaseca",
      sublabel: estadoAfecciones.Gotaseca === "EXTREMO" ? "Recargo" : estadoAfecciones.Gotaseca === "MODERADO" ? "Moderado" : "Normal",
      color: estadoAfecciones.Gotaseca === "EXTREMO" ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400/60" : estadoAfecciones.Gotaseca === "MODERADO" ? "bg-amber-400 text-white ring-2 ring-amber-300" : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10",
      sublabelColor: estadoAfecciones.Gotaseca === "EXTREMO" ? "text-rose-600 dark:text-rose-400 font-bold" : estadoAfecciones.Gotaseca === "MODERADO" ? "text-amber-600 dark:text-amber-400 font-bold" : "text-zinc-500 dark:text-zinc-400 font-medium",
      badge: null,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      ),
    },
  ], [estadoAfecciones]);

  const labelCategoriaActiva = useMemo(() => {
    const cat = CARWASH_CATEGORIES.find((c) => c.id === categoriaActivaId);
    return cat ? `${cat.icon} ${cat.label}` : "🫧 Todo";
  }, [categoriaActivaId]);

  const labelSubcategoriaActiva = useMemo(() => {
    if (subcategoriaActivaId === "TODOS") return "🚿 Lavado";
    const sub = subcategoriasActivas.find((s) => s.id === subcategoriaActivaId);
    return sub ? `${sub.icon || "•"} ${sub.label}` : "🚿 Lavado";
  }, [subcategoriaActivaId, subcategoriasActivas]);

  const labelPorteActivo = useMemo(() => {
    return `${vehiculoSeleccionadoObj.icon} ${vehiculoSeleccionadoObj.label}`;
  }, [vehiculoSeleccionadoObj]);


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
          DISEÑO BENTO GRID (PC: 3 TARJETAS INTELIGENTES / MÓVIL: VISTA LIMPIA)
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-start">
        
        {/* ===================================================================
            TARJETA 1: RECEPCIÓN Y ESTADO (SUV)
            =================================================================== */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                Recepción y Estado ({vehiculoActivo})
              </h2>
            </div>

            {/* Vista compacta para móvil */}
            <div className="flex sm:hidden items-center justify-between p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-400/30 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🚗</span>
                <span className="text-xs font-black text-zinc-900 dark:text-white">{vehiculoActivo} Detectado</span>
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 font-mono">
                ⏱️ {totalMinutosEstimados > 0 ? `${totalMinutosEstimados} min` : "45 min"}
              </span>
            </div>

            {/* Detección automática de vehículo (Desktop) */}
            <div className="hidden sm:block p-3 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200/70 dark:border-white/5 text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                  {vehiculoActivo} Detectado
                </span>
                <span className="text-base sm:text-lg">🚗</span>
              </div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Auto-Servicio
              </div>
              <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                ⏱️ Est. {totalMinutosEstimados > 0 ? `${totalMinutosEstimados} min` : "45 min"}
              </div>
            </div>

            {/* Subtítulo Recepción Rápida */}
            <div className="text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-2.5 mb-1.5">
              Recepción Rápida
            </div>

            {/* Tablero de 6 íconos circulares de recepción */}
            <div className="grid grid-cols-3 gap-y-3 gap-x-2 place-items-center py-1">
              {ESTADO_CIRCULOS_RECEPCION.map((btn) => (
                <div key={btn.id} className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCiclarEstadoAfeccion(btn.id)}
                    className={`relative w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm ${btn.color}`}
                    title={`${btn.label}: Toca para cambiar nivel (Normal, Moderado, Extremo)`}
                  >
                    {btn.icon}
                    {btn.badge && (
                      <span className="absolute -top-1 -right-1 text-xs">{btn.badge}</span>
                    )}
                  </button>
                  <div className="text-center leading-tight">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      {btn.label}
                    </span>
                    <span className={`text-[10px] block ${btn.sublabelColor}`}>
                      {btn.sublabel}
                    </span>
                  </div>
                </div>
              ))}

              {/* Botón 5: Objetos */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const nuevo = !objetosVerificados;
                    setObjetosVerificados(nuevo);
                    if (nuevo) mostrarToast("✓ Pertenencias verificadas en cabina y baúl", "ok");
                  }}
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm ${
                    objetosVerificados
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/60"
                      : "bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/10"
                  }`}
                  title="Verificación de objetos personales en cabina"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <div className="text-center leading-tight">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                    Objetos
                  </span>
                  <span className={`text-[10px] font-bold block ${objetosVerificados ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                    {objetosVerificados ? "Ok" : "Revisar"}
                  </span>
                </div>
              </div>

              {/* Botón 6: Foto */}
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={subiendoFoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm bg-blue-100 hover:bg-blue-200/80 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-400/40"
                  title="Tomar o subir foto de recepción del vehículo"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <div className="text-center leading-tight">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                    Foto
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                    {subiendoFoto ? "..." : fotosEstado.length > 0 ? `(${fotosEstado.length})` : "R2"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleSubirFotoEstado}
                />
              </div>
            </div>
          </div>

          {/* Autoventa sugerida / conectada al POS */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-white/5 text-center">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate block">
              {sugerenciaRecepcion}
            </span>
          </div>
        </div>

        {/* ===================================================================
            TARJETA 2: ACCESOS RÁPIDOS Y COMBOS
            =================================================================== */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                Accesos Rápidos y Combos
              </h2>
            </div>

            {/* Botón principal Combo superior */}
            <button
              type="button"
              onClick={() => {
                const comboComp = CARWASH_COMBOS.find((c) => c.label === "Completo") || CARWASH_COMBOS[0];
                void handleAplicarCombo(comboComp);
                setComboSeleccionado("Completo");
              }}
              className="w-full h-11 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-400/40 text-blue-800 dark:text-blue-100 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-2xs hover:bg-blue-100/70"
            >
              <span>⚡</span>
              <span>Combo</span>
            </button>

            {/* Cuadrícula 2x2 de paquetes de lavado */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {CARWASH_COMBOS.map((combo) => {
                const activo = comboSeleccionado === combo.label;
                return (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() => {
                      setComboSeleccionado(combo.label);
                      void handleAplicarCombo(combo);
                    }}
                    className={`h-10 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 shadow-2xs ${
                      activo
                        ? "bg-blue-50 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100 ring-1 ring-blue-300 shadow-xs"
                        : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                    }`}
                  >
                    {activo && <span className="text-blue-600 dark:text-blue-300">✓</span>}
                    <span>{combo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botón inferior Repetir */}
          <div className="mt-3 pt-2">
            <button
              type="button"
              onClick={handleRepetirUltimoServicio}
              className="w-full h-10 rounded-xl bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 shadow-2xs"
              title="Cargar el último servicio realizado a este vehículo"
            >
              <span>⚡</span>
              <span>Repetir</span>
            </button>
          </div>
        </div>

        {/* ===================================================================
            TARJETA 3: CATÁLOGO CONTRAÍDO EN 1 SOLA LÍNEA (FILAS SUPERIORES)
            =================================================================== */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 p-3.5 sm:p-4 shadow-2xs space-y-3">
          {/* Fila de 3 píldoras desplegables contraíbles */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            {/* Píldora 1: Categoría */}
            <div className="relative flex-1 min-w-[90px]">
              <button
                type="button"
                onClick={() => {
                  setMenuCatAbierto((prev) => !prev);
                  setMenuSubcatAbierto(false);
                  setMenuPorteAbierto(false);
                }}
                className="w-full h-9 px-2.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100 text-xs font-bold flex items-center justify-between gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs truncate"
              >
                <span className="truncate">{labelCategoriaActiva}</span>
                <span className="text-[10px] opacity-75">▾</span>
              </button>
              {menuCatAbierto && (
                <div className="absolute top-11 left-0 z-40 w-44 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1 shadow-xl animate-fade-in space-y-0.5">
                  {CARWASH_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoriaActivaId(cat.id);
                        setSubcategoriaActivaId("TODOS");
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
                  setMenuPorteAbierto(false);
                }}
                className="w-full h-9 px-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 text-xs font-bold flex items-center justify-between gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs truncate"
              >
                <span className="truncate">{labelSubcategoriaActiva}</span>
                <span className="text-[10px] opacity-75">▾</span>
              </button>
              {menuSubcatAbierto && (
                <div className="absolute top-11 left-0 z-40 w-44 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1 shadow-xl animate-fade-in space-y-0.5 max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSubcategoriaActivaId("TODOS");
                      setMenuSubcatAbierto(false);
                    }}
                    className="w-full h-8 px-2.5 rounded-lg text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <span>✨</span>
                    <span>Todos</span>
                  </button>
                  {(subcategoriasActivas.length > 0 ? subcategoriasActivas : CARWASH_CATEGORIES[1].subcategories).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSubcategoriaActivaId(sub.id);
                        setMenuSubcatAbierto(false);
                      }}
                      className="w-full h-8 px-2.5 rounded-lg text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      {sub.icon && <span>{sub.icon}</span>}
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Píldora 3: Porte / Chasis */}
            <div className="relative flex-1 min-w-[85px]">
              <button
                type="button"
                onClick={() => {
                  setMenuPorteAbierto((prev) => !prev);
                  setMenuCatAbierto(false);
                  setMenuSubcatAbierto(false);
                }}
                className="w-full h-9 px-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 text-xs font-bold flex items-center justify-between gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs truncate"
              >
                <span className="truncate">{labelPorteActivo}</span>
                <span className="text-[10px] opacity-75">▾</span>
              </button>
              {menuPorteAbierto && (
                <div className="absolute top-11 right-0 z-40 w-36 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#1a1a1e] p-1 shadow-xl animate-fade-in space-y-0.5">
                  {VEHICULOS_CARWASH.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehiculoActivo(v.id);
                        setSelectedVehicleTypeId(v.vehicleTypeId);
                        setMenuPorteAbierto(false);
                      }}
                      className="w-full h-8 px-2.5 rounded-lg text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <span>{v.icon}</span>
                      <span>{v.label}</span>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-9 pl-8 pr-7 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-1 focus:ring-blue-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          CUADRÍCULA DE SERVICIOS Y PRODUCTOS DEL POS (OPCIONES LIMPIAS)
          ===================================================================== */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs">
        {itemsFiltrados.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 space-y-1.5">
            <span className="text-3xl block">🚿</span>
            <p className="text-xs sm:text-sm font-semibold">No se encontraron servicios ni productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-3.5">
            {itemsFiltrados.map((item) => {
              const qtyEnPedido = obtenerCantidadEnPedido(item);
              const estaEnPedido = qtyEnPedido > 0;

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={() => {
                    void handleAjustarCantidadItem(item, 1);
                  }}
                  className={`group relative flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] min-h-[175px] shadow-2xs ${
                    estaEnPedido
                      ? "bg-blue-50/70 dark:bg-blue-500/10 border-blue-400 dark:border-blue-400/50 ring-2 ring-blue-300/60 dark:ring-blue-400/30 shadow-xs"
                      : "bg-white hover:bg-zinc-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/40"
                  }`}
                >
                  {/* Botón restar "−" arriba a la izquierda */}
                  {estaEnPedido && (
                    <button
                      type="button"
                      aria-label="Restar 1"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAjustarCantidadItem(item, -1);
                      }}
                      className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-sm font-bold flex items-center justify-center shadow-xs active:scale-90 transition-all z-10 cursor-pointer"
                      title="Restar 1"
                    >
                      −
                    </button>
                  )}

                  {/* Contador verde arriba a la derecha */}
                  {estaEnPedido && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-emerald-500 text-white shadow-xs z-10">
                      +{qtyEnPedido}
                    </span>
                  )}

                  {/* Ilustración gráfica estilizada o foto */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0 mt-1">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.keyword}
                        className="w-full h-full object-contain rounded-xl"
                        loading="lazy"
                      />
                    ) : (
                      <CarWashIllustration keyword={item.keyword} />
                    )}
                  </div>

                  {/* Palabra clave en letra grande y negrita */}
                  <div className="w-full text-center mt-2 px-1">
                    <span className="text-sm sm:text-base font-black tracking-tight text-zinc-900 dark:text-white uppercase block truncate">
                      {item.keyword}
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300 mt-0.5 block tabular-nums">
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
          BARRA INFERIOR FIJA: TOTAL, TIEMPO ESTIMADO Y BOTÓN SIGUIENTE
          ===================================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border-t sm:border border-zinc-200 dark:border-white/15 shadow-xl sm:rounded-2xl sm:bottom-3 sm:inset-x-4 sm:max-w-6xl sm:mx-auto pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-400/40 flex items-center gap-2 shrink-0">
            <span className="text-base sm:text-lg">🛒</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200 font-mono">
              {totalUnidadesCarWash} {totalUnidadesCarWash === 1 ? "servicio" : "servicios"} | Total: ${totalMontoCarWash.toFixed(2)} · ⏱️ {totalMinutosEstimados > 0 ? `${totalMinutosEstimados} min` : "45 min"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onIrASiguiente || onIrAAvisoYFirma}
            className="h-10 sm:h-11 px-5 sm:px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
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
