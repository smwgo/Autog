"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";

// ============================================================================
// INTERFACES Y TIPOS OPERATIVOS
// ============================================================================
export interface OrderItem {
  id: string;
  type: "SERVICE" | "PART";
  category: string;
  code: string;
  name: string;
  price: number;
  qty: number;
  status: "Pendiente" | "En Proceso" | "Listo";
  productId?: string;
  imageUrl?: string | null;
  empleado_id?: string;
  empleado_nombre?: string;
}

export interface UnifiedOrder {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  vehicleId?: string | null;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone: string;
  clientIdDoc?: string;
  mechanic: string;
  status: string;
  progress: number;
  mileage: number | null;
  nextOilChangeKm: number | null;
  fuelLevel?: string;
  generalCondition?: string;
  receptionInventory?: string[];
  inspectionFindings?: InspectionFinding[];
  items: OrderItem[];
  receptionPhotos: string[];
  evidencePhotos: string[];
  notes: string;
  dateIn: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalCost: number;
  quoteNumber?: string | null;
  quoteStatus?: string;
  quoteToken?: string | null;
  quoteTaxRate?: number;
  quoteDiscount?: number;
  quoteDiscountType?: "PERCENT" | "FIXED" | string;
  quoteApprovedAt?: string | null;
  assignedTechnicians?: AssignedTechnician[];
  internalChat?: InternalChatMessage[];
  technicianHours?: TechnicianHourEntry[];
  clientEmail?: string;
  statusColor?: string;
  trackingPin?: string;
  customStatuses?: CustomOrderStatus[];
  statusHistory?: OrderStatusHistoryItem[];
  lastNotifiedAt?: string | null;
  lastNotifiedChannel?: string | null;
  deliveryChecklist?: DeliveryChecklistData;
  technicalReportText?: string;
  technicalReportUrl?: string | null;
  deliverySignatureUrl?: string | null;
  deliverySignedBy?: string;
  deliverySignedAt?: string | null;
  deliveryStatus?: string;
  payments?: OrderPaymentItem[];
  totalPaid?: number;
  balanceDue?: number;
  paymentGatewayUrl?: string;
  posRequestId?: string | null;
  stockDeducted?: boolean;
}

export interface DeliveryChecklistData {
  trabajosVerificados?: boolean;
  pertenenciasEntregadas?: boolean;
  repuestosMostrados?: boolean;
  vehiculoLimpio?: boolean;
  recibidoPorNombre?: string;
  recibidoPorDoc?: string;
  observacionesEntrega?: string;
}

export interface OrderPaymentItem {
  id: string;
  amount: number;
  method: string;
  reference: string;
  note?: string;
  date: string;
}

export interface CustomOrderStatus {
  id: string;
  name: string;
  color: "blue" | "amber" | "purple" | "sky" | "emerald" | "pink" | "rose";
  progress: number;
  isCustom?: boolean;
}

export interface OrderStatusHistoryItem {
  id: string;
  status: string;
  color: string;
  channel?: string | null;
  message?: string | null;
  createdAt: string;
}

export interface AssignedTechnician {
  name: string;
  notified: boolean;
  notifiedAt: string;
}

export interface InternalChatMessage {
  id: string;
  author: string;
  role: string;
  text?: string;
  audioUrl?: string;
  audioDurationSec?: number;
  photoUrl?: string;
  createdAt: string;
}

export interface TechnicianHourEntry {
  id: string;
  technician: string;
  hours: number;
  minutes: number;
  taskDescription: string;
  date: string;
}

export interface InspectionFinding {
  id: string;
  vista: "frontal" | "trasera" | "lateral_izq" | "lateral_der" | "superior";
  vistaLabel: string;
  x: number;
  y: number;
  zona: string;
  tipo: string;
  descripcion: string;
}

export interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  status: string;
  imageUrl: string | null;
}

export interface ServicePreset {
  code: string;
  name: string;
  price: number;
  subCategory: string;
  isFilterCheck?: boolean;
}

// ============================================================================
// CONSTANTES PARA FLOTANTE 06 (ETAPA 6: ESTADO Y AVISO)
// ============================================================================
const ESTADOS_ORDEN_DEFAULT: CustomOrderStatus[] = [
  { id: "st-1", name: "Recibido / En Diagnóstico", color: "blue", progress: 20 },
  { id: "st-2", name: "Esperando Aprobación", color: "purple", progress: 35 },
  { id: "st-3", name: "Esperando Repuestos", color: "amber", progress: 45 },
  { id: "st-4", name: "En Reparación", color: "sky", progress: 65 },
  { id: "st-5", name: "Control de Calidad / Lavado", color: "pink", progress: 85 },
  { id: "st-6", name: "Listo para Entregar", color: "emerald", progress: 100 },
  { id: "st-7", name: "Entregado", color: "emerald", progress: 100 },
];

const COLORES_ESTADO_ETAPA6: {
  id: CustomOrderStatus["color"];
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}[] = [
  {
    id: "blue",
    label: "Azul",
    bg: "bg-blue-500/20",
    border: "border-blue-500/40",
    text: "text-blue-300",
    dot: "bg-blue-400",
  },
  {
    id: "amber",
    label: "Ámbar",
    bg: "bg-amber-500/20",
    border: "border-amber-500/40",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  {
    id: "purple",
    label: "Morado",
    bg: "bg-purple-500/20",
    border: "border-purple-500/40",
    text: "text-purple-300",
    dot: "bg-purple-400",
  },
  {
    id: "sky",
    label: "Celeste",
    bg: "bg-sky-500/20",
    border: "border-sky-500/40",
    text: "text-sky-300",
    dot: "bg-sky-400",
  },
  {
    id: "emerald",
    label: "Esmeralda",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/40",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  {
    id: "pink",
    label: "Rosa",
    bg: "bg-pink-500/20",
    border: "border-pink-500/40",
    text: "text-pink-300",
    dot: "bg-pink-400",
  },
  {
    id: "rose",
    label: "Coral",
    bg: "bg-rose-500/20",
    border: "border-rose-500/40",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
];

function getEstiloColorEstado(colorId?: string) {
  return (
    COLORES_ESTADO_ETAPA6.find((c) => c.id === colorId) || COLORES_ESTADO_ETAPA6[1]
  );
}

// ============================================================================
// CONSTANTES DE RECEPCIÓN PARA FLOTANTE 02 (ETAPA 2: VEHÍCULO O EQUIPO)
// ============================================================================
const NIVELES_COMBUSTIBLE = [
  { id: "E (Vacío)", label: "E • Vacío", pct: 8, color: "bg-rose-500" },
  { id: "1/4", label: "1/4", pct: 25, color: "bg-amber-500" },
  { id: "1/2", label: "1/2 • Medio", pct: 50, color: "bg-blue-500" },
  { id: "3/4", label: "3/4", pct: 75, color: "bg-emerald-400" },
  { id: "F (Lleno)", label: "F • Lleno", pct: 100, color: "bg-emerald-500" },
];

const ESTADOS_GENERALES = [
  { id: "Excelente", label: "Excelente", desc: "Sin detalles visibles" },
  { id: "Bueno", label: "Bueno", desc: "Uso normal, buen estado" },
  { id: "Regular (Con detalles)", label: "Regular", desc: "Rayones o desgaste leve" },
  { id: "Con daños / Golpes", label: "Con daños", desc: "Abolladuras o golpes" },
];

const TESTIGOS_TABLERO = [
  "Check Engine",
  "ABS / Frenos",
  "Batería",
  "Presión de Aceite",
  "Airbag",
  "Temperatura",
];

const INVENTARIO_RECEPCION_ITEMS = [
  "Tarjeta de propiedad / Matrícula",
  "SOAT / Revisión técnica",
  "Llanta de repuesto",
  "Gata hidráulica y palanca",
  "Llave de ruedas / Cruz",
  "Triángulos / Conos de seguridad",
  "Botiquín de primeros auxilios",
  "Extintor",
  "Herramientas / Cables",
  "Radio / Pantalla táctil",
  "Pisos / Alfombras",
  "Tapacubos / Antena",
];

// ============================================================================
// CONSTANTES DE INSPECCIÓN PARA FLOTANTE 03 (ETAPA 3: 5 VISTAS DEL VEHÍCULO)
// ============================================================================
const VISTAS_INSPECCION: {
  id: "frontal" | "trasera" | "lateral_izq" | "lateral_der" | "superior";
  label: string;
  shortLabel: string;
  zonas: { nombre: string; x: number; y: number }[];
}[] = [
  {
    id: "frontal",
    label: "Vista Frontal",
    shortLabel: "Frontal",
    zonas: [
      { nombre: "Parabrisas delantero", x: 50, y: 26 },
      { nombre: "Capó delantero", x: 50, y: 48 },
      { nombre: "Faro delantero izquierdo", x: 24, y: 58 },
      { nombre: "Faro delantero derecho", x: 76, y: 58 },
      { nombre: "Parrilla central", x: 50, y: 62 },
      { nombre: "Parachoques delantero", x: 50, y: 76 },
    ],
  },
  {
    id: "trasera",
    label: "Vista Trasera",
    shortLabel: "Trasera",
    zonas: [
      { nombre: "Parabrisas trasero", x: 50, y: 26 },
      { nombre: "Maletera / Compuerta", x: 50, y: 50 },
      { nombre: "Faro posterior izquierdo", x: 24, y: 56 },
      { nombre: "Faro posterior derecho", x: 76, y: 56 },
      { nombre: "Parachoques trasero", x: 50, y: 75 },
      { nombre: "Tubo de escape / Difusor", x: 72, y: 84 },
    ],
  },
  {
    id: "lateral_izq",
    label: "Lateral Izquierdo (Conductor)",
    shortLabel: "Lat. Izquierdo",
    zonas: [
      { nombre: "Guardafango delantero izq.", x: 22, y: 56 },
      { nombre: "Llanta / Aro delantero izq.", x: 23, y: 74 },
      { nombre: "Espejo retrovisor izq.", x: 35, y: 42 },
      { nombre: "Puerta delantera izq.", x: 43, y: 56 },
      { nombre: "Puerta trasera izq.", x: 62, y: 56 },
      { nombre: "Guardafango trasero izq.", x: 80, y: 55 },
      { nombre: "Llanta / Aro trasero izq.", x: 77, y: 74 },
    ],
  },
  {
    id: "lateral_der",
    label: "Lateral Derecho (Copiloto)",
    shortLabel: "Lat. Derecho",
    zonas: [
      { nombre: "Guardafango trasero der.", x: 20, y: 55 },
      { nombre: "Llanta / Aro trasero der.", x: 23, y: 74 },
      { nombre: "Puerta trasera der.", x: 38, y: 56 },
      { nombre: "Puerta delantera der.", x: 57, y: 56 },
      { nombre: "Espejo retrovisor der.", x: 65, y: 42 },
      { nombre: "Guardafango delantero der.", x: 78, y: 56 },
      { nombre: "Llanta / Aro delantero der.", x: 77, y: 74 },
    ],
  },
  {
    id: "superior",
    label: "Vista Superior (Planta)",
    shortLabel: "Superior",
    zonas: [
      { nombre: "Capó (Vista superior)", x: 50, y: 20 },
      { nombre: "Parabrisas (Vista superior)", x: 50, y: 35 },
      { nombre: "Techo / Quemacocos", x: 50, y: 52 },
      { nombre: "Medallón trasero", x: 50, y: 70 },
      { nombre: "Tapa de maletera", x: 50, y: 84 },
    ],
  },
];

const TIPOS_HALLAZGO = [
  { id: "Rayón", color: "bg-amber-500 text-black border-amber-300" },
  { id: "Abolladura", color: "bg-orange-500 text-black border-orange-300" },
  { id: "Golpe", color: "bg-rose-500 text-white border-rose-300" },
  { id: "Fisura / Rotura", color: "bg-purple-500 text-white border-purple-300" },
  { id: "Desgaste", color: "bg-sky-500 text-black border-sky-300" },
  { id: "Observación", color: "bg-emerald-500 text-black border-emerald-300" },
];

// ============================================================================
// CATÁLOGO RÁPIDO DE LAS 7 TARJETAS (ESTÉTICA MINIMALISTA GLASSMORPHISM)
// ============================================================================
const SERVICE_CARDS = [
  {
    id: "lubricacion",
    title: "Lubricación y Filtros",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
    presets: [
      { code: "LUB-001", name: "Cambio de aceite de motor", price: 15.0, subCategory: "Lubricación" },
      { code: "LUB-002", name: "Cambio de aceite de caja", price: 20.0, subCategory: "Lubricación" },
      { code: "LUB-003", name: "Cambio de aceite de corona / diferencial", price: 18.0, subCategory: "Lubricación" },
      { code: "LUB-004", name: "Engrasado general de chasis", price: 12.0, subCategory: "Lubricación" },
      { code: "LUB-005", name: "Cambio / Relleno de refrigerante", price: 15.0, subCategory: "Lubricación" },
      { code: "FIL-001", name: "Check: Filtro de aceite", price: 8.0, subCategory: "Filtros", isFilterCheck: true },
      { code: "FIL-002", name: "Check: Filtro de aire", price: 10.0, subCategory: "Filtros", isFilterCheck: true },
      { code: "FIL-003", name: "Check: Filtro de cabina (A/C)", price: 12.0, subCategory: "Filtros", isFilterCheck: true },
      { code: "FIL-004", name: "Check: Filtro de combustible", price: 14.0, subCategory: "Filtros", isFilterCheck: true },
    ] as ServicePreset[],
  },
  {
    id: "alineacion",
    title: "Alineación y Balanceo",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      </svg>
    ),
    presets: [
      { code: "ALI-001", name: "Alineación computarizada (2 ruedas)", price: 20.0, subCategory: "Alineación" },
      { code: "ALI-002", name: "Alineación computarizada 3D (4 ruedas)", price: 30.0, subCategory: "Alineación" },
      { code: "BAL-001", name: "Balanceo por llanta", price: 5.0, subCategory: "Balanceo" },
      { code: "BAL-004", name: "Balanceo completo (4 ruedas)", price: 18.0, subCategory: "Balanceo" },
      { code: "ROT-001", name: "Rotación de llantas", price: 10.0, subCategory: "Balanceo" },
      { code: "CAM-001", name: "Corrección de camber / convergencia", price: 25.0, subCategory: "Alineación" },
    ] as ServicePreset[],
  },
  {
    id: "llantera",
    title: "Llantera e Inflado",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
      </svg>
    ),
    presets: [
      { code: "LLA-001", name: "Inflado de llantas (Aire)", price: 3.0, subCategory: "Inflado" },
      { code: "LLA-002", name: "Inflado de llantas (Nitrógeno)", price: 12.0, subCategory: "Inflado" },
      { code: "LLA-003", name: "Calibración electrónica de presión", price: 5.0, subCategory: "Inflado" },
      { code: "LLA-004", name: "Parchado al frío / Vulcanizado", price: 8.0, subCategory: "Reparación" },
      { code: "LLA-005", name: "Enllantaje / Desenllantaje", price: 10.0, subCategory: "Montaje" },
      { code: "LLA-006", name: "Cambio de válvulas", price: 6.0, subCategory: "Reparación" },
    ] as ServicePreset[],
  },
  {
    id: "lavado",
    title: "Lavado de Carro",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
        <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
      </svg>
    ),
    presets: [
      { code: "LAV-001", name: "Lavado express exterior", price: 8.0, subCategory: "Exterior" },
      { code: "LAV-002", name: "Lavado completo (interior + exterior)", price: 15.0, subCategory: "Completo" },
      { code: "LAV-003", name: "Lavado de motor y chasis", price: 22.0, subCategory: "Chasis y Motor" },
      { code: "LAV-004", name: "Aspirado profundo", price: 10.0, subCategory: "Interior" },
      { code: "LAV-005", name: "Pulverizado / Grafito en chasis", price: 14.0, subCategory: "Chasis y Motor" },
      { code: "LAV-006", name: "Limpieza profunda de tapicería", price: 35.0, subCategory: "Interior" },
    ] as ServicePreset[],
  },
  {
    id: "mecanica",
    title: "Mecánica Rápida",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    presets: [
      { code: "MEC-001", name: "Cambio de pastillas / zapatas de freno", price: 25.0, subCategory: "Frenos" },
      { code: "MEC-002", name: "Purga / Cambio de líquido de frenos", price: 15.0, subCategory: "Frenos" },
      { code: "MEC-003", name: "Diagnóstico / Cambio de batería", price: 10.0, subCategory: "Eléctrico" },
      { code: "MEC-004", name: "Cambio y calibración de bujías", price: 18.0, subCategory: "Motor" },
      { code: "MEC-005", name: "Amortiguadores / Suspensión", price: 40.0, subCategory: "Suspensión" },
      { code: "MEC-006", name: "Escáner automotriz OBD2", price: 20.0, subCategory: "Eléctrico" },
    ] as ServicePreset[],
  },
  {
    id: "repuestos",
    title: "Repuestos e Insumos",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    presets: [] as ServicePreset[],
  },
  {
    id: "otro",
    title: "Otro",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M17.5 14v7M14 17.5h7" />
      </svg>
    ),
    presets: [
      { code: "OTR-001", name: "Diagnóstico eléctrico general", price: 20.0, subCategory: "Diagnóstico" },
      { code: "OTR-002", name: "Revisión y carga de Aire Acondicionado (A/C)", price: 35.0, subCategory: "Climatización" },
      { code: "OTR-003", name: "Inspección pre-viaje de 35 puntos", price: 18.0, subCategory: "Diagnóstico" },
      { code: "OTR-004", name: "Soldadura / Reparación de escape", price: 25.0, subCategory: "Especial" },
      { code: "OTR-005", name: "Auxilio mecánico / Servicio externo", price: 30.0, subCategory: "Especial" },
      { code: "OTR-006", name: "Mano de obra adicional / Ajuste técnico", price: 15.0, subCategory: "Mano de Obra" },
    ] as ServicePreset[],
  },
];

function formatElapsedTime(startedAt: string | null, completedAt: string | null, nowTick: number): string {
  if (!startedAt) return "00:00:00";
  const startMs = new Date(startedAt).getTime();
  const endMs = completedAt ? new Date(completedAt).getTime() : nowTick;
  const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function TallerPanel() {
  const router = useRouter();

  // ==========================================================================
  // ESTADOS PRINCIPALES DE OPERACIÓN
  // ==========================================================================
  const [autosEnPista, setAutosEnPista] = useState<UnifiedOrder[]>([]);
  const [clientesCatalogo, setClientesCatalogo] = useState<any[]>([]);
  const [productosInventario, setProductosInventario] = useState<InventoryProduct[]>([]);
  const [serviciosDb, setServiciosDb] = useState<any[]>([]);
  const [mecanicos, setMecanicos] = useState<string[]>([
    "Hernan Marquez",
    "Carlos Rodríguez",
    "Luis Martínez",
    "Ana Torres",
    "Miguel Ángel",
  ]);
  const [cargandoInicial, setCargandoInicial] = useState(true);

  // ==========================================================================
  // FLOTANTE 01 - ETAPA 1: CLIENTE (DESACTIVADO AL INGRESAR EN MODO EMPLEADO)
  // ==========================================================================
  const [mostrarFlotanteEtapa1, setMostrarFlotanteEtapa1] = useState(false);
  const [etapa1TipoCliente, setEtapa1TipoCliente] = useState<"Persona" | "Empresa">("Persona");
  const [busquedaClienteEtapa1, setBusquedaClienteEtapa1] = useState("");
  const [buscandoClientesRemoto, setBuscandoClientesRemoto] = useState(false);
  const [clienteSeleccionadoEtapa1, setClienteSeleccionadoEtapa1] = useState<any | null>(null);
  const [modoFormularioClienteEtapa1, setModoFormularioClienteEtapa1] = useState(false);

  // Campos para crear o editar cliente nuevo sin salir de la orden
  const [etapa1Nombre, setEtapa1Nombre] = useState("");
  const [etapa1Ruc, setEtapa1Ruc] = useState("");
  const [etapa1Telefono, setEtapa1Telefono] = useState("");
  const [etapa1Email, setEtapa1Email] = useState("");
  const [etapa1PlacaOpcional, setEtapa1PlacaOpcional] = useState("");
  const [guardandoClienteEtapa1, setGuardandoClienteEtapa1] = useState(false);

  // Técnico asignado, Ingresado por y Motivo de ingreso en el mismo paso
  const [etapa1IngresadoPor, setEtapa1IngresadoPor] = useState("Gonzalo Rojas");
  const [etapa1Tecnico, setEtapa1Tecnico] = useState("Hernan Marquez");
  const [etapa1MotivoIngreso, setEtapa1MotivoIngreso] = useState("");
  const [creandoOrdenEtapa1, setCreandoOrdenEtapa1] = useState(false);

  // ==========================================================================
  // FLOTANTE 02 - ETAPA 2: VEHÍCULO O EQUIPO
  // (Kilometraje y combustible, Estado general, Inventario de lo que trae)
  // ==========================================================================
  const [mostrarFlotanteEtapa2, setMostrarFlotanteEtapa2] = useState(false);
  const [etapa2VehicleId, setEtapa2VehicleId] = useState<string | null>(null);
  const [etapa2TipoVehiculo, setEtapa2TipoVehiculo] = useState<
    "Auto" | "SUV" | "Camioneta" | "Moto" | "Camión / Maquinaria" | "Equipo"
  >("Auto");
  const [etapa2Placa, setEtapa2Placa] = useState("");
  const [etapa2Marca, setEtapa2Marca] = useState("");
  const [etapa2Modelo, setEtapa2Modelo] = useState("");
  const [etapa2Anio, setEtapa2Anio] = useState(String(new Date().getFullYear()));
  const [etapa2Color, setEtapa2Color] = useState("");
  const [etapa2Kilometraje, setEtapa2Kilometraje] = useState("");
  const [etapa2TipoCombustible, setEtapa2TipoCombustible] = useState("Gasolina");
  const [etapa2NivelCombustible, setEtapa2NivelCombustible] = useState("1/2");
  const [etapa2EstadoGeneral, setEtapa2EstadoGeneral] = useState("Bueno");
  const [etapa2Testigos, setEtapa2Testigos] = useState<string[]>([]);
  const [etapa2ObservacionesEstado, setEtapa2ObservacionesEstado] = useState("");
  const [etapa2InventarioTrae, setEtapa2InventarioTrae] = useState<string[]>([
    "Tarjeta de propiedad / Matrícula",
    "Llanta de repuesto",
    "Gata hidráulica y palanca",
    "Llave de ruedas / Cruz",
    "Pisos / Alfombras",
  ]);
  const [etapa2ObjetosValor, setEtapa2ObjetosValor] = useState("");
  const [guardandoEtapa2, setGuardandoEtapa2] = useState(false);

  // ==========================================================================
  // FLOTANTE 03 - ETAPA 3: INSPECCIÓN
  // (Cinco vistas del vehículo, Fotos como evidencia, PDF de inspección)
  // ==========================================================================
  const [mostrarFlotanteEtapa3, _setMostrarFlotanteEtapa3] = useState(false);
  const setMostrarFlotanteEtapa3 = (val: boolean) => { _setMostrarFlotanteEtapa3(val); if (val) setEtapaActiva(2); };
  const [etapa3VistaActiva, setEtapa3VistaActiva] = useState<
    "frontal" | "trasera" | "lateral_izq" | "lateral_der" | "superior"
  >("frontal");
  const [etapa3Hallazgos, setEtapa3Hallazgos] = useState<InspectionFinding[]>([]);
  const [etapa3HallazgoSeleccionadoId, setEtapa3HallazgoSeleccionadoId] = useState<string | null>(
    null
  );
  const [etapa3TipoHallazgoActual, setEtapa3TipoHallazgoActual] = useState("Rayón");
  const [etapa3DescripcionActual, setEtapa3DescripcionActual] = useState("");
  const [etapa3ZonaActual, setEtapa3ZonaActual] = useState("");
  const [etapa3NotasGenerales, setEtapa3NotasGenerales] = useState("");
  const [guardandoEtapa3, setGuardandoEtapa3] = useState(false);

  // ==========================================================================
  // FLOTANTE 04 - ETAPA 4: PRESUPUESTO
  // (Servicios y repuestos de tu catálogo, Impuestos y descuentos al instante, Aprobación con link)
  // ==========================================================================
  const [mostrarFlotanteEtapa4, _setMostrarFlotanteEtapa4] = useState(false);
  const setMostrarFlotanteEtapa4 = (val: boolean) => { _setMostrarFlotanteEtapa4(val); if (val) setEtapaActiva(3); };
  const [etapa4Items, setEtapa4Items] = useState<OrderItem[]>([]);
  const [etapa4TabCatalogo, setEtapa4TabCatalogo] = useState<
    "MAS_USADOS" | "SERVICIOS" | "REPUESTOS" | "MANUAL"
  >("MAS_USADOS");
  const [etapa4BusquedaCatalogo, setEtapa4BusquedaCatalogo] = useState("");
  const [etapa4TaxRate, setEtapa4TaxRate] = useState<string>("15");
  const [etapa4Discount, setEtapa4Discount] = useState<string>("0");
  const [etapa4DiscountType, setEtapa4DiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [etapa4QuoteStatus, setEtapa4QuoteStatus] = useState<string>("Pendiente de Aprobación");
  const [etapa4NotasPresupuesto, setEtapa4NotasPresupuesto] = useState<string>("");
  const [etapa4ManualNombre, setEtapa4ManualNombre] = useState<string>("");
  const [etapa4ManualPrecio, setEtapa4ManualPrecio] = useState<string>("");
  const [etapa4ManualTipo, setEtapa4ManualTipo] = useState<"SERVICE" | "PART">("SERVICE");
  const [guardandoEtapa4, setGuardandoEtapa4] = useState(false);
  const [copiadoLinkPresupuesto, setCopiadoLinkPresupuesto] = useState(false);

  // ==========================================================================
  // FLOTANTE 05 - ETAPA 5: REPARACIÓN
  // (Múltiples técnicos con aviso, Fotos del avance, Notas de voz y chat interno, Horas por técnico)
  // ==========================================================================
  const [mostrarFlotanteEtapa5, _setMostrarFlotanteEtapa5] = useState(false);
  const setMostrarFlotanteEtapa5 = (val: boolean) => { _setMostrarFlotanteEtapa5(val); if (val) setEtapaActiva(4); };
  const [etapa5TecnicosAsignados, setEtapa5TecnicosAsignados] = useState<AssignedTechnician[]>([
    { name: "Hernan Marquez", notified: true, notifiedAt: new Date().toISOString() },
  ]);
  const [etapa5ChatMensajes, setEtapa5ChatMensajes] = useState<InternalChatMessage[]>([]);
  const [etapa5ChatAutor, setEtapa5ChatAutor] = useState<string>("Hernan Marquez");
  const [etapa5ChatTexto, setEtapa5ChatTexto] = useState<string>("");
  const [grabandoAudioEtapa5, setGrabandoAudioEtapa5] = useState<boolean>(false);
  const [segundosGrabacionAudio, setSegundosGrabacionAudio] = useState<number>(0);
  const [subiendoAudioEtapa5, setSubiendoAudioEtapa5] = useState<boolean>(false);
  const [etapa5HorasRegistros, setEtapa5HorasRegistros] = useState<TechnicianHourEntry[]>([]);
  const [etapa5HoraTecnico, setEtapa5HoraTecnico] = useState<string>("Hernan Marquez");
  const [etapa5HoraCantHoras, setEtapa5HoraCantHoras] = useState<string>("1");
  const [etapa5HoraCantMinutos, setEtapa5HoraCantMinutos] = useState<string>("0");
  const [etapa5HoraTarea, setEtapa5HoraTarea] = useState<string>("");
  const [guardandoEtapa5, setGuardandoEtapa5] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerGrabacionRef = useRef<any>(null);

  // ==========================================================================
  // FLOTANTE 06 - ETAPA 6: ESTADO Y AVISO
  // (Estados con nombre y color a elección, Aviso WhatsApp/Correo en 1 clic, Seguimiento en línea con orden y PIN)
  // ==========================================================================
  const [mostrarFlotanteEtapa6, _setMostrarFlotanteEtapa6] = useState(false);
  const setMostrarFlotanteEtapa6 = (val: boolean) => { _setMostrarFlotanteEtapa6(val); if (val) setEtapaActiva(5); };
  const [etapa6EstadosLista, setEtapa6EstadosLista] = useState<CustomOrderStatus[]>(
    ESTADOS_ORDEN_DEFAULT
  );
  const [etapa6EstadoSeleccionado, setEtapa6EstadoSeleccionado] = useState<string>("En Reparación");
  const [etapa6ColorSeleccionado, setEtapa6ColorSeleccionado] =
    useState<CustomOrderStatus["color"]>("sky");
  const [etapa6ProgresoSeleccionado, setEtapa6ProgresoSeleccionado] = useState<number>(65);
  const [etapa6NuevoEstadoNombre, setEtapa6NuevoEstadoNombre] = useState<string>("");
  const [etapa6NuevoEstadoColor, setEtapa6NuevoEstadoColor] =
    useState<CustomOrderStatus["color"]>("emerald");
  const [etapa6TrackingPin, setEtapa6TrackingPin] = useState<string>("4821");
  const [etapa6ClienteTelefono, setEtapa6ClienteTelefono] = useState<string>("");
  const [etapa6ClienteEmail, setEtapa6ClienteEmail] = useState<string>("");
  const [etapa6MensajeAviso, setEtapa6MensajeAviso] = useState<string>("");
  const [guardandoEtapa6, setGuardandoEtapa6] = useState<boolean>(false);
  const [copiadoLinkSeguimiento, setCopiadoLinkSeguimiento] = useState<boolean>(false);

  // ==========================================================================
  // FLOTANTE 07 - ETAPA 7: ENTREGA Y FIRMA
  // (Entrega en 3 pasos: Detalle de entrega, Informe técnico, Firma en taller o remota)
  // ==========================================================================
  const [mostrarFlotanteEtapa7, _setMostrarFlotanteEtapa7] = useState<boolean>(false);
  const setMostrarFlotanteEtapa7 = (val: boolean) => { _setMostrarFlotanteEtapa7(val); if (val) setEtapaActiva(6); };
  const [etapa7Checklist, setEtapa7Checklist] = useState<DeliveryChecklistData>({
    trabajosVerificados: true,
    pertenenciasEntregadas: true,
    repuestosMostrados: true,
    vehiculoLimpio: true,
    recibidoPorNombre: "",
    recibidoPorDoc: "",
    observacionesEntrega: "",
  });
  const [etapa7InformeTecnico, setEtapa7InformeTecnico] = useState<string>("");
  const [etapa7InformeAdjuntoUrl, setEtapa7InformeAdjuntoUrl] = useState<string | null>(null);
  const [subiendoInformeEtapa7, setSubiendoInformeEtapa7] = useState<boolean>(false);
  const [etapa7FirmaDataUrl, setEtapa7FirmaDataUrl] = useState<string | null>(null);
  const [etapa7FirmadoPor, setEtapa7FirmadoPor] = useState<string>("");
  const [guardandoEtapa7, setGuardandoEtapa7] = useState<boolean>(false);
  const [copiadoLinkFirmaEtapa7, setCopiadoLinkFirmaEtapa7] = useState<boolean>(false);
  const canvasFirmaEtapa7Ref = useRef<HTMLCanvasElement | null>(null);
  const dibujandoFirmaEtapa7Ref = useRef<boolean>(false);
  const tieneTrazosFirmaEtapa7Ref = useRef<boolean>(false);

  // Bloque 1: Buscador por Placa/Cédula y Vehículo Encontrado / Registro Express
  const [searchQuery, setSearchQuery] = useState("");
  const [buscandoVehiculo, setBuscandoVehiculo] = useState(false);
  const [vehiculoEncontrado, setVehiculoEncontrado] = useState<any | null>(null);
  const [clienteEncontrado, setClienteEncontrado] = useState<any | null>(null);
  const [historialVehiculo, setHistorialVehiculo] = useState<any[]>([]);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarRegistroExpress, setMostrarRegistroExpress] = useState(false);

  // Inputs de recepción rápida cuando el vehículo ya existe
  const [kmActualInput, setKmActualInput] = useState("");
  const [fotosRecepcion, setFotosRecepcion] = useState<string[]>([]);
  const [subiendoFotoRecepcion, setSubiendoFotoRecepcion] = useState(false);

  // Formulario Registro Express (2 columnas)
  const [regCedula, setRegCedula] = useState("");
  const [regNombres, setRegNombres] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPlaca, setRegPlaca] = useState("");
  const [regTipoVehiculo, setRegTipoVehiculo] = useState<"Auto" | "SUV" | "Camioneta" | "Moto">("Auto");
  const [regMarca, setRegMarca] = useState("");
  const [regModelo, setRegModelo] = useState("");
  const [regAnio, setRegAnio] = useState(String(new Date().getFullYear()));
  const [regColor, setRegColor] = useState("");
  const [regKilometraje, setRegKilometraje] = useState("");
  const [guardandoExpress, setGuardandoExpress] = useState(false);

  // Flujo Deslizable Automático de 8 Etapas (Slide-Over Carousel)
  const [etapaActiva, setEtapaActiva] = useState<number>(0);
  const [rolUsuario, setRolUsuario] = useState<"EMPLEADO" | "OFICINA">("EMPLEADO");
  const [cronometroTecnicoActivo, setCronometroTecnicoActivo] = useState(false);
  const [cronometroTecnicoSegundos, setCronometroTecnicoSegundos] = useState(0);

  // Estados para Etapa 8: Cobro, Abonos, Pasarela y Documentos
  const [etapa8AbonoMonto, setEtapa8AbonoMonto] = useState("");
  const [etapa8AbonoMetodo, setEtapa8AbonoMetodo] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "LINK_PAGO">("EFECTIVO");
  const [etapa8AbonoReferencia, setEtapa8AbonoReferencia] = useState("");
  const [etapa8RegistrandoPago, setEtapa8RegistrandoPago] = useState(false);
  const [copiadoLinkPagoEtapa8, setCopiadoLinkPagoEtapa8] = useState(false);
  const [modalImpresionDoc, setModalImpresionDoc] = useState<"PDF" | "TICKET" | "ETIQUETA_QR" | null>(null);

  // Compatibilidad con pasoDeslizable
  const pasoDeslizable = etapaActiva <= 1 ? 0 : etapaActiva === 2 ? 1 : 2;
  const setPasoDeslizable = (p: 0 | 1 | 2) => {
    if (p === 0) setEtapaActiva(1);
    else if (p === 1) setEtapaActiva(3);
    else setEtapaActiva(4);
  };

  // Cronómetro en vivo de horas por técnico
  useEffect(() => {
    let interval: any = null;
    if (cronometroTecnicoActivo) {
      interval = setInterval(() => {
        setCronometroTecnicoSegundos((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cronometroTecnicoActivo]);

  // Fase 2: Login / Sesión de Empleado Activo para que múltiples empleados sumen servicios a la misma #OT
  const [empleadoLogueado, setEmpleadoLogueado] = useState<{ id: string; nombre: string }>({
    id: "emp-carlos-rodriguez",
    nombre: "Carlos Rodríguez",
  });

  useEffect(() => {
    try {
      const savedEmp = localStorage.getItem("taller_empleado_activo");
      if (savedEmp) {
        const parsed = JSON.parse(savedEmp);
        if (parsed?.id && parsed?.nombre) {
          setEmpleadoLogueado(parsed);
          return;
        }
      }
      const userProfileRaw = localStorage.getItem("user_profile");
      if (userProfileRaw) {
        const parsedUser = JSON.parse(userProfileRaw);
        const nombre = parsedUser?.name || parsedUser?.nombre || "Carlos Rodríguez";
        const id =
          parsedUser?.id ||
          parsedUser?.empleado_id ||
          `emp-${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        setEmpleadoLogueado({ id: String(id), nombre: String(nombre) });
      }
    } catch {
      // Fallback por defecto
    }
  }, []);

  const handleCambiarEmpleadoLogueado = (nombreSeleccionado: string) => {
    const idGenerado = `emp-${nombreSeleccionado
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")}`;
    const nuevoEmp = { id: idGenerado, nombre: nombreSeleccionado };
    setEmpleadoLogueado(nuevoEmp);
    try {
      localStorage.setItem("taller_empleado_activo", JSON.stringify(nuevoEmp));
    } catch {
      // ignore storage errors
    }
    mostrarToast(`Sesión activa: ${nombreSeleccionado} (${idGenerado})`);
  };

  // Bloque 2: Tarjeta Flotante Activa + Buscador y Filtro dentro del flotante
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [busquedaFlotante, setBusquedaFlotante] = useState("");
  const [filtroFlotante, setFiltroFlotante] = useState("TODOS");
  const [mostrarMenuFiltroFlotante, setMostrarMenuFiltroFlotante] = useState(false);

  // Campos para agregar un trabajo/servicio libre dentro de la tarjeta "Otro"
  const [otroNombreCustom, setOtroNombreCustom] = useState("");
  const [otroPrecioCustom, setOtroPrecioCustom] = useState("");

  // Bloque 3: Orden Unificada Activa (#OT) + Cronómetro + Evidencia R2 + Envío a POS
  const [ordenActiva, setOrdenActiva] = useState<UnifiedOrder | null>(null);
  const [sincronizandoOrden, setSincronizandoOrden] = useState(false);
  const [iniciandoCronometro, setIniciandoCronometro] = useState(false);
  const [enviandoAPos, setEnviandoAPos] = useState(false);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [toastMensaje, setToastMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [modalConfirmPos, setModalConfirmPos] = useState<any | null>(null);

  const fileInputRecepcionRef = useRef<HTMLInputElement | null>(null);
  const fileInputEvidenciaRef = useRef<HTMLInputElement | null>(null);

  const mostrarToast = useCallback((texto: string, tipo: "ok" | "err" = "ok") => {
    setToastMensaje({ tipo, texto });
    setTimeout(() => {
      setToastMensaje((prev) => (prev?.texto === texto ? null : prev));
    }, 4000);
  }, []);

  // ==========================================================================
  // CRONÓMETRO EN VIVO (TICK CADA SEGUNDO)
  // ==========================================================================
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================================================
  // CARGA INICIAL DE AUTOS EN PISTA, CLIENTES, INVENTARIO Y MECÁNICOS DESDE NEON
  // ==========================================================================
  const cargarOperacionInicial = useCallback(async (selectFirstIfNone = true) => {
    try {
      setCargandoInicial(true);
      const res = await fetch("/api/taller/operacion");
      const data = await res.json();
      if (data.success) {
        const pista: UnifiedOrder[] = data.autosEnPista || [];
        setAutosEnPista(pista);
        if (Array.isArray(data.clientes)) {
          setClientesCatalogo(data.clientes);
        }
        setProductosInventario(data.productos || []);
        setServiciosDb(data.servicios || []);
        if (Array.isArray(data.mecanicos) && data.mecanicos.length > 0) {
          setMecanicos(data.mecanicos);
        }
        if (selectFirstIfNone && pista.length > 0) {
          setOrdenActiva((prev) => {
            if (!prev) {
              setFotosRecepcion(pista[0].receptionPhotos || []);
              setKmActualInput(pista[0].mileage ? String(pista[0].mileage) : "");
              return pista[0];
            }
            const updated = pista.find((o) => o.id === prev.id || o.orderNumber === prev.orderNumber);
            return updated || prev;
          });
        }
      }
    } catch (err) {
      console.error("Error cargando operación de taller:", err);
    } finally {
      setCargandoInicial(false);
    }
  }, []);

  useEffect(() => {
    cargarOperacionInicial(true);
  }, [cargarOperacionInicial]);

  // Búsqueda reactiva de clientes en Neon DB cuando el usuario escribe en Flotante 01
  useEffect(() => {
    const q = busquedaClienteEtapa1.trim();
    if (q.length < 2) return;
    const timeout = setTimeout(async () => {
      try {
        setBuscandoClientesRemoto(true);
        const res = await fetch(`/api/taller/operacion?searchCustomer=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.clientes)) {
          setClientesCatalogo((prev) => {
            const map = new Map<string, any>();
            data.clientes.forEach((c: any) => map.set(c.id, c));
            prev.forEach((c: any) => {
              if (!map.has(c.id)) map.set(c.id, c);
            });
            return Array.from(map.values());
          });
        }
      } catch {
        // Ignorar errores silenciosos de autocompletado
      } finally {
        setBuscandoClientesRemoto(false);
      }
    }, 260);
    return () => clearTimeout(timeout);
  }, [busquedaClienteEtapa1]);

  // Filtrado instantáneo de clientes por nombre, RUC/RUT, teléfono o correo
  const clientesFiltradosEtapa1 = useMemo(() => {
    const q = busquedaClienteEtapa1.trim().toLowerCase();
    if (!q) return clientesCatalogo.slice(0, 6);
    return clientesCatalogo
      .filter((c) => {
        const name = (c.name || "").toLowerCase();
        const ident = (c.identification || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        return (
          name.includes(q) ||
          ident.includes(q) ||
          phone.includes(q) ||
          email.includes(q)
        );
      })
      .slice(0, 8);
  }, [clientesCatalogo, busquedaClienteEtapa1]);

  // Abrir formulario inline para registrar cliente nuevo sin salir de la orden
  const handleIniciarNuevoClienteInline = (textoInicial?: string) => {
    const raw = (textoInicial !== undefined ? textoInicial : busquedaClienteEtapa1).trim();
    const pareceRucOCedula = /^[0-9.\-kK]{7,15}$/.test(raw);
    const pareceCorreo = raw.includes("@");
    const pareceTelefono = /^\+?[0-9\s\-]{7,15}$/.test(raw) && raw.startsWith("+");

    setClienteSeleccionadoEtapa1(null);
    setEtapa1Nombre(!pareceRucOCedula && !pareceCorreo && !pareceTelefono ? raw : "");
    setEtapa1Ruc(pareceRucOCedula ? raw : "");
    setEtapa1Telefono(pareceTelefono ? raw : "");
    setEtapa1Email(pareceCorreo ? raw : "");
    setEtapa1PlacaOpcional("");
    setModoFormularioClienteEtapa1(true);
  };

  // Editar el cliente seleccionado sin salir de la orden (ícono lápiz ✎)
  const handleEditarClienteSeleccionadoEtapa1 = () => {
    if (!clienteSeleccionadoEtapa1) return;
    setEtapa1Nombre(clienteSeleccionadoEtapa1.name || "");
    setEtapa1Ruc(clienteSeleccionadoEtapa1.identification || "");
    setEtapa1Telefono(
      clienteSeleccionadoEtapa1.phone === "S/N" ? "" : clienteSeleccionadoEtapa1.phone || ""
    );
    setEtapa1Email(clienteSeleccionadoEtapa1.email || "");
    setEtapa1PlacaOpcional(clienteSeleccionadoEtapa1.vehicles?.[0]?.plate || "");
    setModoFormularioClienteEtapa1(true);
  };

  // Guardar cliente nuevo o editado sin salir del Flotante 01
  const handleConfirmarClienteInlineEtapa1 = async () => {
    const nombreFinal = etapa1Nombre.trim() || busquedaClienteEtapa1.trim();
    if (!nombreFinal) {
      mostrarToast("Escribe el nombre del cliente para registrarlo", "err");
      return;
    }

    try {
      setGuardandoClienteEtapa1(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_CLIENTE_RAPIDO",
          customerId: clienteSeleccionadoEtapa1?.id || undefined,
          tipoCliente: etapa1TipoCliente,
          nombres: nombreFinal,
          identificacion: etapa1Ruc.trim(),
          telefono: etapa1Telefono.trim(),
          email: etapa1Email.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.customer) {
        setClienteSeleccionadoEtapa1(data.customer);
        setModoFormularioClienteEtapa1(false);
        setBusquedaClienteEtapa1("");
        setClientesCatalogo((prev) => [
          data.customer,
          ...prev.filter((c) => c.id !== data.customer.id),
        ]);
        mostrarToast(`Cliente "${data.customer.name}" listo en la orden`);
      } else {
        mostrarToast(data.error || "No se pudo guardar el cliente", "err");
      }
    } catch {
      mostrarToast("Error de red al guardar cliente", "err");
    } finally {
      setGuardandoClienteEtapa1(false);
    }
  };

  // Cargar datos de un vehículo existente dentro del Flotante 02 (Etapa 2: Vehículo o equipo)
  const cargarVehiculoEnFormularioEtapa2 = useCallback((veh: any | null) => {
    if (!veh) {
      setEtapa2VehicleId(null);
      setEtapa2Placa("");
      setEtapa2Marca("");
      setEtapa2Modelo("");
      setEtapa2Anio(String(new Date().getFullYear()));
      setEtapa2Color("");
      setEtapa2Kilometraje("");
      setEtapa2TipoCombustible("Gasolina");
      return;
    }
    setEtapa2VehicleId(veh.id || null);
    setEtapa2Placa(veh.plate && !String(veh.plate).startsWith("SIN-PLACA") ? veh.plate : "");
    setEtapa2TipoVehiculo((veh.vehicleType as any) || "Auto");
    setEtapa2Marca(veh.brand && veh.brand !== "Vehículo" ? veh.brand : "");
    setEtapa2Modelo(veh.model && veh.model !== "General" ? veh.model : "");
    setEtapa2Anio(veh.year ? String(veh.year) : String(new Date().getFullYear()));
    setEtapa2Color(veh.color || "");
    setEtapa2Kilometraje(veh.mileage ? String(veh.mileage) : "");
    setEtapa2TipoCombustible(veh.fuelType || "Gasolina");
  }, []);

  // Crear la Orden de Trabajo desde el Flotante 01 (Etapa 1: Cliente) y pasar automáticamente a Flotante 02 (Etapa 2: Vehículo o equipo)
  const handleCrearOrdenEtapa1 = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombreCliente =
      clienteSeleccionadoEtapa1?.name ||
      etapa1Nombre.trim() ||
      busquedaClienteEtapa1.trim();

    if (!nombreCliente) {
      mostrarToast("Busca, elige o escribe el nombre del cliente para crear la orden", "err");
      return;
    }

    try {
      setCreandoOrdenEtapa1(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREAR_ORDEN_ETAPA_1",
          customerId: clienteSeleccionadoEtapa1?.id || undefined,
          tipoCliente: etapa1TipoCliente,
          nombres: nombreCliente,
          identificacion:
            clienteSeleccionadoEtapa1?.identification || etapa1Ruc.trim() || undefined,
          telefono:
            clienteSeleccionadoEtapa1?.phone || etapa1Telefono.trim() || undefined,
          email:
            clienteSeleccionadoEtapa1?.email || etapa1Email.trim() || undefined,
          ingresadoPor: etapa1IngresadoPor.trim() || "Gonzalo Rojas",
          mechanic: etapa1Tecnico || mecanicos[0] || "Hernan Marquez",
          motivoIngreso: etapa1MotivoIngreso.trim(),
          placa:
            etapa1PlacaOpcional.trim() ||
            clienteSeleccionadoEtapa1?.vehicles?.[0]?.plate ||
            undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setClienteEncontrado(data.customer || null);
        setVehiculoEncontrado(data.vehicle || null);
        setAutosEnPista((prev) => [
          data.activeOrder,
          ...prev.filter((o) => o.id !== data.activeOrder.id),
        ]);
        if (data.customer) {
          setClientesCatalogo((prev) => [
            data.customer,
            ...prev.filter((c) => c.id !== data.customer.id),
          ]);
        }

        // Pre-cargar vehículo del cliente (si tiene) y abrir Flotante 02 (Etapa 2: Vehículo o equipo)
        const primerVehiculo =
          data.vehicle || data.customer?.vehicles?.[0] || null;
        cargarVehiculoEnFormularioEtapa2(primerVehiculo);
        setMostrarFlotanteEtapa1(false);
        setMostrarFlotanteEtapa2(true);

        mostrarToast(
          `Etapa 1 lista (#${data.activeOrder.orderNumber}). Ahora registra el vehículo o equipo en Etapa 2.`
        );
      } else {
        mostrarToast(data.error || "Error al crear la orden de trabajo", "err");
      }
    } catch {
      mostrarToast("Error de conexión al crear la orden", "err");
    } finally {
      setCreandoOrdenEtapa1(false);
    }
  };

  // Alternar un ítem del checklist "Inventario de lo que trae" en Etapa 2
  const handleToggleInventarioEtapa2 = (item: string) => {
    setEtapa2InventarioTrae((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Alternar un testigo del tablero en Etapa 2
  const handleToggleTestigoEtapa2 = (testigo: string) => {
    setEtapa2Testigos((prev) =>
      prev.includes(testigo) ? prev.filter((t) => t !== testigo) : [...prev, testigo]
    );
  };

  // Guardar Etapa 2 (Vehículo o equipo: Km, Combustible, Estado General, Inventario de lo que trae)
  const handleGuardarEtapa2Vehiculo = async (e: React.FormEvent) => {
    e.preventDefault();

    const placaFinal =
      etapa2Placa.trim().toUpperCase() ||
      (ordenActiva?.plate && !ordenActiva.plate.startsWith("SIN-PLACA")
        ? ordenActiva.plate
        : "");

    if (!placaFinal) {
      mostrarToast("Ingresa la Placa o N° de Serie del vehículo o equipo", "err");
      return;
    }

    try {
      setGuardandoEtapa2(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_2_VEHICULO",
          orderId: ordenActiva?.id || undefined,
          customerId:
            clienteEncontrado?.id ||
            clienteSeleccionadoEtapa1?.id ||
            ordenActiva?.customerId ||
            undefined,
          vehicleId: etapa2VehicleId || undefined,
          placa: placaFinal,
          tipoVehiculo: etapa2TipoVehiculo,
          marca: etapa2Marca.trim() || "Vehículo",
          modelo: etapa2Modelo.trim() || "General",
          anio: etapa2Anio,
          color: etapa2Color.trim(),
          kilometraje: etapa2Kilometraje,
          tipoCombustible: etapa2TipoCombustible,
          nivelCombustible: etapa2NivelCombustible,
          estadoGeneral: etapa2EstadoGeneral,
          testigosTablero: etapa2Testigos,
          observacionesEstado: etapa2ObservacionesEstado.trim(),
          inventarioTrae: etapa2InventarioTrae,
          objetosValor: etapa2ObjetosValor.trim(),
          receptionPhotos: fotosRecepcion,
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setVehiculoEncontrado(data.vehicle || null);
        if (data.customer) {
          setClienteEncontrado(data.customer);
          setClientesCatalogo((prev) => [
            data.customer,
            ...prev.filter((c) => c.id !== data.customer.id),
          ]);
        }
        setKmActualInput(data.activeOrder.mileage ? String(data.activeOrder.mileage) : "");
        setAutosEnPista((prev) => {
          const exists = prev.some((o) => o.id === data.activeOrder.id);
          return exists
            ? prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
            : [data.activeOrder, ...prev];
        });
        setMostrarFlotanteEtapa2(false);
        setMostrarFlotanteEtapa3(true);
        mostrarToast(
          `Etapa 2 lista (${placaFinal}). Ahora registra la inspección en Etapa 3.`
        );
      } else {
        mostrarToast(data.error || "Error al guardar recepción del vehículo", "err");
      }
    } catch {
      mostrarToast("Error de conexión al guardar Etapa 2", "err");
    } finally {
      setGuardandoEtapa2(false);
    }
  };

  // ==========================================================================
  // MANEJADORES DE ETAPA 3: INSPECCIÓN (5 VISTAS + FOTOS EVIDENCIA + PDF)
  // ==========================================================================
  const handleAgregarHallazgoEnPunto = (xPct: number, yPct: number, zonaExplicita?: string) => {
    const vistaObj =
      VISTAS_INSPECCION.find((v) => v.id === etapa3VistaActiva) || VISTAS_INSPECCION[0];

    let zonaDetectada = zonaExplicita || "";
    if (!zonaDetectada && vistaObj.zonas.length > 0) {
      let minDist = Infinity;
      vistaObj.zonas.forEach((z) => {
        const d = Math.hypot(z.x - xPct, z.y - yPct);
        if (d < minDist) {
          minDist = d;
          zonaDetectada = z.nombre;
        }
      });
    }

    const nuevo: InspectionFinding = {
      id: `find-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vista: vistaObj.id,
      vistaLabel: vistaObj.shortLabel,
      x: Math.round(xPct),
      y: Math.round(yPct),
      zona: zonaDetectada || vistaObj.label,
      tipo: etapa3TipoHallazgoActual,
      descripcion:
        etapa3DescripcionActual.trim() ||
        `${etapa3TipoHallazgoActual} en ${zonaDetectada || vistaObj.shortLabel}`,
    };

    setEtapa3Hallazgos((prev) => [...prev, nuevo]);
    setEtapa3HallazgoSeleccionadoId(nuevo.id);
    setEtapa3ZonaActual(nuevo.zona);
    setEtapa3DescripcionActual("");
  };

  const handleTocarEsquemaVehiculo = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(6, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100));
    handleAgregarHallazgoEnPunto(xPct, yPct);
  };

  const handleActualizarHallazgoSeleccionado = (
    id: string,
    partial: Partial<InspectionFinding>
  ) => {
    setEtapa3Hallazgos((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...partial } : h))
    );
  };

  const handleEliminarHallazgoEtapa3 = (id: string) => {
    setEtapa3Hallazgos((prev) => prev.filter((h) => h.id !== id));
    if (etapa3HallazgoSeleccionadoId === id) {
      setEtapa3HallazgoSeleccionadoId(null);
    }
  };

  // Generar el PDF de la Inspección (Etapa 3) listo para imprimir / guardar como PDF
  const handleGenerarPdfInspeccion = () => {
    if (typeof window === "undefined") return;

    const clienteNom =
      clienteEncontrado?.name ||
      clienteSeleccionadoEtapa1?.name ||
      ordenActiva?.client ||
      "Cliente General";
    const clienteDoc =
      clienteEncontrado?.identification ||
      clienteSeleccionadoEtapa1?.identification ||
      ordenActiva?.clientIdDoc ||
      "S/N";
    const clienteTel =
      clienteEncontrado?.phone ||
      clienteSeleccionadoEtapa1?.phone ||
      ordenActiva?.clientPhone ||
      "S/N";
    const numOrden = ordenActiva?.orderNumber || `OT-${new Date().getFullYear()}`;
    const placaVeh =
      etapa2Placa ||
      vehiculoEncontrado?.plate ||
      ordenActiva?.plate ||
      "POR-ASIGNAR";
    const descVeh =
      `${etapa2Marca || vehiculoEncontrado?.brand || ""} ${
        etapa2Modelo || vehiculoEncontrado?.model || ""
      } ${etapa2Anio || vehiculoEncontrado?.year || ""}`.trim() ||
      ordenActiva?.vehicle ||
      "Vehículo en Recepción";
    const kmVeh =
      etapa2Kilometraje ||
      (ordenActiva?.mileage ? String(ordenActiva.mileage) : "N/A");
    const combVeh = `${etapa2NivelCombustible || ordenActiva?.fuelLevel || "1/2"} (${etapa2TipoCombustible})`;
    const tecnicoNom = ordenActiva?.mechanic || etapa1Tecnico || "Hernan Marquez";
    const fechaStr = new Date().toLocaleString("es-EC");

    const hallazgosRowsHtml =
      etapa3Hallazgos.length === 0
        ? `<tr><td colspan="4" style="text-align:center;padding:14px;color:#555;">Sin daños ni hallazgos exteriores registrados en las 5 vistas.</td></tr>`
        : etapa3Hallazgos
            .map(
              (h, idx) => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:700;">#${idx + 1}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${h.vistaLabel}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;">${h.tipo} — ${h.zona}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${h.descripcion}</td>
          </tr>`
            )
            .join("");

    const inventarioBadgesHtml =
      etapa2InventarioTrae.length === 0
        ? `<span style="color:#666;">Sin accesorios marcados</span>`
        : etapa2InventarioTrae
            .map(
              (it) =>
                `<span style="display:inline-block;margin:3px 5px 3px 0;padding:4px 9px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;font-size:11px;">✓ ${it}</span>`
            )
            .join("");

    const todasLasFotos = Array.from(
      new Set([...fotosRecepcion, ...(ordenActiva?.evidencePhotos || [])])
    );
    const fotosHtml =
      todasLasFotos.length === 0
        ? `<p style="font-size:12px;color:#666;">Sin fotografías adjuntas en este momento.</p>`
        : `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">
            ${todasLasFotos
              .map(
                (url, i) => `
              <div style="border:1px solid #d1d5db;border-radius:8px;padding:4px;width:145px;">
                <img src="${url}" style="width:100%;height:95px;object-fit:cover;border-radius:6px;" />
                <div style="font-size:10px;color:#555;text-align:center;margin-top:3px;">Evidencia #${i + 1}</div>
              </div>`
              )
              .join("")}
          </div>`;

    const resumenPorVistaHtml = VISTAS_INSPECCION.map((v) => {
      const count = etapa3Hallazgos.filter((h) => h.vista === v.id).length;
      return `
        <div style="flex:1;min-width:110px;border:1px solid #d1d5db;border-radius:8px;padding:8px;text-align:center;background:${
          count > 0 ? "#fffbeb" : "#f9fafb"
        };">
          <div style="font-size:11px;font-weight:700;color:#111827;">${v.shortLabel}</div>
          <div style="font-size:12px;color:${count > 0 ? "#d97706" : "#059669"};margin-top:2px;font-weight:600;">
            ${count === 0 ? "✓ Sin novedad" : `${count} hallazgo(s)`}
          </div>
        </div>
      `;
    }).join("");

    const win = window.open("", "_blank", "width=920,height=820");
    if (!win) {
      mostrarToast("Activa las ventanas emergentes para generar el PDF de inspección", "err");
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Inspección Vehicular - ${numOrden} (${placaVeh})</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #111827; margin: 24px; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
          .section { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
          .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #2563eb; margin-bottom: 8px; letter-spacing: 0.04em; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; background: #f3f4f6; padding: 8px 10px; border-bottom: 1px solid #d1d5db; font-size: 11px; text-transform: uppercase; }
          .signatures { display: flex; justify-content: space-between; gap: 40px; margin-top: 38px; padding-top: 20px; }
          .sig-box { flex: 1; border-top: 1px solid #374151; text-align: center; padding-top: 6px; font-size: 12px; }
          @media print { .no-print { display: none !important; } body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:14px;text-align:right;">
          <button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
            🖨️ Imprimir / Guardar como PDF
          </button>
        </div>

        <div class="header">
          <div>
            <h1 style="margin:0;font-size:20px;">ACTA DE RECEPCIÓN E INSPECCIÓN VEHICULAR</h1>
            <p style="margin:3px 0 0;font-size:12px;color:#4b5563;">Etapa 1: Cliente • Etapa 2: Vehículo • Etapa 3: Inspección (5 Vistas)</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:800;color:#2563eb;">Orden #${numOrden}</div>
            <div style="font-size:11px;color:#6b7280;">Fecha: ${fechaStr}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. Cliente y Vehículo / Equipo</div>
          <div class="grid2">
            <div><strong>Cliente:</strong> ${clienteNom}</div>
            <div><strong>RUC / RUT / Cédula:</strong> ${clienteDoc}</div>
            <div><strong>Teléfono:</strong> ${clienteTel}</div>
            <div><strong>Técnico Asignado:</strong> ${tecnicoNom}</div>
            <div><strong>Vehículo / Equipo:</strong> ${descVeh}</div>
            <div><strong>Placa / N° Serie:</strong> ${placaVeh}</div>
            <div><strong>Kilometraje:</strong> ${kmVeh} km</div>
            <div><strong>Nivel Combustible:</strong> ${combVeh}</div>
            <div><strong>Estado General:</strong> ${etapa2EstadoGeneral}</div>
            <div><strong>Motivo de Ingreso:</strong> ${etapa1MotivoIngreso || ordenActiva?.notes || "Revisión y servicio en taller"}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. Resumen de las Cinco Vistas del Vehículo</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
            ${resumenPorVistaHtml}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:50px;">Pin</th>
                <th style="width:120px;">Vista</th>
                <th style="width:200px;">Tipo y Zona</th>
                <th>Detalle del Hallazgo</th>
              </tr>
            </thead>
            <tbody>
              ${hallazgosRowsHtml}
            </tbody>
          </table>
          ${
            etapa3NotasGenerales
              ? `<p style="font-size:12px;margin:10px 0 0;"><strong>Notas de inspección:</strong> ${etapa3NotasGenerales}</p>`
              : ""
          }
        </div>

        <div class="section">
          <div class="section-title">3. Inventario de lo que trae el vehículo</div>
          <div>${inventarioBadgesHtml}</div>
          ${
            etapa2ObjetosValor
              ? `<p style="font-size:12px;margin:8px 0 0;"><strong>Pertenencias / Objetos de valor:</strong> ${etapa2ObjetosValor}</p>`
              : ""
          }
        </div>

        <div class="section">
          <div class="section-title">4. Evidencia Fotográfica</div>
          ${fotosHtml}
        </div>

        <div class="signatures">
          <div class="sig-box">
            <strong>Firma de Conformidad del Cliente</strong><br/>
            <span>${clienteNom} (${clienteDoc})</span>
          </div>
          <div class="sig-box">
            <strong>Responsable Taller / Recepción</strong><br/>
            <span>${etapa1IngresadoPor || "Recepción"} • Técnico: ${tecnicoNom}</span>
          </div>
        </div>

        <script>
          setTimeout(() => { window.print(); }, 350);
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // Guardar Etapa 3 en Neon PostgreSQL y pasar automáticamente a Etapa 4: Presupuesto
  const handleGuardarEtapa3Inspeccion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ordenActiva) {
      setMostrarFlotanteEtapa3(false);
      setMostrarFlotanteEtapa4(true);
      mostrarToast("Inspección registrada. Ahora arma el presupuesto en Etapa 4.");
      return;
    }

    try {
      setGuardandoEtapa3(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_3_INSPECCION",
          orderId: ordenActiva.id,
          findings: etapa3Hallazgos,
          inspectionPhotos: fotosRecepcion,
          notesInspeccion: etapa3NotasGenerales.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        setEtapa4Items(Array.isArray(data.activeOrder.items) ? data.activeOrder.items : []);
        setMostrarFlotanteEtapa3(false);
        setMostrarFlotanteEtapa4(true);
        mostrarToast(
          `Etapa 3 lista (#${data.activeOrder.orderNumber}). Ahora arma el presupuesto en Etapa 4.`
        );
      } else {
        mostrarToast(data.error || "No se pudo guardar la inspección", "err");
      }
    } catch {
      mostrarToast("Error de conexión al guardar Etapa 3", "err");
    } finally {
      setGuardandoEtapa3(false);
    }
  };

  // ==========================================================================
  // MANEJADORES DE ETAPA 4: PRESUPUESTO (CATÁLOGO, IMPUESTOS/DESCUENTOS Y LINK)
  // ==========================================================================
  useEffect(() => {
    if (!ordenActiva) return;
    setEtapa4Items(Array.isArray(ordenActiva.items) ? ordenActiva.items : []);
    if (ordenActiva.quoteTaxRate !== undefined) {
      setEtapa4TaxRate(String(ordenActiva.quoteTaxRate));
    }
    if (ordenActiva.quoteDiscount !== undefined) {
      setEtapa4Discount(String(ordenActiva.quoteDiscount));
    }
    if (ordenActiva.quoteDiscountType === "FIXED" || ordenActiva.quoteDiscountType === "PERCENT") {
      setEtapa4DiscountType(ordenActiva.quoteDiscountType);
    }
    if (ordenActiva.quoteStatus) {
      setEtapa4QuoteStatus(ordenActiva.quoteStatus);
    }
    if (Array.isArray(ordenActiva.inspectionFindings) && ordenActiva.inspectionFindings.length > 0) {
      setEtapa3Hallazgos(ordenActiva.inspectionFindings);
    }
    if (Array.isArray(ordenActiva.assignedTechnicians) && ordenActiva.assignedTechnicians.length > 0) {
      setEtapa5TecnicosAsignados(ordenActiva.assignedTechnicians);
      const firstTech = ordenActiva.assignedTechnicians[0]?.name || ordenActiva.mechanic;
      if (firstTech) {
        setEtapa5ChatAutor(firstTech);
        setEtapa5HoraTecnico(firstTech);
      }
    } else if (ordenActiva.mechanic) {
      const parsed = ordenActiva.mechanic
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          notified: true,
          notifiedAt: ordenActiva.dateIn || new Date().toISOString(),
        }));
      setEtapa5TecnicosAsignados(parsed);
      if (parsed[0]) {
        setEtapa5ChatAutor(parsed[0].name);
        setEtapa5HoraTecnico(parsed[0].name);
      }
    }
    setEtapa5ChatMensajes(
      Array.isArray(ordenActiva.internalChat) ? ordenActiva.internalChat : []
    );
    setEtapa5HorasRegistros(
      Array.isArray(ordenActiva.technicianHours) ? ordenActiva.technicianHours : []
    );

    // Sincronizar Etapa 6: Estado y Aviso
    const pinOrden = ordenActiva.trackingPin || "4821";
    const estadoOrden = ordenActiva.status || "En Reparación";
    const colorOrden = (ordenActiva.statusColor as CustomOrderStatus["color"]) || "sky";
    setEtapa6TrackingPin(pinOrden);
    setEtapa6EstadoSeleccionado(estadoOrden);
    setEtapa6ColorSeleccionado(colorOrden);
    setEtapa6ProgresoSeleccionado(ordenActiva.progress ?? 65);
    setEtapa6ClienteTelefono(
      ordenActiva.clientPhone && ordenActiva.clientPhone !== "S/N"
        ? ordenActiva.clientPhone
        : clienteEncontrado?.phone && clienteEncontrado.phone !== "S/N"
        ? clienteEncontrado.phone
        : ""
    );
    setEtapa6ClienteEmail(
      ordenActiva.clientEmail || clienteEncontrado?.email || ""
    );

    if (Array.isArray(ordenActiva.customStatuses) && ordenActiva.customStatuses.length > 0) {
      const mergedMap = new Map<string, CustomOrderStatus>();
      ESTADOS_ORDEN_DEFAULT.forEach((s) => mergedMap.set(s.name.toLowerCase(), s));
      ordenActiva.customStatuses.forEach((s) => {
        if (s?.name) mergedMap.set(s.name.toLowerCase(), s);
      });
      setEtapa6EstadosLista(Array.from(mergedMap.values()));
    } else {
      setEtapa6EstadosLista(ESTADOS_ORDEN_DEFAULT);
    }

    const originUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const trackingLink = `${originUrl}/taller/seguimiento?orden=${encodeURIComponent(
      ordenActiva.orderNumber
    )}&pin=${encodeURIComponent(pinOrden)}`;

    setEtapa6MensajeAviso(
      `Hola *${ordenActiva.client || "Cliente"}*, te informamos sobre tu vehículo *${
        ordenActiva.vehicle
      }* (${ordenActiva.plate}).\n\n📌 *Nuevo estado de tu orden #${
        ordenActiva.orderNumber
      }:* ${estadoOrden}\n\n🔎 *Revisa el seguimiento en línea en tiempo real:*\n${trackingLink}\n• *N° de Orden:* ${
        ordenActiva.orderNumber
      }\n• *PIN de acceso:* ${pinOrden}`
    );

    // Sincronizar Etapa 7: Entrega y Firma
    setEtapa7Checklist({
      trabajosVerificados: ordenActiva.deliveryChecklist?.trabajosVerificados ?? true,
      pertenenciasEntregadas: ordenActiva.deliveryChecklist?.pertenenciasEntregadas ?? true,
      repuestosMostrados: ordenActiva.deliveryChecklist?.repuestosMostrados ?? true,
      vehiculoLimpio: ordenActiva.deliveryChecklist?.vehiculoLimpio ?? true,
      recibidoPorNombre:
        ordenActiva.deliveryChecklist?.recibidoPorNombre || ordenActiva.client || "",
      recibidoPorDoc:
        ordenActiva.deliveryChecklist?.recibidoPorDoc || ordenActiva.clientIdDoc || "",
      observacionesEntrega:
        ordenActiva.deliveryChecklist?.observacionesEntrega || "",
    });
    const serviciosResumen =
      Array.isArray(ordenActiva.items) && ordenActiva.items.length > 0
        ? ordenActiva.items.map((it) => `• ${it.name} (x${it.qty || 1})`).join("\n")
        : "• Mantenimiento y revisión técnica general";
    setEtapa7InformeTecnico(
      ordenActiva.technicalReportText ||
        `INFORME TÉCNICO DE ENTREGA - ORDEN #${ordenActiva.orderNumber}\nVehículo: ${
          ordenActiva.vehicle
        } (${ordenActiva.plate})\nTécnico responsable: ${
          ordenActiva.mechanic
        }\n\nTrabajos realizados:\n${serviciosResumen}\n\nObservación final: El vehículo fue sometido a control de calidad y se entrega en óptimas condiciones de operación. Próximo mantenimiento sugerido a los ${
          ordenActiva.nextOilChangeKm ||
          (ordenActiva.mileage ? ordenActiva.mileage + 5000 : 55000)
        } km.`
    );
    setEtapa7InformeAdjuntoUrl(ordenActiva.technicalReportUrl || null);
    setEtapa7FirmaDataUrl(ordenActiva.deliverySignatureUrl || null);
    setEtapa7FirmadoPor(ordenActiva.deliverySignedBy || ordenActiva.client || "");
  }, [ordenActiva?.id]);

  // Lista de "Los más usados a un clic" (Servicios + Repuestos frecuentes)
  const masUsadosCatalogo = useMemo(
    () => [
      {
        code: "LUB-001",
        name: "Cambio de aceite de motor",
        price: 15.0,
        type: "SERVICE" as const,
        category: "Lubricación y Filtros",
      },
      {
        code: "FIL-001",
        name: "Filtro de aceite",
        price: 8.5,
        type: "PART" as const,
        category: "Repuestos e Insumos",
      },
      {
        code: "ALI-002",
        name: "Alineación computarizada (4 ruedas)",
        price: 25.0,
        type: "SERVICE" as const,
        category: "Alineación y Balanceo",
      },
      {
        code: "BAL-002",
        name: "Balanceo completo (4 ruedas)",
        price: 18.0,
        type: "SERVICE" as const,
        category: "Alineación y Balanceo",
      },
      {
        code: "LAV-002",
        name: "Lavado completo (interior + exterior)",
        price: 15.0,
        type: "SERVICE" as const,
        category: "Lavado de Carro",
      },
      {
        code: "MEC-001",
        name: "Cambio de pastillas / zapatas de freno",
        price: 25.0,
        type: "SERVICE" as const,
        category: "Mecánica Rápida",
      },
      {
        code: "MEC-006",
        name: "Escáner automotriz OBD2",
        price: 20.0,
        type: "SERVICE" as const,
        category: "Mecánica Rápida",
      },
      {
        code: "LLA-002",
        name: "Inflado de llantas con Nitrógeno",
        price: 10.0,
        type: "SERVICE" as const,
        category: "Llantera e Inflado",
      },
    ],
    []
  );

  // Todos los servicios del catálogo unificados (Tarjetas + Servicios DB)
  const catalogoServiciosCompleto = useMemo(() => {
    const lista: { code: string; name: string; price: number; category: string }[] = [];
    const vistos = new Set<string>();

    SERVICE_CARDS.forEach((card) => {
      card.presets.forEach((p) => {
        const key = p.code || p.name.toLowerCase();
        if (!vistos.has(key)) {
          vistos.add(key);
          lista.push({
            code: p.code,
            name: p.name,
            price: Number(p.price) || 0,
            category: card.title,
          });
        }
      });
    });

    serviciosDb.forEach((s: any, idx: number) => {
      const code = s.code || `SRV-CAT-${idx + 1}`;
      const name = s.name || s.title || "";
      if (name && !vistos.has(name.toLowerCase())) {
        vistos.add(name.toLowerCase());
        lista.push({
          code,
          name,
          price: Number(s.price) || 20,
          category: s.category || "Servicio Catálogo",
        });
      }
    });

    return lista;
  }, [serviciosDb]);

  // Cálculos al instante de Subtotal, Descuento, Impuestos (IVA) y Total en Etapa 4
  const calculosPresupuestoEtapa4 = useMemo(() => {
    const subtotal = etapa4Items.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
    const rawDisc = Math.max(0, parseFloat(etapa4Discount) || 0);
    const discountAmount =
      etapa4DiscountType === "FIXED"
        ? Math.min(subtotal, rawDisc)
        : Number(((subtotal * Math.min(100, rawDisc)) / 100).toFixed(2));

    const baseImponible = Math.max(0, subtotal - discountAmount);
    const taxRateNum = Math.max(0, parseFloat(etapa4TaxRate) || 0);
    const taxAmount = Number(((baseImponible * taxRateNum) / 100).toFixed(2));
    const total = Number((baseImponible + taxAmount).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount,
      baseImponible: Number(baseImponible.toFixed(2)),
      taxRateNum,
      taxAmount,
      total,
    };
  }, [etapa4Items, etapa4Discount, etapa4DiscountType, etapa4TaxRate]);

  // Link único para que el cliente apruebe desde su celular
  const linkAprobacionCliente = useMemo(() => {
    const token =
      ordenActiva?.quoteToken ||
      ordenActiva?.quoteNumber ||
      ordenActiva?.orderNumber ||
      "PRE-DEMO";
    if (typeof window === "undefined") {
      return `/taller/presupuesto/${encodeURIComponent(token)}`;
    }
    return `${window.location.origin}/taller/presupuesto/${encodeURIComponent(token)}`;
  }, [ordenActiva]);

  // Agregar o alternar un ítem de "Más usados" o "Catálogo de Servicios" en Etapa 4
  const handleToggleItemCatalogoEtapa4 = (item: {
    code: string;
    name: string;
    price: number;
    type?: "SERVICE" | "PART";
    category?: string;
    productId?: string;
    imageUrl?: string | null;
  }) => {
    setEtapa4Items((prev) => {
      const existe = prev.find(
        (i) => i.code === item.code || i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (existe) {
        return prev.map((i) => (i.id === existe.id ? { ...i, qty: (i.qty || 1) + 1 } : i));
      }
      const nuevo: OrderItem = {
        id: `pre-${item.code}-${Date.now()}`,
        type: item.type || "SERVICE",
        category: item.category || "Servicio Taller",
        code: item.code,
        name: item.name,
        price: Number(item.price) || 0,
        qty: 1,
        status: "Pendiente",
        productId: item.productId,
        imageUrl: item.imageUrl,
      };
      return [...prev, nuevo];
    });
  };

  const handleCambiarCantidadEtapa4 = (id: string, delta: number) => {
    setEtapa4Items((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, qty: Math.max(0, (it.qty || 1) + delta) } : it))
        .filter((it) => it.qty > 0)
    );
  };

  const handleCambiarPrecioEtapa4 = (id: string, nuevoPrecio: string) => {
    const val = Math.max(0, parseFloat(nuevoPrecio) || 0);
    setEtapa4Items((prev) => prev.map((it) => (it.id === id ? { ...it, price: val } : it)));
  };

  const handleEliminarItemEtapa4 = (id: string) => {
    setEtapa4Items((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAgregarManualEtapa4 = () => {
    if (!etapa4ManualNombre.trim()) {
      mostrarToast("Escribe el nombre del servicio o repuesto", "err");
      return;
    }
    const precio = Math.max(0, parseFloat(etapa4ManualPrecio) || 0);
    const nuevo: OrderItem = {
      id: `man-${Date.now()}`,
      type: etapa4ManualTipo,
      category: etapa4ManualTipo === "PART" ? "Repuestos e Insumos" : "Otro",
      code: `${etapa4ManualTipo === "PART" ? "REP" : "SRV"}-${Math.floor(100 + Math.random() * 900)}`,
      name: etapa4ManualNombre.trim(),
      price: precio,
      qty: 1,
      status: "Pendiente",
    };
    setEtapa4Items((prev) => [...prev, nuevo]);
    setEtapa4ManualNombre("");
    setEtapa4ManualPrecio("");
  };

  const handleCopiarLinkPresupuesto = async () => {
    try {
      await navigator.clipboard.writeText(linkAprobacionCliente);
      setCopiadoLinkPresupuesto(true);
      mostrarToast("Link de aprobación copiado al portapapeles");
      setTimeout(() => setCopiadoLinkPresupuesto(false), 3000);
    } catch {
      mostrarToast("Copia el link directamente desde el recuadro", "err");
    }
  };

  const handleEnviarWhatsAppPresupuesto = () => {
    const telRaw =
      ordenActiva?.clientPhone ||
      clienteEncontrado?.phone ||
      clienteSeleccionadoEtapa1?.phone ||
      etapa1Telefono ||
      "";
    const telDigits = telRaw.replace(/\D/g, "");
    const clienteNom =
      ordenActiva?.client ||
      clienteSeleccionadoEtapa1?.name ||
      etapa1Nombre ||
      "Cliente";
    const vehDesc =
      ordenActiva?.vehicle ||
      `${etapa2Marca} ${etapa2Modelo}`.trim() ||
      "su vehículo";
    const placa = ordenActiva?.plate || etapa2Placa || "";

    const msg = `Hola *${clienteNom}*, le enviamos el presupuesto de su vehículo *${vehDesc}* (${placa}).\n\n*Total Presupuesto:* $${calculosPresupuestoEtapa4.total.toFixed(
      2
    )} (incluye impuestos/descuentos).\n\n👉 *Revise el detalle y apruebe desde su celular con este link:*\n${linkAprobacionCliente}`;

    const waUrl = telDigits
      ? `https://wa.me/${telDigits.startsWith("593") || telDigits.length > 10 ? telDigits : `593${telDigits.replace(/^0/, "")}`}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, "_blank");
  };

  // Guardar Presupuesto (Etapa 4) en Neon PostgreSQL desde la misma orden
  const handleGuardarEtapa4Presupuesto = async (
    e?: React.FormEvent,
    forzarEstado?: string
  ) => {
    if (e) e.preventDefault();

    if (!ordenActiva) {
      mostrarToast("Primero crea o selecciona una orden activa", "err");
      return;
    }

    try {
      setGuardandoEtapa4(true);
      const statusEnviar = forzarEstado || etapa4QuoteStatus || "Pendiente de Aprobación";

      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_4_PRESUPUESTO",
          orderId: ordenActiva.id,
          items: etapa4Items,
          taxRate: calculosPresupuestoEtapa4.taxRateNum,
          discount: parseFloat(etapa4Discount) || 0,
          discountType: etapa4DiscountType,
          quoteStatus: statusEnviar,
          notesPresupuesto: etapa4NotasPresupuesto.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        setEtapa4QuoteStatus(data.activeOrder.quoteStatus || statusEnviar);
        mostrarToast(
          data.message ||
            `Presupuesto ${data.quoteNumber} actualizado ($${calculosPresupuestoEtapa4.total.toFixed(2)})`
        );
        if (!forzarEstado) {
          setMostrarFlotanteEtapa4(false);
          setMostrarFlotanteEtapa5(true);
        }
      } else {
        mostrarToast(data.error || "No se pudo guardar el presupuesto", "err");
      }
    } catch {
      mostrarToast("Error de conexión al guardar el presupuesto", "err");
    } finally {
      setGuardandoEtapa4(false);
    }
  };

  // ==========================================================================
  // MANEJADORES DE ETAPA 5: REPARACIÓN
  // (Múltiples técnicos con aviso, Fotos del avance, Notas de voz y chat interno, Horas por técnico)
  // ==========================================================================
  const sincronizarEtapa5EnNeon = async (partial: {
    assignedTechnicians?: AssignedTechnician[];
    items?: OrderItem[];
    evidencePhotos?: string[];
    internalChat?: InternalChatMessage[];
    technicianHours?: TechnicianHourEntry[];
    notifyTechnicians?: boolean;
  }) => {
    if (!ordenActiva) return null;

    try {
      setGuardandoEtapa5(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_5_REPARACION",
          orderId: ordenActiva.id,
          assignedTechnicians: partial.assignedTechnicians ?? etapa5TecnicosAsignados,
          items: partial.items ?? ordenActiva.items,
          evidencePhotos: partial.evidencePhotos ?? ordenActiva.evidencePhotos,
          internalChat: partial.internalChat ?? etapa5ChatMensajes,
          technicianHours: partial.technicianHours ?? etapa5HorasRegistros,
          notifyTechnicians: Boolean(partial.notifyTechnicians),
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        return data.activeOrder as UnifiedOrder;
      }
    } catch (err) {
      console.error("Error sincronizando Etapa 5:", err);
    } finally {
      setGuardandoEtapa5(false);
    }
    return null;
  };

  // Asignar o quitar un técnico de la orden (soporta 1 o más técnicos)
  const handleToggleTecnicoEtapa5 = async (techName: string) => {
    const existe = etapa5TecnicosAsignados.some((t) => t.name === techName);
    let nuevos: AssignedTechnician[];

    if (existe) {
      if (etapa5TecnicosAsignados.length <= 1) {
        mostrarToast("La orden debe tener al menos un técnico asignado", "err");
        return;
      }
      nuevos = etapa5TecnicosAsignados.filter((t) => t.name !== techName);
    } else {
      nuevos = [
        ...etapa5TecnicosAsignados,
        {
          name: techName,
          notified: true,
          notifiedAt: new Date().toISOString(),
        },
      ];
    }

    setEtapa5TecnicosAsignados(nuevos);
    setEtapa5ChatAutor(nuevos[0]?.name || techName);
    setEtapa5HoraTecnico(techName);

    if (ordenActiva) {
      await sincronizarEtapa5EnNeon({
        assignedTechnicians: nuevos,
        notifyTechnicians: !existe,
      });
      if (!existe) {
        mostrarToast(`Técnico ${techName} asignado y notificado en la orden`);
      }
    }
  };

  // Enviar aviso explícito a todos los técnicos asignados
  const handleEnviarAvisoTecnicosEtapa5 = async () => {
    const ahora = new Date().toISOString();
    const actualizados = etapa5TecnicosAsignados.map((t) => ({
      ...t,
      notified: true,
      notifiedAt: ahora,
    }));
    setEtapa5TecnicosAsignados(actualizados);

    const avisoChat: InternalChatMessage = {
      id: `chat-aviso-${Date.now()}`,
      author: "Sistema Taller",
      role: "Notificación",
      text: `🔔 Aviso de trabajo enviado a: ${actualizados.map((t) => t.name).join(", ")}.`,
      createdAt: new Date().toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const nuevoChat = [...etapa5ChatMensajes, avisoChat];
    setEtapa5ChatMensajes(nuevoChat);

    if (ordenActiva) {
      await sincronizarEtapa5EnNeon({
        assignedTechnicians: actualizados,
        internalChat: nuevoChat,
        notifyTechnicians: true,
      });
    }
    mostrarToast(
      `Aviso enviado a ${actualizados.map((t) => t.name).join(", ")}`
    );
  };

  // Subir foto(s) del avance de la reparación (desde celular o computador) a Cloudflare R2
  const handleSubirFotoAvanceEtapa5 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setSubiendoEvidencia(true);
      const nuevosUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await subirArchivoACloudflareR2(files[i], "taller_evidencia");
        if (url) nuevosUrls.push(url);
      }

      if (nuevosUrls.length > 0) {
        const fotosActuales = ordenActiva?.evidencePhotos || [];
        const nuevasEvidencias = [...fotosActuales, ...nuevosUrls];

        // También publicar en el chat interno para que quede trazabilidad del avance
        const msgFoto: InternalChatMessage = {
          id: `chat-foto-${Date.now()}`,
          author: etapa5ChatAutor || etapa5TecnicosAsignados[0]?.name || "Técnico",
          role: "Técnico",
          text: `📷 Subió ${nuevosUrls.length} foto(s) del avance de la reparación.`,
          photoUrl: nuevosUrls[0],
          createdAt: new Date().toLocaleTimeString("es-EC", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        const nuevoChat = [...etapa5ChatMensajes, msgFoto];
        setEtapa5ChatMensajes(nuevoChat);

        if (ordenActiva) {
          await sincronizarEtapa5EnNeon({
            evidencePhotos: nuevasEvidencias,
            internalChat: nuevoChat,
          });
        }
        mostrarToast("Foto(s) del avance guardadas en Cloudflare R2");
      }
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir foto del avance", "err");
    } finally {
      setSubiendoEvidencia(false);
      e.target.value = "";
    }
  };

  // Enviar mensaje de texto en el chat interno de la orden
  const handleEnviarMensajeChatEtapa5 = async () => {
    const txt = etapa5ChatTexto.trim();
    if (!txt) return;

    const nuevoMsg: InternalChatMessage = {
      id: `chat-${Date.now()}`,
      author: etapa5ChatAutor || etapa5TecnicosAsignados[0]?.name || "Técnico",
      role: "Técnico",
      text: txt,
      createdAt: new Date().toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const actualizados = [...etapa5ChatMensajes, nuevoMsg];
    setEtapa5ChatMensajes(actualizados);
    setEtapa5ChatTexto("");

    if (ordenActiva) {
      await sincronizarEtapa5EnNeon({ internalChat: actualizados });
    }
  };

  // Grabar Nota de Voz en vivo desde el micrófono del celular o computador
  const handleToggleGrabacionNotaVozEtapa5 = async () => {
    if (grabandoAudioEtapa5) {
      // Detener grabación y subir a Cloudflare R2
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (timerGrabacionRef.current) {
        clearInterval(timerGrabacionRef.current);
        timerGrabacionRef.current = null;
      }
      setGrabandoAudioEtapa5(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      mostrarToast("Tu navegador no permite acceso directo al micrófono. Usa el botón de adjuntar audio.", "err");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      const startTime = Date.now();

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `nota-voz-${Date.now()}.${ext}`, { type: mimeType });

        try {
          setSubiendoAudioEtapa5(true);
          const audioUrl = await subirArchivoACloudflareR2(file, "taller_notas_voz");
          if (audioUrl) {
            const msgVoz: InternalChatMessage = {
              id: `voz-${Date.now()}`,
              author: etapa5ChatAutor || etapa5TecnicosAsignados[0]?.name || "Técnico",
              role: "Nota de Voz",
              text: `🎙️ Nota de voz (${durationSec}s)`,
              audioUrl,
              audioDurationSec: durationSec,
              createdAt: new Date().toLocaleTimeString("es-EC", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            const nuevoChat = [...etapa5ChatMensajes, msgVoz];
            setEtapa5ChatMensajes(nuevoChat);
            if (ordenActiva) {
              await sincronizarEtapa5EnNeon({ internalChat: nuevoChat });
            }
            mostrarToast("Nota de voz guardada en el chat de la orden");
          }
        } catch (err: any) {
          mostrarToast(err.message || "Error al subir nota de voz", "err");
        } finally {
          setSubiendoAudioEtapa5(false);
          setSegundosGrabacionAudio(0);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setGrabandoAudioEtapa5(true);
      setSegundosGrabacionAudio(0);
      timerGrabacionRef.current = setInterval(() => {
        setSegundosGrabacionAudio((s) => s + 1);
      }, 1000);
    } catch {
      mostrarToast("Permite el uso del micrófono para grabar la nota de voz", "err");
    }
  };

  // Registrar horas trabajadas por técnico en la orden
  const handleAgregarHorasTecnicoEtapa5 = async () => {
    const hrs = Math.max(0, parseInt(etapa5HoraCantHoras, 10) || 0);
    const mins = Math.max(0, parseInt(etapa5HoraCantMinutos, 10) || 0);

    if (hrs === 0 && mins === 0) {
      mostrarToast("Ingresa al menos los minutos u horas trabajadas", "err");
      return;
    }

    const tech = etapa5HoraTecnico || etapa5TecnicosAsignados[0]?.name || "Hernan Marquez";
    const tarea =
      etapa5HoraTarea.trim() ||
      ordenActiva?.items?.[0]?.name ||
      "Diagnóstico y reparación en taller";

    const nuevoRegistro: TechnicianHourEntry = {
      id: `hr-${Date.now()}`,
      technician: tech,
      hours: hrs,
      minutes: mins,
      taskDescription: tarea,
      date: new Date().toLocaleString("es-EC", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const actualizadas = [...etapa5HorasRegistros, nuevoRegistro];
    setEtapa5HorasRegistros(actualizadas);
    setEtapa5HoraTarea("");

    if (ordenActiva) {
      await sincronizarEtapa5EnNeon({ technicianHours: actualizadas });
    }
    mostrarToast(`Tiempo registrado para ${tech}: ${hrs}h ${mins}m`);
  };

  const handleEliminarHoraTecnicoEtapa5 = async (id: string) => {
    const actualizadas = etapa5HorasRegistros.filter((h) => h.id !== id);
    setEtapa5HorasRegistros(actualizadas);
    if (ordenActiva) {
      await sincronizarEtapa5EnNeon({ technicianHours: actualizadas });
    }
  };

  const handleToggleCronometroTecnico = async () => {
    if (cronometroTecnicoActivo) {
      setCronometroTecnicoActivo(false);
      const totalSec = cronometroTecnicoSegundos;
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.max(1, Math.floor((totalSec % 3600) / 60));
      const tech = empleadoLogueado.nombre;
      const nuevoRegistro: TechnicianHourEntry = {
        id: `hr-${Date.now()}`,
        technician: tech,
        hours: hrs,
        minutes: mins % 60,
        taskDescription: ordenActiva?.items?.[0]?.name || "Trabajo en taller",
        date: new Date().toLocaleString("es-EC", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      const actualizadas = [...etapa5HorasRegistros, nuevoRegistro];
      setEtapa5HorasRegistros(actualizadas);
      if (ordenActiva) {
        await sincronizarEtapa5EnNeon({ technicianHours: actualizadas });
      }
      setCronometroTecnicoSegundos(0);
      mostrarToast(`Cronómetro pausado: ${hrs}h ${mins}m registrados para ${tech}`);
    } else {
      setCronometroTecnicoActivo(true);
      mostrarToast(`⏱️ Cronómetro de horas iniciado para ${empleadoLogueado.nombre}`);
    }
  };

  const formatCronometro = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Guardar toda la Etapa 5: Reparación y pasar a Etapa 6: Estado y Aviso
  const handleGuardarEtapa5Reparacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenActiva) {
      setMostrarFlotanteEtapa5(false);
      setMostrarFlotanteEtapa6(true);
      return;
    }
    const updated = await sincronizarEtapa5EnNeon({});
    if (updated) {
      setMostrarFlotanteEtapa5(false);
      setMostrarFlotanteEtapa6(true);
      mostrarToast(
        `Etapa 5 guardada (${updated.progress}%). Ahora elige el estado y envía el aviso al cliente en Etapa 6.`
      );
    }
  };

  // ==========================================================================
  // MANEJADORES DE ETAPA 6: ESTADO Y AVISO
  // - Estados con el nombre y color que elijas
  // - Aviso por WhatsApp o correo en un clic (mensaje ya escrito al cambiar estado)
  // - Seguimiento en línea con número de orden y PIN
  // ==========================================================================
  const linkSeguimientoEnLinea = useMemo(() => {
    const ordNum = ordenActiva?.orderNumber || "OT-DEMO";
    const pin = etapa6TrackingPin || ordenActiva?.trackingPin || "4821";
    if (typeof window === "undefined") {
      return `/taller/seguimiento?orden=${encodeURIComponent(ordNum)}&pin=${encodeURIComponent(pin)}`;
    }
    return `${window.location.origin}/taller/seguimiento?orden=${encodeURIComponent(
      ordNum
    )}&pin=${encodeURIComponent(pin)}`;
  }, [ordenActiva, etapa6TrackingPin]);

  const generarMensajeAvisoClienteEtapa6 = useCallback(
    (estadoNombre: string, customPin?: string) => {
      const clienteNom =
        ordenActiva?.client ||
        clienteEncontrado?.name ||
        clienteSeleccionadoEtapa1?.name ||
        etapa1Nombre ||
        "Cliente";
      const vehDesc =
        ordenActiva?.vehicle ||
        `${etapa2Marca} ${etapa2Modelo}`.trim() ||
        "tu vehículo";
      const placa = ordenActiva?.plate || etapa2Placa || "S/P";
      const ordNum = ordenActiva?.orderNumber || "OT-EN-CURSO";
      const pin = customPin || etapa6TrackingPin || ordenActiva?.trackingPin || "4821";
      const totalOrden = Number(ordenActiva?.totalCost || 0).toFixed(2);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const urlSeguimiento = `${origin}/taller/seguimiento?orden=${encodeURIComponent(
        ordNum
      )}&pin=${encodeURIComponent(pin)}`;

      const lower = estadoNombre.toLowerCase();
      let cuerpoContexto = `Tu orden ha avanzado al estado *${estadoNombre}*.`;

      if (lower.includes("diagn") || lower.includes("recibido")) {
        cuerpoContexto = `Hemos recibido tu vehículo en nuestro taller y el equipo técnico ha iniciado el diagnóstico.`;
      } else if (lower.includes("aprobaci") || lower.includes("presupuesto")) {
        cuerpoContexto = `El diagnóstico está listo y el presupuesto se encuentra pendiente de tu confirmación.`;
      } else if (lower.includes("repuesto")) {
        cuerpoContexto = `Estamos gestionando los repuestos e insumos requeridos para continuar con el trabajo.`;
      } else if (lower.includes("reparaci") || lower.includes("proceso")) {
        cuerpoContexto = `Nuestros especialistas se encuentran trabajando en la reparación y mantenimiento de tu vehículo.`;
      } else if (lower.includes("calidad") || lower.includes("lavado")) {
        cuerpoContexto = `Los trabajos mecánicos finalizaron y tu vehículo está en control de calidad y alistamiento.`;
      } else if (lower.includes("listo") || lower.includes("entregar")) {
        cuerpoContexto = `¡Tu vehículo ya está *Listo para Entregar*! El valor total de la orden es *$${totalOrden}*. Puedes pasar a retirarlo.`;
      } else if (lower.includes("entregado")) {
        cuerpoContexto = `Gracias por confiar en nuestro centro automotriz. Tu orden ha quedado registrada como *Entregada*.`;
      }

      return `Hola *${clienteNom}*, te escribimos del Taller Automotriz sobre tu vehículo *${vehDesc}* (${placa}).\n\n📌 *Estado de la Orden #${ordNum}:* ${estadoNombre}\n${cuerpoContexto}\n\n🔎 *Sigue tu orden en línea con fotos y avance en vivo:*\n${urlSeguimiento}\n• *N° de Orden:* ${ordNum}\n• *PIN de seguridad:* ${pin}`;
    },
    [
      ordenActiva,
      clienteEncontrado,
      clienteSeleccionadoEtapa1,
      etapa1Nombre,
      etapa2Marca,
      etapa2Modelo,
      etapa2Placa,
      etapa6TrackingPin,
    ]
  );

  const sincronizarEtapa6EnNeon = async (partial: {
    status?: string;
    statusColor?: CustomOrderStatus["color"];
    progress?: number;
    trackingPin?: string;
    customStatuses?: CustomOrderStatus[];
    clientPhone?: string;
    clientEmail?: string;
    notificationChannel?: "WHATSAPP" | "CORREO" | null;
    notificationMessage?: string;
  }) => {
    if (!ordenActiva) return null;

    try {
      setGuardandoEtapa6(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_6_ESTADO_AVISO",
          orderId: ordenActiva.id,
          status: partial.status ?? etapa6EstadoSeleccionado,
          statusColor: partial.statusColor ?? etapa6ColorSeleccionado,
          progress: partial.progress ?? etapa6ProgresoSeleccionado,
          trackingPin: partial.trackingPin ?? etapa6TrackingPin,
          customStatuses: partial.customStatuses ?? etapa6EstadosLista,
          clientPhone: partial.clientPhone ?? etapa6ClienteTelefono,
          clientEmail: partial.clientEmail ?? etapa6ClienteEmail,
          notificationChannel: partial.notificationChannel || null,
          notificationMessage: partial.notificationMessage ?? etapa6MensajeAviso,
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        return data.activeOrder as UnifiedOrder;
      }
    } catch (err) {
      console.error("Error sincronizando Etapa 6:", err);
    } finally {
      setGuardandoEtapa6(false);
    }
    return null;
  };

  // Al cambiar el estado, la app actualiza el estado y escribe automáticamente el aviso listo para enviar
  const handleSeleccionarEstadoEtapa6 = async (st: CustomOrderStatus) => {
    setEtapa6EstadoSeleccionado(st.name);
    setEtapa6ColorSeleccionado(st.color);
    setEtapa6ProgresoSeleccionado(st.progress);
    const msgPreescrito = generarMensajeAvisoClienteEtapa6(st.name);
    setEtapa6MensajeAviso(msgPreescrito);

    if (ordenActiva) {
      await sincronizarEtapa6EnNeon({
        status: st.name,
        statusColor: st.color,
        progress: st.progress,
        notificationMessage: msgPreescrito,
      });
      mostrarToast(`Estado cambiado a "${st.name}" • Aviso al cliente listo para enviar`);
    }
  };

  // Crear un nuevo estado con el nombre y color que elijas
  const handleCrearEstadoPersonalizadoEtapa6 = async () => {
    const nombre = etapa6NuevoEstadoNombre.trim();
    if (!nombre) {
      mostrarToast("Escribe el nombre del estado personalizado", "err");
      return;
    }

    const nuevoEstado: CustomOrderStatus = {
      id: `cust-${Date.now()}`,
      name: nombre,
      color: etapa6NuevoEstadoColor,
      progress: etapa6ProgresoSeleccionado || 75,
      isCustom: true,
    };

    const nuevaLista = [
      ...etapa6EstadosLista.filter((s) => s.name.toLowerCase() !== nombre.toLowerCase()),
      nuevoEstado,
    ];

    setEtapa6EstadosLista(nuevaLista);
    setEtapa6NuevoEstadoNombre("");
    setEtapa6EstadoSeleccionado(nuevoEstado.name);
    setEtapa6ColorSeleccionado(nuevoEstado.color);
    const msgPreescrito = generarMensajeAvisoClienteEtapa6(nuevoEstado.name);
    setEtapa6MensajeAviso(msgPreescrito);

    if (ordenActiva) {
      await sincronizarEtapa6EnNeon({
        status: nuevoEstado.name,
        statusColor: nuevoEstado.color,
        customStatuses: nuevaLista,
        notificationMessage: msgPreescrito,
      });
    }
    mostrarToast(`Estado "${nuevoEstado.name}" creado y seleccionado`);
  };

  const handleEliminarEstadoPersonalizadoEtapa6 = async (id: string) => {
    const filtrados = etapa6EstadosLista.filter((s) => s.id !== id);
    setEtapa6EstadosLista(filtrados);
    if (ordenActiva) {
      await sincronizarEtapa6EnNeon({ customStatuses: filtrados });
    }
  };

  const handleGenerarNuevoPinEtapa6 = async () => {
    const nuevoPin = String(Math.floor(1000 + Math.random() * 9000));
    setEtapa6TrackingPin(nuevoPin);
    const nuevoMsg = generarMensajeAvisoClienteEtapa6(etapa6EstadoSeleccionado, nuevoPin);
    setEtapa6MensajeAviso(nuevoMsg);
    if (ordenActiva) {
      await sincronizarEtapa6EnNeon({
        trackingPin: nuevoPin,
        notificationMessage: nuevoMsg,
      });
    }
    mostrarToast(`Nuevo PIN de seguimiento generado: ${nuevoPin}`);
  };

  const handleCopiarLinkSeguimientoEtapa6 = async () => {
    try {
      await navigator.clipboard.writeText(linkSeguimientoEnLinea);
      setCopiadoLinkSeguimiento(true);
      mostrarToast("Link de seguimiento en línea copiado");
      setTimeout(() => setCopiadoLinkSeguimiento(false), 3000);
    } catch {
      mostrarToast("No se pudo copiar automáticamente", "err");
    }
  };

  // Aviso por WhatsApp en un clic
  const handleEnviarWhatsAppAvisoEtapa6 = async () => {
    const telRaw =
      etapa6ClienteTelefono.trim() ||
      ordenActiva?.clientPhone ||
      clienteEncontrado?.phone ||
      clienteSeleccionadoEtapa1?.phone ||
      etapa1Telefono ||
      "";
    const digits = telRaw.replace(/\D/g, "");
    const texto =
      etapa6MensajeAviso.trim() ||
      generarMensajeAvisoClienteEtapa6(etapa6EstadoSeleccionado);

    if (ordenActiva) {
      await sincronizarEtapa6EnNeon({
        notificationChannel: "WHATSAPP",
        notificationMessage: texto,
        clientPhone: telRaw,
      });
    }

    const phoneFormatted = digits
      ? digits.startsWith("593") || digits.length > 10
        ? digits
        : `593${digits.replace(/^0/, "")}`
      : "";

    const waUrl = phoneFormatted
      ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;

    window.open(waUrl, "_blank");
  };

  // Aviso por Correo en un clic
  const handleEnviarCorreoAvisoEtapa6 = async () => {
    const emailDestino =
      etapa6ClienteEmail.trim() ||
      ordenActiva?.clientEmail ||
      clienteEncontrado?.email ||
      clienteSeleccionadoEtapa1?.email ||
      etapa1Email ||
      "";
    const texto =
      etapa6MensajeAviso.trim() ||
      generarMensajeAvisoClienteEtapa6(etapa6EstadoSeleccionado);
    const ordNum = ordenActiva?.orderNumber || "OT";
    const vehDesc = ordenActiva?.vehicle || "Vehículo";
    const asunto = `Actualización de tu orden #${ordNum} (${etapa6EstadoSeleccionado}) - ${vehDesc}`;

    if (ordenActiva) {
      await sincronizarEtapa6EnNeon({
        notificationChannel: "CORREO",
        notificationMessage: texto,
        clientEmail: emailDestino,
      });
    }

    const textoLimpio = texto.replace(/\*/g, "");
    const mailtoUrl = `mailto:${encodeURIComponent(
      emailDestino
    )}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(textoLimpio)}`;

    window.location.href = mailtoUrl;
    mostrarToast(
      emailDestino
        ? `Abriendo cliente de correo para ${emailDestino}`
        : "Abriendo cliente de correo con el aviso pre-escrito"
    );
  };

  const handleGuardarEtapa6EstadoAviso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenActiva) {
      setMostrarFlotanteEtapa6(false);
      setMostrarFlotanteEtapa7(true);
      return;
    }
    const updated = await sincronizarEtapa6EnNeon({});
    if (updated) {
      setMostrarFlotanteEtapa6(false);
      setMostrarFlotanteEtapa7(true);
      mostrarToast(
        `Etapa 6 guardada ("${updated.status}"). Ahora completa la Entrega y Firma en Etapa 7.`
      );
    }
  };

  // ==========================================================================
  // MANEJADORES DE ETAPA 7: ENTREGA Y FIRMA
  // (1. Detalle de la entrega, 2. Informe técnico, 3. Firma en el taller o a distancia)
  // ==========================================================================
  const linkFirmaRemotaEtapa7 = useMemo(() => {
    const token =
      ordenActiva?.quoteToken ||
      ordenActiva?.orderNumber ||
      ordenActiva?.id ||
      "OT-ENTREGA";
    if (typeof window === "undefined") {
      return `/taller/entrega/${encodeURIComponent(token)}`;
    }
    return `${window.location.origin}/taller/entrega/${encodeURIComponent(token)}`;
  }, [ordenActiva]);

  const obtenerCoordsCanvasEtapa7 = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasFirmaEtapa7Ref.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const iniciarTrazoFirmaEtapa7 = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasFirmaEtapa7Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = obtenerCoordsCanvasEtapa7(e);
    dibujandoFirmaEtapa7Ref.current = true;
    tieneTrazosFirmaEtapa7Ref.current = true;
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moverTrazoFirmaEtapa7 = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!dibujandoFirmaEtapa7Ref.current) return;
    const canvas = canvasFirmaEtapa7Ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = obtenerCoordsCanvasEtapa7(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const terminarTrazoFirmaEtapa7 = () => {
    if (dibujandoFirmaEtapa7Ref.current && canvasFirmaEtapa7Ref.current && tieneTrazosFirmaEtapa7Ref.current) {
      setEtapa7FirmaDataUrl(canvasFirmaEtapa7Ref.current.toDataURL("image/png"));
    }
    dibujandoFirmaEtapa7Ref.current = false;
  };

  const limpiarCanvasFirmaEtapa7 = () => {
    const canvas = canvasFirmaEtapa7Ref.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    tieneTrazosFirmaEtapa7Ref.current = false;
    setEtapa7FirmaDataUrl(null);
  };

  const sincronizarEtapa7EnNeon = async (partial?: {
    deliveryChecklist?: DeliveryChecklistData;
    technicalReportText?: string;
    technicalReportUrl?: string | null;
    deliverySignatureUrl?: string | null;
    deliverySignedBy?: string;
    deliveryStatus?: string;
  }) => {
    if (!ordenActiva) return null;

    let firmaActual =
      partial?.deliverySignatureUrl !== undefined
        ? partial.deliverySignatureUrl
        : etapa7FirmaDataUrl;

    if (!firmaActual && canvasFirmaEtapa7Ref.current && tieneTrazosFirmaEtapa7Ref.current) {
      firmaActual = canvasFirmaEtapa7Ref.current.toDataURL("image/png");
      setEtapa7FirmaDataUrl(firmaActual);
    }

    try {
      setGuardandoEtapa7(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_7_ENTREGA_FIRMA",
          orderId: ordenActiva.id,
          deliveryChecklist: partial?.deliveryChecklist ?? etapa7Checklist,
          technicalReportText: partial?.technicalReportText ?? etapa7InformeTecnico,
          technicalReportUrl:
            partial?.technicalReportUrl !== undefined
              ? partial.technicalReportUrl
              : etapa7InformeAdjuntoUrl,
          deliverySignatureUrl: firmaActual,
          deliverySignedBy:
            partial?.deliverySignedBy ??
            (etapa7FirmadoPor.trim() ||
              etapa7Checklist.recibidoPorNombre ||
              ordenActiva.client),
          deliveryStatus: partial?.deliveryStatus,
          nextOilChangeKm: ordenActiva.nextOilChangeKm,
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        return data.activeOrder as UnifiedOrder;
      }
    } catch (err) {
      console.error("Error sincronizando Etapa 7:", err);
    } finally {
      setGuardandoEtapa7(false);
    }
    return null;
  };

  const handleSubirInformeTecnicoEtapa7 = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSubiendoInformeEtapa7(true);
      const url = await subirArchivoACloudflareR2(file, "taller_informes");
      if (url) {
        setEtapa7InformeAdjuntoUrl(url);
        if (ordenActiva) {
          await sincronizarEtapa7EnNeon({ technicalReportUrl: url });
        }
        mostrarToast("Informe técnico adjuntado en Cloudflare R2");
      }
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir el informe técnico", "err");
    } finally {
      setSubiendoInformeEtapa7(false);
      e.target.value = "";
    }
  };

  const handleCopiarLinkFirmaEtapa7 = async () => {
    try {
      await navigator.clipboard.writeText(linkFirmaRemotaEtapa7);
      setCopiadoLinkFirmaEtapa7(true);
      mostrarToast("Link de firma a distancia copiado al portapapeles");
      setTimeout(() => setCopiadoLinkFirmaEtapa7(false), 3000);
    } catch {
      mostrarToast("No se pudo copiar automáticamente", "err");
    }
  };

  // Si el cliente no está en el taller, enviar aceptación por correo para firmar desde su celular
  const handleEnviarCorreoAceptacionEtapa7 = async () => {
    const emailDestino =
      etapa6ClienteEmail.trim() ||
      ordenActiva?.clientEmail ||
      clienteEncontrado?.email ||
      clienteSeleccionadoEtapa1?.email ||
      etapa1Email ||
      "";
    const clienteNom = ordenActiva?.client || "Cliente";
    const vehDesc = ordenActiva?.vehicle || "su vehículo";
    const placa = ordenActiva?.plate || "";
    const ordNum = ordenActiva?.orderNumber || "OT";

    if (ordenActiva) {
      await sincronizarEtapa7EnNeon({
        deliveryStatus: "Enviado para Firma Remota",
      });
    }

    const asunto = `Acta de Entrega e Informe Técnico para Firma Digital - Orden #${ordNum} (${placa})`;
    const cuerpo = `Hola ${clienteNom},\n\nTu vehículo ${vehDesc} (${placa}) con Orden #${ordNum} ha finalizado su atención en nuestro taller.\n\nAdjuntamos el resumen del Informe Técnico:\n${etapa7InformeTecnico}\n\n👉 Por favor revisa el detalle de la entrega y firma la recepción desde tu celular en este enlace:\n${linkFirmaRemotaEtapa7}\n\nGracias por tu confianza.`;

    window.location.href = `mailto:${encodeURIComponent(
      emailDestino
    )}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;

    mostrarToast(
      emailDestino
        ? `Enviando enlace de firma móvil por correo a ${emailDestino}`
        : "Abriendo correo con el enlace para firma desde el celular"
    );
  };

  const handleEnviarWhatsAppAceptacionEtapa7 = async () => {
    const telRaw =
      etapa6ClienteTelefono.trim() ||
      ordenActiva?.clientPhone ||
      clienteEncontrado?.phone ||
      clienteSeleccionadoEtapa1?.phone ||
      etapa1Telefono ||
      "";
    const digits = telRaw.replace(/\D/g, "");
    const clienteNom = ordenActiva?.client || "Cliente";
    const vehDesc = ordenActiva?.vehicle || "su vehículo";
    const placa = ordenActiva?.plate || "";
    const ordNum = ordenActiva?.orderNumber || "OT";

    if (ordenActiva) {
      await sincronizarEtapa7EnNeon({
        deliveryStatus: "Enviado para Firma Remota",
      });
    }

    const msg = `Hola *${clienteNom}*, tu vehículo *${vehDesc}* (${placa}) con Orden *#${ordNum}* está listo para su entrega.\n\n✍️ *Revisa el informe técnico y firma la recepción desde tu celular aquí:*\n${linkFirmaRemotaEtapa7}`;
    const phoneFormatted = digits
      ? digits.startsWith("593") || digits.length > 10
        ? digits
        : `593${digits.replace(/^0/, "")}`
      : "";

    window.open(
      phoneFormatted
        ? `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  // Autogeneración del Informe Técnico en base a trabajos ejecutados en etapas previas
  const handleAutogenerarInformeTecnico = () => {
    if (!ordenActiva) return;
    const itemsTexto = (ordenActiva.items || [])
      .map((i, idx) => `${idx + 1}. ${i.name} (Cant: ${i.qty || 1}${i.price ? ` - ${(i.price * (i.qty || 1)).toFixed(2)}` : ""})`)
      .join("\n");
    const hallazgosTexto = (ordenActiva.inspectionFindings || [])
      .map((h) => `- [${(h.vista || "general").toUpperCase()}] ${h.descripcion || h.tipo || "Inspección verificada"}`)
      .join("\n");
    const kms = ordenActiva.mileage ? `${ordenActiva.mileage.toLocaleString()} km` : "Registrado en orden";
    const fechaHoy = new Date().toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const textoGenerado = `INFORME TÉCNICO DE RECEPCIÓN Y ENTREGA
============================================
Fecha: ${fechaHoy} | Orden #${ordenActiva.orderNumber}
Vehículo: ${ordenActiva.vehicle} | Placa: ${ordenActiva.plate}
Cliente: ${ordenActiva.client}
Kilometraje: ${kms} | Nivel Combustible: ${ordenActiva.fuelLevel || "1/2"}

1. DETALLE DE TRABAJOS Y REPUESTOS EJECUTADOS:
${itemsTexto || "• Mantenimiento y revisión general completada conforme al plan."}

2. INSPECCIÓN VISUAL Y ESTADO PREVIO:
${hallazgosTexto || "• Sin daños mayores de carrocería ni fallas estructurales previas."}

3. DIAGNÓSTICO FINAL Y RECOMENDACIÓN TÉCNICA:
Se verificó el torque de pernos, ausencia de fugas, calibración de neumáticos y niveles de fluidos de acuerdo a especificaciones del fabricante.
Próximo servicio preventivo recomendado a los 5,000 km o 6 meses.`;

    setEtapa7InformeTecnico(textoGenerado);
    mostrarToast("Informe técnico generado automáticamente con los datos de la orden.");
  };

  const handleGuardarEtapa7EntregaFirma = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ordenActiva) {
      setEtapaActiva(7);
      return;
    }
    const updated = await sincronizarEtapa7EnNeon();
    if (updated) {
      mostrarToast(`Entrega y firma guardadas para #${updated.orderNumber}.`);
      setEtapaActiva(7); // Desliza automáticamente a Etapa 08 para Oficina/Caja
    }
  };

  // Registrar abonos, pagos parciales o totales en Etapa 8 (conecta a Neon DB y POS)
  const handleRegistrarAbonoPagoEtapa8 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ordenActiva) return;
    const monto = parseFloat(etapa8AbonoMonto);
    if (isNaN(monto) || monto <= 0) {
      mostrarToast("Ingresa un monto válido para el abono o pago", "err");
      return;
    }

    try {
      setEtapa8RegistrandoPago(true);
      const nuevoPago: OrderPaymentItem = {
        id: `pay-${Date.now()}`,
        amount: monto,
        method: etapa8AbonoMetodo,
        reference: etapa8AbonoReferencia.trim() || `Abono ${etapa8AbonoMetodo}`,
        date: new Date().toLocaleDateString("es-EC"),
      };

      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_8_COBRO_DOCUMENTO",
          orderId: ordenActiva.id,
          newPayment: nuevoPago,
          payments: [...(ordenActiva.payments || []), nuevoPago],
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        mostrarToast(`Abono de ${monto.toFixed(2)} registrado correctamente.`);
      } else {
        const pagosActuales = ordenActiva.payments || [];
        const nuevosPagos = [...pagosActuales, nuevoPago];
        const totalPagado = nuevosPagos.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const totalOrden = Number(ordenActiva.totalCost) || Number(calculosPresupuestoEtapa4.total) || 0;
        const balanceDue = Math.max(0, totalOrden - totalPagado);
        const optOrder: UnifiedOrder = {
          ...ordenActiva,
          payments: nuevosPagos,
          totalPaid: totalPagado,
          balanceDue: balanceDue,
          status: balanceDue <= 0 ? "Entregado" : "Listo para Entregar",
        };
        setOrdenActiva(optOrder);
        setAutosEnPista((prev) => prev.map((o) => (o.id === ordenActiva.id ? optOrder : o)));
        mostrarToast(`Abono de ${monto.toFixed(2)} registrado.`);
      }
      setEtapa8AbonoMonto("");
      setEtapa8AbonoReferencia("");
    } catch (err) {
      mostrarToast("Abono registrado localmente");
    } finally {
      setEtapa8RegistrandoPago(false);
    }
  };

  // Abrir una tarjeta en modo flotante reseteando su buscador y filtro
  const handleAbrirTarjetaFlotante = (cardId: string) => {
    setActiveCardId(cardId);
    setBusquedaFlotante("");
    setFiltroFlotante("TODOS");
    setMostrarMenuFiltroFlotante(false);
  };

  // ==========================================================================
  // BLOQUE 1: BUSCADOR INTELIGENTE AUTOMÁTICO POR PLACA O CÉDULA E INGRESO RÁPIDO
  // ==========================================================================
  const handleBuscarPlacaOCedula = useCallback(
    async (e?: React.FormEvent, forcedQuery?: string, silent?: boolean) => {
      if (e) e.preventDefault();
      const q = (forcedQuery !== undefined ? forcedQuery : searchQuery).trim();
      if (!q) {
        setVehiculoEncontrado(null);
        setClienteEncontrado(null);
        setMostrarRegistroExpress(false);
        return;
      }

      // 1. Verificar coincidencia inmediata en Autos en Pista locales
      const qUpper = q.toUpperCase();
      const enPistaLocal = autosEnPista.find(
        (a) =>
          a.plate.toUpperCase() === qUpper ||
          (a.clientIdDoc && a.clientIdDoc.toUpperCase() === qUpper)
      );
      if (enPistaLocal) {
        setOrdenActiva(enPistaLocal);
        setKmActualInput(enPistaLocal.mileage ? String(enPistaLocal.mileage) : "");
        setFotosRecepcion(enPistaLocal.receptionPhotos || []);
      }

      try {
        setBuscandoVehiculo(true);
        const res = await fetch(`/api/taller/operacion?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        if (data.success && data.found) {
          setMostrarRegistroExpress(false);
          setVehiculoEncontrado(data.vehicle);
          setClienteEncontrado(data.customer);
          setHistorialVehiculo(data.history || []);
          setKmActualInput(data.vehicle?.mileage ? String(data.vehicle.mileage) : "");
          setFotosRecepcion(
            Array.isArray(data.vehicle?.photos) ? data.vehicle.photos.slice(0, 4) : []
          );

          if (data.activeOrder) {
            setOrdenActiva(data.activeOrder);
            setAutosEnPista((prev) => {
              const exists = prev.some((o) => o.id === data.activeOrder.id);
              return exists
                ? prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
                : [data.activeOrder, ...prev];
            });
            if (!silent) {
              mostrarToast(
                `Orden activa ${data.activeOrder.orderNumber} seleccionada (${
                  data.vehicle?.plate || q
                })`
              );
            }
          } else if (data.vehicle) {
            await handleAbrirOrdenParaVehiculoExistente(
              data.vehicle,
              data.vehicle.mileage,
              data.vehicle.photos || []
            );
          }
        } else {
          setVehiculoEncontrado(null);
          setClienteEncontrado(null);
          setHistorialVehiculo([]);
          const soloDigitos = /^\d+$/.test(q);
          if (soloDigitos) {
            setRegCedula(data.suggestedIdentification || q);
          } else {
            setRegPlaca(data.suggestedPlate || qUpper);
          }
          setMostrarRegistroExpress(true);
          if (!silent) {
            mostrarToast("No encontrado. Completa el Ingreso Rápido para iniciar la orden.");
          }
        }
      } catch (err) {
        if (!silent) {
          mostrarToast("Error al consultar en Neon PostgreSQL", "err");
        }
      } finally {
        setBuscandoVehiculo(false);
      }
    },
    [searchQuery, autosEnPista, mostrarToast]
  );

  // Disparo automático del Buscador Inteligente al digitar Placa o Cédula
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setVehiculoEncontrado(null);
      setClienteEncontrado(null);
      setMostrarRegistroExpress(false);
      return;
    }
    if (q.length < 3) return;

    const timer = setTimeout(() => {
      handleBuscarPlacaOCedula(undefined, q, true);
    }, 380);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAbrirOrdenParaVehiculoExistente = async (
    vehiculoTarget?: any,
    customKm?: string | number,
    customPhotos?: string[]
  ) => {
    const v = vehiculoTarget || vehiculoEncontrado;
    if (!v) return;

    try {
      setSincronizandoOrden(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ABRIR_ORDEN_VEHICULO",
          vehicleId: v.id,
          plate: v.plate,
          mileage: customKm !== undefined ? customKm : kmActualInput,
          receptionPhotos: customPhotos !== undefined ? customPhotos : fotosRecepcion,
          mechanic: ordenActiva?.mechanic || mecanicos[0] || "Carlos Rodríguez",
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) => {
          const exists = prev.some((o) => o.id === data.activeOrder.id);
          return exists
            ? prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
            : [data.activeOrder, ...prev];
        });
        mostrarToast(`Orden ${data.activeOrder.orderNumber} lista para ${v.plate}`);
      }
    } catch (err) {
      mostrarToast("No se pudo abrir la orden para el vehículo", "err");
    } finally {
      setSincronizandoOrden(false);
    }
  };

  const handleGuardarRegistroExpress = async (e: React.FormEvent) => {
    e.preventDefault();
    const marcaModeloRaw = `${regMarca} ${regModelo}`.trim();
    if (!regPlaca.trim() || !regNombres.trim() || !marcaModeloRaw) {
      mostrarToast("Placa, Nombre y Marca/Modelo son obligatorios", "err");
      return;
    }

    const partesVeh = regMarca.trim().split(/\s+/);
    const marcaFinal = partesVeh[0] || "Vehículo";
    const modeloFinal =
      regModelo.trim() ||
      (partesVeh.length > 1 ? partesVeh.slice(1).join(" ") : "General");

    try {
      setGuardandoExpress(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REGISTRO_EXPRESS",
          identificacion: regCedula,
          nombres: regNombres,
          telefono: regTelefono,
          email: regEmail,
          placa: regPlaca,
          tipoVehiculo: regTipoVehiculo,
          marca: marcaFinal,
          modelo: modeloFinal,
          anio: regAnio,
          color: regColor,
          kilometraje: regKilometraje,
          receptionPhotos: fotosRecepcion,
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        let ordenFinal = data.activeOrder;

        // Iniciar la orden automáticamente (activa el cronómetro startedAt en Neon)
        try {
          const startRes = await fetch("/api/taller/operacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "INICIAR_ORDEN",
              orderId: data.activeOrder.id,
              mechanic: data.activeOrder.mechanic || mecanicos[0] || "Carlos Rodríguez",
            }),
          });
          const startData = await startRes.json();
          if (startData.success && startData.activeOrder) {
            ordenFinal = startData.activeOrder;
          }
        } catch {
          // Si falla el inicio automático del cronómetro, conservamos la orden creada
        }

        setMostrarRegistroExpress(false);
        setVehiculoEncontrado(data.vehicle);
        setClienteEncontrado(data.customer);
        setKmActualInput(String(data.vehicle?.mileage || regKilometraje || ""));
        setOrdenActiva(ordenFinal);
        setAutosEnPista((prev) => [
          ordenFinal,
          ...prev.filter((o) => o.id !== ordenFinal.id),
        ]);
        mostrarToast(
          `Ingreso Rápido guardado y Orden ${ordenFinal.orderNumber} iniciada en pista`
        );
      } else {
        mostrarToast(data.error || "Error al registrar vehículo", "err");
      }
    } catch (err) {
      mostrarToast("Error de conexión al guardar Ingreso Rápido", "err");
    } finally {
      setGuardandoExpress(false);
    }
  };

  // ==========================================================================
  // SUBIDA DE FOTOS A CLOUDFLARE R2 (RECEPCIÓN Y EVIDENCIA DE ORDEN)
  // ==========================================================================
  const subirArchivoACloudflareR2 = async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success && data.url) {
      return data.url;
    }
    throw new Error(data.error || "Error al subir imagen a Cloudflare R2");
  };

  const handleSubirFotoRecepcion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fotosRecepcion.length >= 4) {
      mostrarToast("Máximo 4 fotos de recepción permitidas", "err");
      return;
    }

    const archivosSeleccionados = Array.from(files);
    if (fileInputRecepcionRef.current) fileInputRecepcionRef.current.value = "";

    // Desliza inmediatamente a la Vista 2 (Servicios del Empleado) sin bloquear la pantalla
    setPasoDeslizable(1);
    mostrarToast("Subiendo foto(s) a Cloudflare R2 en segundo plano...");

    // Subida asíncrona en segundo plano (non-blocking)
    void (async () => {
      try {
        setSubiendoFotoRecepcion(true);
        const nuevosUrls: string[] = [];
        const limite = Math.min(archivosSeleccionados.length, 4 - fotosRecepcion.length);

        for (let i = 0; i < limite; i++) {
          const url = await subirArchivoACloudflareR2(archivosSeleccionados[i], "taller_recepcion");
          if (url) nuevosUrls.push(url);
        }

        const actualizadas = [...fotosRecepcion, ...nuevosUrls].slice(0, 4);
        setFotosRecepcion(actualizadas);

        if (ordenActiva) {
          await sincronizarOrdenEnNeon({
            receptionPhotos: actualizadas,
            mileage: kmActualInput ? parseInt(kmActualInput, 10) : ordenActiva.mileage,
          });
        }
        mostrarToast("Foto(s) almacenadas en Cloudflare R2");
      } catch (err: any) {
        mostrarToast(err.message || "Error al subir foto a R2", "err");
      } finally {
        setSubiendoFotoRecepcion(false);
      }
    })();
  };

  const handleSubirFotoEvidencia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !ordenActiva) return;

    const archivosSeleccionados = Array.from(files);
    if (fileInputEvidenciaRef.current) fileInputEvidenciaRef.current.value = "";

    void (async () => {
      try {
        setSubiendoEvidencia(true);
        const nuevosUrls: string[] = [];
        for (let i = 0; i < archivosSeleccionados.length; i++) {
          const url = await subirArchivoACloudflareR2(archivosSeleccionados[i], "taller_evidencia");
          if (url) nuevosUrls.push(url);
        }

        const nuevasEvidencias = [...(ordenActiva.evidencePhotos || []), ...nuevosUrls];
        await sincronizarOrdenEnNeon({ evidencePhotos: nuevasEvidencias });
        mostrarToast("Evidencia fotográfica vinculada en Cloudflare R2");
      } catch (err: any) {
        mostrarToast(err.message || "Error al subir evidencia a R2", "err");
      } finally {
        setSubiendoEvidencia(false);
      }
    })();
  };

  // ==========================================================================
  // BLOQUE 2 Y 3: SINCRONIZACIÓN EN TIEMPO REAL DE LA ORDEN UNIFICADA (#OT)
  // ==========================================================================
  const sincronizarOrdenEnNeon = async (partial: {
    items?: OrderItem[];
    mechanic?: string;
    mileage?: number | null;
    nextOilChangeKm?: number | null;
    notes?: string;
    receptionPhotos?: string[];
    evidencePhotos?: string[];
    status?: string;
    fuelLevel?: string;
    generalCondition?: string;
    startTimer?: boolean;
  }) => {
    if (!ordenActiva) return;

    try {
      setSincronizandoOrden(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTUALIZAR_ORDEN",
          orderId: ordenActiva.id,
          items: partial.items ?? ordenActiva.items,
          mechanic: partial.mechanic ?? ordenActiva.mechanic,
          mileage: partial.mileage !== undefined ? partial.mileage : ordenActiva.mileage,
          nextOilChangeKm:
            partial.nextOilChangeKm !== undefined
              ? partial.nextOilChangeKm
              : ordenActiva.nextOilChangeKm,
          notes: partial.notes !== undefined ? partial.notes : ordenActiva.notes,
          receptionPhotos: partial.receptionPhotos ?? ordenActiva.receptionPhotos,
          evidencePhotos: partial.evidencePhotos ?? ordenActiva.evidencePhotos,
          status: partial.status ?? ordenActiva.status,
          fuelLevel: partial.fuelLevel !== undefined ? partial.fuelLevel : ordenActiva.fuelLevel,
          generalCondition:
            partial.generalCondition !== undefined
              ? partial.generalCondition
              : ordenActiva.generalCondition,
          startTimer: partial.startTimer,
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) => {
          const exists = prev.some((o) => o.id === data.activeOrder.id);
          return exists
            ? prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
            : [data.activeOrder, ...prev];
        });
      }
    } catch (err) {
      console.error("Error al sincronizar orden:", err);
    } finally {
      setSincronizandoOrden(false);
    }
  };

  // Agregar o quitar un servicio rápido de las tarjetas asignando empleado_id e iniciando cronómetro
  const handleToggleServicioPreset = async (cardTitle: string, preset: ServicePreset) => {
    if (!ordenActiva) {
      mostrarToast("Primero selecciona un auto en pista o busca una placa arriba", "err");
      return;
    }

    const existe = ordenActiva.items.find(
      (i) =>
        (i.code === preset.code || i.name.toLowerCase() === preset.name.toLowerCase()) &&
        (!i.empleado_id || i.empleado_id === empleadoLogueado.id)
    );

    let nuevosItems: OrderItem[];
    let iniciarTimer = false;

    if (existe) {
      nuevosItems = ordenActiva.items.filter((i) => i.id !== existe.id);
    } else {
      const nuevo: OrderItem = {
        id: `srv-${preset.code}-${Date.now()}`,
        type: "SERVICE",
        category: cardTitle,
        code: preset.code,
        name: preset.name,
        price: preset.price,
        qty: 1,
        status: "Pendiente",
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      };
      nuevosItems = [...ordenActiva.items, nuevo];
      iniciarTimer = true;
    }

    // Actualización optimista inmediata con inicio de cronómetro si aún no estaba activo
    const startedOptimistic =
      iniciarTimer && !ordenActiva.startedAt
        ? new Date().toISOString()
        : ordenActiva.startedAt;

    setOrdenActiva({
      ...ordenActiva,
      items: nuevosItems,
      startedAt: startedOptimistic,
      status: iniciarTimer && ordenActiva.status === "En Pista" ? "En Proceso" : ordenActiva.status,
    });

    await sincronizarOrdenEnNeon({
      items: nuevosItems,
      startTimer: iniciarTimer,
    });
  };

  // Agregar servicio personalizado desde la tarjeta "Otro" (SIN precios para el empleado)
  const handleAgregarServicioOtroCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenActiva) {
      mostrarToast("Primero selecciona un auto en pista o busca una placa arriba", "err");
      return;
    }
    if (!otroNombreCustom.trim()) {
      mostrarToast("Escribe el nombre del servicio o trabajo a realizar", "err");
      return;
    }

    const nuevo: OrderItem = {
      id: `otro-${Date.now()}`,
      type: "SERVICE",
      category: "Otro",
      code: `OTR-${Math.floor(100 + Math.random() * 900)}`,
      name: otroNombreCustom.trim(),
      price: 0,
      qty: 1,
      status: "Pendiente",
      empleado_id: empleadoLogueado.id,
      empleado_nombre: empleadoLogueado.nombre,
    };

    const nuevosItems = [...ordenActiva.items, nuevo];
    setOtroNombreCustom("");
    setOtroPrecioCustom("");

    setOrdenActiva({
      ...ordenActiva,
      items: nuevosItems,
      startedAt: ordenActiva.startedAt || new Date().toISOString(),
    });

    await sincronizarOrdenEnNeon({ items: nuevosItems, startTimer: true });
    mostrarToast(`"${nuevo.name}" asignado a ${empleadoLogueado.nombre}`);
  };

  // Agregar repuesto/insumo desde el inventario asignando empleado_id e iniciando cronómetro
  const handleAgregarRepuestoAOrden = async (prod: InventoryProduct) => {
    if (!ordenActiva) {
      mostrarToast("Selecciona primero un vehículo o auto en pista", "err");
      return;
    }

    if (prod.stock <= 0) {
      mostrarToast(`El repuesto "${prod.name}" está sin stock disponible`, "err");
      return;
    }

    const existente = ordenActiva.items.find(
      (i) =>
        (i.productId === prod.id || i.code === prod.code) &&
        (!i.empleado_id || i.empleado_id === empleadoLogueado.id)
    );
    let nuevosItems: OrderItem[];

    if (existente) {
      if (existente.qty + 1 > prod.stock) {
        mostrarToast(`Stock máximo disponible alcanzado (${prod.stock} uds)`, "err");
        return;
      }
      nuevosItems = ordenActiva.items.map((i) =>
        i.id === existente.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      const nuevo: OrderItem = {
        id: `part-${prod.id}-${Date.now()}`,
        type: "PART",
        category: "Repuestos e Insumos",
        code: prod.code,
        name: prod.name,
        price: Number(prod.price) || 0,
        qty: 1,
        status: "Pendiente",
        productId: prod.id,
        imageUrl: prod.imageUrl,
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      };
      nuevosItems = [...ordenActiva.items, nuevo];
    }

    setOrdenActiva({
      ...ordenActiva,
      items: nuevosItems,
      startedAt: ordenActiva.startedAt || new Date().toISOString(),
    });

    await sincronizarOrdenEnNeon({ items: nuevosItems, startTimer: true });
    mostrarToast(`${prod.name} asignado por ${empleadoLogueado.nombre}`);
  };

  // Cambiar estado de un ítem con 1 clic: Pendiente -> En Proceso -> Listo
  const handleCiclarEstadoItem = async (itemId: string) => {
    if (!ordenActiva) return;
    const ciclo: Record<"Pendiente" | "En Proceso" | "Listo", "Pendiente" | "En Proceso" | "Listo"> = {
      Pendiente: "En Proceso",
      "En Proceso": "Listo",
      Listo: "Pendiente",
    };

    const nuevosItems = ordenActiva.items.map((it) =>
      it.id === itemId ? { ...it, status: ciclo[it.status] || "En Proceso" } : it
    );

    await sincronizarOrdenEnNeon({ items: nuevosItems });
  };

  const handleCambiarCantidadItem = async (itemId: string, delta: number) => {
    if (!ordenActiva) return;
    const nuevosItems = ordenActiva.items
      .map((it) => (it.id === itemId ? { ...it, qty: Math.max(0, (it.qty || 1) + delta) } : it))
      .filter((it) => it.qty > 0);

    await sincronizarOrdenEnNeon({ items: nuevosItems });
  };

  const handleEliminarItemOrden = async (itemId: string) => {
    if (!ordenActiva) return;
    const nuevosItems = ordenActiva.items.filter((it) => it.id !== itemId);
    await sincronizarOrdenEnNeon({ items: nuevosItems });
  };

  // Iniciar Orden y Cronómetro en Vivo
  const handleIniciarOrden = async () => {
    if (!ordenActiva) return;
    try {
      setIniciandoCronometro(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INICIAR_ORDEN",
          orderId: ordenActiva.id,
          mechanic: ordenActiva.mechanic,
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        mostrarToast(`Cronómetro iniciado para ${data.activeOrder.orderNumber}`);
      }
    } catch (err) {
      mostrarToast("Error al iniciar cronómetro", "err");
    } finally {
      setIniciandoCronometro(false);
    }
  };

  // Enviar Orden a Oficina / Caja POS (Detiene cronómetro, pasa a EN_CAJA y transfiere servicios, repuestos y empleados)
  const handleEnviarAPosCaja = async (targetOrder?: UnifiedOrder) => {
    const ord = targetOrder || ordenActiva;
    if (!ord) return;
    if (ord.items.length === 0) {
      mostrarToast("Agrega al menos un servicio o repuesto a la orden antes de enviar a Oficina / Caja", "err");
      return;
    }

    const nowIso = new Date().toISOString();
    const optimisticOrder: UnifiedOrder = {
      ...ord,
      status: "EN_CAJA",
      completedAt: nowIso,
      items: ord.items.map((it) => ({ ...it, status: "Listo" as const })),
    };

    if (ordenActiva?.id === ord.id) {
      setOrdenActiva(optimisticOrder);
    }
    setAutosEnPista((prev) =>
      prev.map((o) => (o.id === ord.id ? optimisticOrder : o))
    );

    try {
      setEnviandoAPos(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENVIAR_A_POS",
          orderId: ord.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (ordenActiva?.id === ord.id) {
          setOrdenActiva(data.activeOrder);
        }
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        cargarOperacionInicial(false);

        if (data.posRequest && typeof window !== "undefined") {
          sessionStorage.setItem("pos_despacho_solicitud", JSON.stringify(data.posRequest));
        }

        setModalConfirmPos(data.posRequest || data.activeOrder);
        mostrarToast(`Orden #${ord.orderNumber} (${ord.plate}) enviada a Oficina / Lista para Caja`);
      } else {
        mostrarToast(data.error || "No se pudo enviar la orden a Oficina / POS", "err");
      }
    } catch (err) {
      mostrarToast("Error de red al transferir a Oficina / POS", "err");
    } finally {
      setEnviandoAPos(false);
    }
  };

  const tarjetaSeleccionadaObj = useMemo(
    () => SERVICE_CARDS.find((c) => c.id === activeCardId) || null,
    [activeCardId]
  );

  // Lista combinada de presets para la tarjeta activa (en "Otro" suma también los servicios personalizados de Neon DB)
  const presetsTarjetaActiva = useMemo<ServicePreset[]>(() => {
    if (!tarjetaSeleccionadaObj) return [];
    if (tarjetaSeleccionadaObj.id !== "otro") {
      return tarjetaSeleccionadaObj.presets;
    }
    const base = [...tarjetaSeleccionadaObj.presets];
    const existingCodes = new Set(base.map((b) => b.code));
    serviciosDb.forEach((s) => {
      if (s.code && !existingCodes.has(s.code)) {
        base.push({
          code: s.code,
          name: s.name,
          price: Number(s.price) || 15,
          subCategory: s.category || "General",
        });
      }
    });
    return base;
  }, [tarjetaSeleccionadaObj, serviciosDb]);

  // Opciones dinámicas del botón Filtro dentro del modal flotante
  const opcionesFiltroFlotante = useMemo(() => {
    if (!tarjetaSeleccionadaObj) return [{ id: "TODOS", label: "Todos" }];

    if (tarjetaSeleccionadaObj.id === "repuestos") {
      const cats = new Set<string>();
      productosInventario.forEach((p) => {
        if (p.category) cats.add(p.category);
      });
      return [
        { id: "TODOS", label: "Todos" },
        { id: "EN_ORDEN", label: "En la Orden" },
        { id: "CON_STOCK", label: "Con Stock" },
        ...Array.from(cats).map((c) => ({ id: c, label: c })),
      ];
    }

    const subCats = new Set<string>();
    presetsTarjetaActiva.forEach((p) => {
      if (p.subCategory) subCats.add(p.subCategory);
    });

    return [
      { id: "TODOS", label: "Todos" },
      { id: "EN_ORDEN", label: "En la Orden" },
      { id: "DISPONIBLES", label: "Disponibles" },
      ...Array.from(subCats).map((sc) => ({ id: sc, label: sc })),
    ];
  }, [tarjetaSeleccionadaObj, productosInventario, presetsTarjetaActiva]);

  // Filtrado de servicios dentro del modal flotante
  const presetsFiltradosFlotante = useMemo(() => {
    const term = busquedaFlotante.trim().toLowerCase();
    return presetsTarjetaActiva.filter((preset) => {
      const seleccionado = Boolean(
        ordenActiva?.items.some(
          (i) => i.code === preset.code || i.name.toLowerCase() === preset.name.toLowerCase()
        )
      );

      if (filtroFlotante === "EN_ORDEN" && !seleccionado) return false;
      if (filtroFlotante === "DISPONIBLES" && seleccionado) return false;
      if (
        filtroFlotante !== "TODOS" &&
        filtroFlotante !== "EN_ORDEN" &&
        filtroFlotante !== "DISPONIBLES" &&
        preset.subCategory !== filtroFlotante
      ) {
        return false;
      }

      if (!term) return true;
      return (
        preset.name.toLowerCase().includes(term) ||
        preset.code.toLowerCase().includes(term) ||
        (preset.subCategory && preset.subCategory.toLowerCase().includes(term))
      );
    });
  }, [presetsTarjetaActiva, busquedaFlotante, filtroFlotante, ordenActiva]);

  // Filtrado de repuestos dentro del modal flotante
  const repuestosFiltradosFlotante = useMemo(() => {
    const term = busquedaFlotante.trim().toLowerCase();
    return productosInventario.filter((p) => {
      const enOrden = Boolean(ordenActiva?.items.some((i) => i.productId === p.id));

      if (filtroFlotante === "EN_ORDEN" && !enOrden) return false;
      if (filtroFlotante === "CON_STOCK" && p.stock <= 0) return false;
      if (
        filtroFlotante !== "TODOS" &&
        filtroFlotante !== "EN_ORDEN" &&
        filtroFlotante !== "CON_STOCK" &&
        p.category !== filtroFlotante
      ) {
        return false;
      }

      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
      );
    });
  }, [productosInventario, busquedaFlotante, filtroFlotante, ordenActiva]);

  // Conteo de ítems seleccionados por cada categoría de tarjeta
  const conteoPorTarjeta = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!ordenActiva) return counts;
    SERVICE_CARDS.forEach((card) => {
      if (card.id === "repuestos") {
        counts[card.id] = ordenActiva.items
          .filter((i) => i.type === "PART")
          .reduce((acc, i) => acc + (i.qty || 1), 0);
      } else {
        counts[card.id] = ordenActiva.items.filter(
          (i) =>
            i.category === card.title ||
            card.presets.some((p) => p.code === i.code || p.name === i.name)
        ).length;
      }
    });
    return counts;
  }, [ordenActiva]);

  const vistaActivaConfig =
    VISTAS_INSPECCION.find((v) => v.id === etapa3VistaActiva) || VISTAS_INSPECCION[0];

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans pb-28 md:pb-12 selection:bg-blue-500/30">
      <Header />

      {/* NOTIFICACIÓN FLOTANTE RÁPIDA */}
      {toastMensaje && (
        <div className="fixed top-20 right-4 z-[60] max-w-md animate-fade-in">
          <div
            className={`px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 text-sm font-medium ${
              toastMensaje.tipo === "ok"
                ? "bg-[#111113]/95 border-emerald-500/30 text-emerald-300"
                : "bg-[#111113]/95 border-rose-500/30 text-rose-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current shrink-0" />
            <span>{toastMensaje.texto}</span>
          </div>
        </div>
      )}

      <main className="flex-grow p-4 sm:p-6 md:p-8 max-w-[1440px] mx-auto w-full space-y-6">
        {/* ===================================================================
            CABECERA: FLECHA DE REGRESO Y TÍTULO TALLER (ESTILO EXACTO)
            =================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              aria-label="Volver"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#111113] hover:bg-[#161618] border border-white/10 text-zinc-200 transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
                Taller
              </h1>
            </div>
          </div>

          {/* Selector de Login de Empleado Activo + Autos en Pista + Tablero OT */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] flex items-center gap-2 text-xs text-zinc-200">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-zinc-400">Empleado:</span>
              <select
                value={empleadoLogueado.nombre}
                onChange={(e) => handleCambiarEmpleadoLogueado(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                title={`ID activo: ${empleadoLogueado.id}`}
              >
                {Array.from(new Set([empleadoLogueado.nombre, ...mecanicos])).map((emp) => (
                  <option key={emp} value={emp} className="bg-[#111113] text-white">
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle de Roles: Modo Empleado Garaje vs Oficina */}
            <div className="flex items-center rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRolUsuario("EMPLEADO");
                  mostrarToast("Modo Garaje: Precios y cobros ocultos para el operario");
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                  rolUsuario === "EMPLEADO"
                    ? "bg-white/10 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                🔧 Garaje
              </button>
              <button
                type="button"
                onClick={() => {
                  setRolUsuario("OFICINA");
                  mostrarToast("Modo Oficina: Totales, presupuestos y cobros visibles");
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                  rolUsuario === "OFICINA"
                    ? "bg-white/10 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                🏢 Oficina
              </button>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-[#111113] border border-white/5 flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{autosEnPista.length} Autos en Pista</span>
            </div>
            <Link
              href="/taller/ordenes"
              className="px-3.5 py-2 rounded-2xl bg-[#111113] hover:bg-[#161618] border border-white/5 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
            >
              Tablero OT
            </Link>
          </div>
        </div>

        {/* ===================================================================
            BLOQUE 1 (SUPERIOR): BUSCADOR INTELIGENTE AUTOMÁTICO E INGRESO RÁPIDO
            =================================================================== */}
        <section className="bg-[#111113] rounded-2xl border border-white/5 p-4 sm:p-5 shadow-xl relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)" }}
          />

          <form onSubmit={handleBuscarPlacaOCedula} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
                {buscandoVehiculo ? "⏳" : "🔍"}
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digita Placa (ej: ABC-123) o Cédula/RUC para buscar o ingresar automáticamente..."
                className="w-full pl-11 pr-10 h-12 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-blue-500/60 text-white text-sm font-medium placeholder:text-zinc-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setVehiculoEncontrado(null);
                    setClienteEncontrado(null);
                    setMostrarRegistroExpress(false);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* SI NO EXISTE: TARJETA LIMPIA Y DESLIZABLE DE "INGRESO RÁPIDO" */}
          {mostrarRegistroExpress && (
            <form
              onSubmit={handleGuardarRegistroExpress}
              className="mt-3 pt-3 border-t border-white/10 relative z-10 overflow-hidden transition-all duration-300 ease-out animate-fade-in"
            >
              <div className="p-3.5 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Ingreso Rápido
                  </span>
                  <button
                    type="button"
                    onClick={() => setMostrarRegistroExpress(false)}
                    className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                  <input
                    type="text"
                    value={regCedula}
                    onChange={(e) => setRegCedula(e.target.value)}
                    placeholder="Cédula / RUC"
                    className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                  />
                  <input
                    type="text"
                    required
                    value={regNombres}
                    onChange={(e) => setRegNombres(e.target.value)}
                    placeholder="Nombre *"
                    className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                  />
                  <input
                    type="text"
                    value={regTelefono}
                    onChange={(e) => setRegTelefono(e.target.value)}
                    placeholder="Teléfono"
                    className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                  />
                  <input
                    type="text"
                    required
                    value={regPlaca}
                    onChange={(e) => setRegPlaca(e.target.value.toUpperCase())}
                    placeholder="Placa *"
                    className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white font-mono text-xs font-bold uppercase focus:outline-none focus:border-emerald-500/60"
                  />
                  <input
                    type="text"
                    required
                    value={regMarca}
                    onChange={(e) => {
                      setRegMarca(e.target.value);
                      setRegModelo("");
                    }}
                    placeholder="Marca / Modelo *"
                    className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                  />
                  <input
                    type="number"
                    value={regKilometraje}
                    onChange={(e) => setRegKilometraje(e.target.value)}
                    placeholder="Km"
                    className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                  />
                  <button
                    type="submit"
                    disabled={guardandoExpress}
                    className="col-span-2 sm:col-span-3 lg:col-span-1 h-10 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold transition-all cursor-pointer active:scale-95"
                  >
                    {guardandoExpress ? "Iniciando..." : "▶ Guardar e Iniciar"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>

                                {/* ===================================================================
            CONTENEDOR DESLIZABLE HORIZONTAL: 8 ETAPAS (CAROUSEL GLASSMORPHISM)
            =================================================================== */}
        <section className="bg-[#111113]/90 rounded-2xl border border-white/[0.08] p-4 sm:p-6 shadow-2xl space-y-5 overflow-hidden">
          {/* Cabecera del Auto Seleccionado + Información Rápida */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            {ordenActiva ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 font-mono text-sm font-bold text-blue-300 tracking-wider">
                  {ordenActiva.plate}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {ordenActiva.vehicle}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      #{ordenActiva.orderNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#0a0a0a] border border-white/10 font-mono text-xs font-bold text-emerald-400">
                      ⏱ {formatElapsedTime(ordenActiva.startedAt, ordenActiva.completedAt, nowTick)}
                    </span>
                    {cronometroTecnicoActivo && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 font-mono text-xs text-amber-300 animate-pulse">
                        ⏱ Técnico: {formatCronometro(cronometroTecnicoSegundos)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    <span>
                      Cliente: <strong className="text-zinc-200">{ordenActiva.client}</strong>
                    </span>
                    <span>
                      ⛽ <strong className="text-zinc-200">{ordenActiva.fuelLevel || "1/2"}</strong>
                    </span>
                    <span>
                      Servicios: <strong className="text-emerald-400">{ordenActiva.items.length}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                      {ordenActiva.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Digita una placa arriba o selecciona un auto en pista abajo para comenzar.</span>
              </div>
            )}

            {/* Selector de Rol Visual */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Modo:</span>
              <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRolUsuario("EMPLEADO");
                    mostrarToast("Modo Empleado: Precios ocultos");
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    rolUsuario === "EMPLEADO"
                      ? "bg-white/10 text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  🔧 Garaje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRolUsuario("OFICINA");
                    mostrarToast("Modo Oficina: Precios y cálculos visibles");
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    rolUsuario === "OFICINA"
                      ? "bg-white/10 text-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  🏢 Oficina
                </button>
              </div>
            </div>
          </div>

          {/* ===================================================================
              STEPPER DE 8 ICONOS TRANSPARENTES (GLASSMORPHISM)
              =================================================================== */}
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.08] p-2 rounded-2xl overflow-x-auto">
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 min-w-[620px] lg:min-w-0">
              {[
                {
                  id: 0,
                  label: "1. Cliente",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  ),
                },
                {
                  id: 1,
                  label: "2. Vehículo",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 0h17.25M3.75 14.25l2.25-6.75h12l2.25 6.75" />
                    </svg>
                  ),
                },
                {
                  id: 2,
                  label: "3. Inspección",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  ),
                },
                {
                  id: 3,
                  label: "4. Catálogo",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  ),
                },
                {
                  id: 4,
                  label: "5. Taller",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.016a4.5 4.5 0 0 0 5.093-5.093c-.172-.58-.148-1.193.016-1.743l-3.07 3.07a1.5 1.5 0 0 1-2.122-2.122l3.07-3.07c-.55.164-1.163.188-1.743.016a4.5 4.5 0 0 0-5.093 5.093c.172.58.148 1.193-.016 1.743l-3.07-3.07a1.5 1.5 0 0 0-2.122 2.122l3.07 3.07Z" />
                    </svg>
                  ),
                },
                {
                  id: 5,
                  label: "6. Aviso",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                  ),
                },
                {
                  id: 6,
                  label: "7. Firma",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                  ),
                },
                {
                  id: 7,
                  label: "8. Cobro/Doc",
                  icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6H2.25m0 0v-.75A.75.75 0 0 1 3 4.5h.75m0 0a9.006 9.006 0 0 1 16.5 0m0 0h.75a.75.75 0 0 1 .75.75V6m0 0h-.75a.75.75 0 0 1-.75-.75V4.5m0 10.5v.75c0 .414.336.75.75.75h.75m0 0v-.75a.75.75 0 0 0-.75-.75h-.75m-15 0H3a.75.75 0 0 0-.75.75v.75m0 0h.75a.75.75 0 0 0 .75-.75v-.75" />
                    </svg>
                  ),
                },
              ].map((step) => {
                const active = etapaActiva === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setEtapaActiva(step.id);
                      setPasoDeslizable(step.id === 0 ? 0 : step.id === 1 ? 1 : 2);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      active
                        ? "bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-md shadow-blue-500/10"
                        : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="p-1 rounded-lg bg-white/5">{step.icon}</div>
                    <span className="text-[10px] sm:text-xs font-medium tracking-tight mt-1 truncate max-w-full">
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===================================================================
              CONTENEDOR DESLIZABLE HORIZONTAL: 8 SLIDES CON TRANSLATE-X
              =================================================================== */}
          <div className="overflow-hidden w-full">
            <div
              className="flex w-[800%] transition-transform duration-500 ease-out items-start"
              style={{ transform: `translateX(-${etapaActiva * 12.5}%)` }}
            >
              {/* ===============================================================
                  SLIDE 0: ETAPA 1 - CLIENTE Y RECEPCIÓN
                  =============================================================== */}
              <div className="w-[12.5%] shrink-0 pr-2 sm:pr-4 space-y-4">
                {ordenActiva ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Cliente y Vehículo Seleccionados
                      </span>
                      <button
                        type="button"
                        onClick={() => setEtapaActiva(1)}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Continuar a Vehículo (Paso 2) →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-zinc-500 block">Cliente</span>
                        <strong className="text-white text-sm">{ordenActiva.client}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-zinc-500 block">Vehículo / Placa</span>
                        <strong className="text-white text-sm">{ordenActiva.vehicle} ({ordenActiva.plate})</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-zinc-500 block">Mecánico Asignado</span>
                        <strong className="text-white text-sm">{ordenActiva.mechanic || "Sin asignar"}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-zinc-500 block">Orden #</span>
                        <strong className="text-emerald-400 text-sm font-mono">#{ordenActiva.orderNumber}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCrearOrdenEtapa1} className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Ingreso Rápido de Cliente y Vehículo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Nombre del Cliente *</label>
                        <input
                          type="text"
                          required
                          value={etapa1Nombre}
                          onChange={(e) => setEtapa1Nombre(e.target.value)}
                          placeholder="Nombre completo"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Cédula / RUT / RUC</label>
                        <input
                          type="text"
                          value={etapa1Ruc}
                          onChange={(e) => setEtapa1Ruc(e.target.value)}
                          placeholder="Identificación"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Teléfono / WhatsApp *</label>
                        <input
                          type="text"
                          required
                          value={etapa1Telefono}
                          onChange={(e) => setEtapa1Telefono(e.target.value)}
                          placeholder="+56 9..."
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Correo Electrónico</label>
                        <input
                          type="email"
                          value={etapa1Email}
                          onChange={(e) => setEtapa1Email(e.target.value)}
                          placeholder="cliente@correo.com"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Placa / Patente *</label>
                        <input
                          type="text"
                          required
                          value={etapa1PlacaOpcional}
                          onChange={(e) => setEtapa1PlacaOpcional(e.target.value.toUpperCase())}
                          placeholder="ABC-123"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white font-mono font-bold uppercase text-xs focus:outline-none focus:border-emerald-500/60"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Marca / Modelo *</label>
                        <input
                          type="text"
                          required
                          value={etapa2Marca}
                          onChange={(e) => setEtapa2Marca(e.target.value)}
                          placeholder="Toyota Corolla"
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Técnico Asignado</label>
                        <select
                          value={etapa1Tecnico}
                          onChange={(e) => setEtapa1Tecnico(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                        >
                          <option value="">Seleccionar técnico...</option>
                          {mecanicos.map((emp) => (
                            <option key={emp} value={emp}>{emp}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 font-medium block mb-1">Motivo de Ingreso</label>
                        <input
                          type="text"
                          value={etapa1MotivoIngreso}
                          onChange={(e) => setEtapa1MotivoIngreso(e.target.value)}
                          placeholder="Mantenimiento preventivo..."
                          className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={creandoOrdenEtapa1}
                        className="h-10 px-6 rounded-xl bg-blue-500/25 hover:bg-blue-500/35 border border-blue-500/50 text-blue-200 text-xs font-semibold transition-all cursor-pointer"
                      >
                        {creandoOrdenEtapa1 ? "Iniciando orden..." : "▶ Iniciar Orden y Pasar a Vehículo"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* ===============================================================
                  SLIDE 1: ETAPA 2 - VEHÍCULO (CHECK TÁCTIL + FOTOS R2)
                  =============================================================== */}
              <div className="w-[12.5%] shrink-0 pr-2 sm:pr-4 space-y-4">
                {!ordenActiva ? (
                  <div className="py-12 text-center text-xs text-zinc-400">
                    Selecciona un vehículo en el paso 1 para registrar el check y subir fotos R2.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Controles de Combustible, Km e Inventario */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-300">⛽ Nivel de Combustible</span>
                          <span className="text-xs font-mono text-emerald-400 font-bold">{etapa2NivelCombustible || "1/2"}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {["E (Vacío)", "1/4", "1/2", "3/4", "F (Lleno)"].map((lvl) => {
                            const sel = (etapa2NivelCombustible || "1/2").startsWith(lvl.split(" ")[0]);
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setEtapa2NivelCombustible(lvl.split(" ")[0])}
                                className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  sel
                                    ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                                    : "bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-zinc-400"
                                }`}
                              >
                                {lvl.split(" ")[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-300">Kilometraje de Ingreso</span>
                          <input
                            type="number"
                            value={etapa2Kilometraje}
                            onChange={(e) => setEtapa2Kilometraje(e.target.value)}
                            placeholder="Ej: 85400"
                            className="h-8 w-32 px-3 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono text-right"
                          />
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] text-zinc-400 block">Inventario de lo que trae el vehículo:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {["Gata hidráulica y palanca", "Llave de ruedas / Cruz", "Triángulos", "Botiquín", "Extintor", "Llanta de repuesto", "Tarjeta de propiedad / Matrícula"].map((item) => {
                              const sel = etapa2InventarioTrae.includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => handleToggleInventarioEtapa2(item)}
                                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                                    sel
                                      ? "bg-blue-500/20 border border-blue-500/40 text-blue-300"
                                      : "bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-zinc-200"
                                  }`}
                                >
                                  {sel ? "✓ " : "+ "}{item}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cámara y Fotos Cloudflare R2 */}
                    <div className="lg:col-span-5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">Fotos Iniciales (Cloudflare R2)</span>
                        {subiendoFotoRecepcion && (
                          <span className="text-xs text-blue-400 animate-pulse font-mono">Subiendo a R2...</span>
                        )}
                      </div>

                      <label className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-black/20">
                        <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                        <span className="text-xs text-zinc-300 font-medium">Tocar para tomar foto o adjuntar</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleSubirFotoRecepcion}
                          className="hidden"
                        />
                      </label>

                      {fotosRecepcion.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {fotosRecepcion.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="Foto R2"
                              className="w-full h-16 object-cover rounded-lg border border-white/10"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(0)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                  >
                    ← Anterior (Cliente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(2)}
                    className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold cursor-pointer"
                  >
                    Continuar a Inspección (Paso 3) →
                  </button>
                </div>
              </div>

              {/* ===============================================================
                  SLIDE 2: ETAPA 3 - INSPECCIÓN (5 VISTAS + R2 + PDF)
                  =============================================================== */}
              <div className="w-[12.5%] shrink-0 pr-2 sm:pr-4 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      Inspección Visual del Vehículo (5 Vistas)
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerarPdfInspeccion}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      <span>Descargar Reporte PDF</span>
                    </button>
                  </div>

                  {/* Selector de las 5 vistas */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: "frontal" as const, label: "Frontal" },
                      { id: "trasera" as const, label: "Trasera" },
                      { id: "lateral_izq" as const, label: "Lat. Izq" },
                      { id: "lateral_der" as const, label: "Lat. Der" },
                      { id: "superior" as const, label: "Superior" },
                    ].map((vista) => {
                      const sel = etapa3VistaActiva === vista.id;
                      return (
                        <button
                          key={vista.id}
                          type="button"
                          onClick={() => setEtapa3VistaActiva(vista.id)}
                          className={`h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            sel
                              ? "bg-purple-500/20 border border-purple-500/50 text-purple-300"
                              : "bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {vista.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Diagrama Táctil Interactivo */}
                  <div
                    onClick={handleTocarEsquemaVehiculo}
                    className="h-44 sm:h-52 rounded-xl bg-black/40 border border-white/10 relative flex items-center justify-center cursor-crosshair overflow-hidden group"
                  >
                    <span className="text-zinc-600 text-xs font-mono pointer-events-none">
                      [Toca cualquier parte del esquema {etapa3VistaActiva} para marcar un hallazgo]
                    </span>
                    {/* Render marcas de hallazgos */}
                    {etapa3Hallazgos
                      .filter((h) => h.vista === etapa3VistaActiva)
                      .map((h) => (
                        <div
                          key={h.id}
                          style={{ left: `${h.x}%`, top: `${h.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg bg-amber-500"
                        >
                          !
                        </div>
                      ))}
                  </div>

                  {/* Lista de Hallazgos */}
                  <div className="space-y-2">
                    <span className="text-xs text-zinc-400 block font-medium">
                      Hallazgos registrados ({etapa3Hallazgos.length}):
                    </span>
                    {etapa3Hallazgos.length === 0 ? (
                      <div className="text-xs text-zinc-500 italic">No hay detalles o daños registrados.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {etapa3Hallazgos.map((h) => (
                          <div
                            key={h.id}
                            className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 flex items-center gap-2 text-xs text-zinc-200"
                          >
                            <span>{h.descripcion || h.tipo || "Detalle"} ({h.vista})</span>
                            <button
                              type="button"
                              onClick={() => handleEliminarHallazgoEtapa3(h.id)}
                              className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(1)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                  >
                    ← Anterior (Vehículo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(3)}
                    className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold cursor-pointer"
                  >
                    Continuar a Catálogo (Paso 4) →
                  </button>
                </div>
              </div>

              {/* ===============================================================
                  SLIDE 3: ETAPA 4 - CATÁLOGO / PRESUPUESTO (EMPLEADO vs OFICINA)
                  =============================================================== */}
              <div className="w-[12.5%] shrink-0 pr-2 sm:pr-4 space-y-4">
                {/* Banner de Lógica de Roles */}
                {rolUsuario === "EMPLEADO" ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span>Modo Garaje: Valores monetarios ocultos. Toca un servicio para agregarlo con tu usuario técnico.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span>Modo Oficina: Precios unitarios, descuentos e impuestos activos.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopiarLinkPresupuesto}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition-all cursor-pointer"
                      >
                        {copiadoLinkPresupuesto ? "✓ Copiado" : "Copiar Link"}
                      </button>
                      <button
                        type="button"
                        onClick={handleEnviarWhatsAppPresupuesto}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-semibold text-emerald-300 transition-all cursor-pointer"
                      >
                        📲 WhatsApp
                      </button>
                    </div>
                  </div>
                )}

                {/* Tarjetas Rápidas de Servicios Minimalistas con Glassmorphism */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300">Servicios Rápidos (1 toque para sumar a la orden):</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {SERVICE_CARDS.slice(0, 8).map((card) => {
                      const firstPreset = card.presets[0] || {
                        code: `${card.id.toUpperCase()}-001`,
                        name: card.title,
                        price: 25.0,
                        subCategory: card.title,
                      };
                      return (
                        <div
                          key={card.id}
                          onClick={() => handleToggleServicioPreset(card.title, firstPreset)}
                          className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08] transition-all cursor-pointer active:scale-95 space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-2 rounded-xl bg-white/5">{card.icon}</div>
                            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-semibold">+ Sumar</span>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white leading-tight">{card.title}</div>
                            <div className="text-[10px] text-zinc-400 truncate">{firstPreset.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de Ítems en la Orden */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Servicios y Repuestos en la Orden ({ordenActiva?.items.length || 0})
                    </span>
                    {rolUsuario === "OFICINA" && (
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Total: ${calculosPresupuestoEtapa4.total.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {!ordenActiva || ordenActiva.items.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500 italic">
                      No hay servicios añadidos todavía. Toca una tarjeta rápida de arriba.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {ordenActiva.items.map((it) => (
                        <div key={it.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-white block">{it.name}</span>
                            <span className="text-[10px] text-zinc-400">
                              Asignado: {it.empleado_nombre || it.empleado_id || "Taller general"} • Estado: {it.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Si es oficina, mostrar precio unitario */}
                            {rolUsuario === "OFICINA" && (
                              <span className="font-mono text-zinc-300">
                                ${(it.price || 0).toFixed(2)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCiclarEstadoItem(it.id)}
                              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300 cursor-pointer"
                            >
                              {it.status}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarItemEtapa4(it.id)}
                              className="text-zinc-500 hover:text-rose-400 text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(2)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                  >
                    ← Anterior (Inspección)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(4)}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    Continuar a Taller / Reparación (Paso 5) →
                  </button>
                </div>
              </div>

              {/* ===============================================================
                  SLIDE 4: ETAPA 5 - TALLER / REPARACIÓN (TIEMPOS, VOZ Y CHAT)
                  =============================================================== */}
              <div className="w-[12.5%] shrink-0 pr-2 sm:pr-4 space-y-4">
                {/* 3 Botones Transparentes de Acción Rápida */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Botón 1: Cronómetro Tiempos */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        Cronómetro
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCronometro(cronometroTecnicoSegundos)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleCronometroTecnico}
                      className={`h-10 w-full rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        cronometroTecnicoActivo
                          ? "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300"
                          : "bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300"
                      }`}
                    >
                      <span>{cronometroTecnicoActivo ? "⏸ Pausar Tarea" : "▶ Iniciar Tarea"}</span>
                    </button>
                  </div>

                  {/* Botón 2: Grabadora Voz R2 */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v7.5a3 3 0 0 1-3 3Z" />
                        </svg>
                        Nota de Voz (R2)
                      </span>
                      {subiendoAudioEtapa5 && (
                        <span className="text-[10px] text-blue-400 animate-pulse">Subiendo...</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleGrabacionNotaVozEtapa5}
                      className={`h-10 w-full rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        grabandoAudioEtapa5
                          ? "bg-rose-500/20 border border-rose-500/50 text-rose-300 animate-pulse"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200"
                      }`}
                    >
                      <span>{grabandoAudioEtapa5 ? "⏹ Detener y Subir" : "🎙 Grabar Audio"}</span>
                    </button>
                  </div>

                  {/* Botón 3: Fotos de Avance R2 */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        </svg>
                        Fotos de Avance (R2)
                      </span>
                    </div>
                    <label className="h-10 w-full rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
                      <span>📷 Tomar / Subir Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleSubirFotoAvanceEtapa5}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Chat Interno y Horas de la Orden */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Chat Interno */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                    <span className="text-xs font-semibold text-zinc-300 block">💬 Chat Interno de la Orden</span>
                    <div className="h-44 overflow-y-auto space-y-2 p-2 rounded-xl bg-black/30 border border-white/5">
                      {etapa5ChatMensajes.length === 0 ? (
                        <div className="text-center py-8 text-xs text-zinc-500 italic">
                          No hay comentarios en esta orden. Escribe una nota para el equipo.
                        </div>
                      ) : (
                        etapa5ChatMensajes.map((msg) => (
                          <div key={msg.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                              <strong className="text-zinc-200">{msg.author}</strong>
                              <span>{msg.createdAt}</span>
                            </div>
                            <div className="text-zinc-300">{msg.text}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={etapa5ChatTexto}
                        onChange={(e) => setEtapa5ChatTexto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleEnviarMensajeChatEtapa5();
                          }
                        }}
                        placeholder="Escribe un mensaje para el equipo..."
                        className="flex-1 h-9 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleEnviarMensajeChatEtapa5}
                        className="h-9 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold cursor-pointer"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>

                  {/* Registro de Horas por Técnicos */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                    <span className="text-xs font-semibold text-zinc-300 block">⏱ Horas Registradas por Técnicos</span>
                    <div className="h-44 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/30 border border-white/5 text-xs">
                      {etapa5HorasRegistros.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 italic">
                          No hay registros de horas. Inicia el cronómetro arriba o añade un intervalo manual.
                        </div>
                      ) : (
                        etapa5HorasRegistros.map((reg) => (
                          <div key={reg.id} className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between">
                            <div>
                              <strong className="text-white">{reg.technician}</strong>: {reg.taskDescription}
                            </div>
                            <span className="font-mono text-emerald-400 font-bold">
                              {reg.hours}h {reg.minutes}m
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(3)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                  >
                    ← Anterior (Catálogo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(5)}
                    className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold cursor-pointer"
                  >
                    Continuar a Aviso y Estado (Paso 6) →
                  </button>
                </div>
              </div>

              {/* ===============================================================
                  SLIDE 5: ETAPA 6 - ESTADO, AVISO AUTOMÁTICO Y PIN DE SEGUIMIENTO
                  =============================================================== */}
              <div className="w-[12.5%] shrink-0 pr-2 sm:pr-4 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      Estado de la Orden y Aviso Automático al Cliente
                    </span>
                  </div>

                  {/* Chips de Estados con Automatización Instantánea */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-zinc-400 block font-medium">
                      Toca un estado para actualizar Neon DB y autogenerar el texto para el cliente:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {etapa6EstadosLista.map((st) => {
                        const sel = etapa6EstadoSeleccionado.toLowerCase() === st.name.toLowerCase();
                        const estilo = getEstiloColorEstado(st.color);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleSeleccionarEstadoEtapa6(st)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 active:scale-95 ${
                              sel
                                ? `${estilo.bg} ${estilo.border} ${estilo.text} ring-1 ring-white/20 shadow-lg`
                                : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-400 hover:text-zinc-200"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${estilo.dot}`} />
                            <span className="truncate max-w-full">{st.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tarjeta de Credenciales de Seguimiento (PIN + URL) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
                    <div className="lg:col-span-5 p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                      <span className="text-xs font-semibold text-zinc-300 block">
                        🔑 Credenciales de Seguimiento en Línea
                      </span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Orden de Trabajo:</span>
                        <strong className="text-white font-mono">#{ordenActiva?.orderNumber || "---"}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">PIN de Seguridad:</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-400 font-mono text-sm">{etapa6TrackingPin}</strong>
                          <button
                            type="button"
                            onClick={handleGenerarNuevoPinEtapa6}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs cursor-pointer"
                            title="Regenerar PIN"
                          >
                            🔄
                          </button>
                        </div>
                      </div>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleCopiarLinkSeguimientoEtapa6}
                          className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                        >
                          {copiadoLinkSeguimiento ? "✓ ¡Link de Seguimiento Copiado!" : "📋 Copiar Link de Seguimiento"}
                        </button>
                      </div>
                    </div>

                    {/* Mensaje Autogenerado y Envíos 1-Clic */}
                    <div className="lg:col-span-7 p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">
                          Mensaje Autogenerado para el Cliente:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleEnviarWhatsAppAvisoEtapa6}
                            className="h-8 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>💬 Enviar WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleEnviarCorreoAvisoEtapa6}
                            className="h-8 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>✉️ Correo</span>
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={etapa6MensajeAviso}
                        onChange={(e) => setEtapa6MensajeAviso(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(4)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                  >
                    ← Anterior (Taller)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(6)}
                    className="px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold cursor-pointer"
                  >
                    Continuar a Firma y Entrega (Paso 7) →
                  </button>
                </div>
              </div>

              {/* ===============================================================
                  SLIDE 6: ETAPA 7 - ENTREGA EN 3 PASOS + FIRMA EN PANTALLA O REMOTA
                  =============================================================== */}
              <div className="w-[12.5%] shrink-0 pr-2 sm:pr-4 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                  {/* Cabecera de 3 Pasos de Entrega */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                      <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                        Entrega en 3 Pasos y Firma de Recepción
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">1. Verificación</span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">2. Informe</span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/20 border border-teal-500/40 text-teal-300">3. Firma</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* PASO 1 Y 2: CHECKLIST + INFORME TÉCNICO AUTOGENERADO */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Paso 1: Checklist de Verificación de Entrega */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                        <span className="text-xs font-semibold text-zinc-200 block">
                          Paso 1: Verificación de Entrega al Cliente
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {[
                            { key: "vehiculoLimpio" as const, label: "Vehículo limpio (interior y exterior)" },
                            { key: "trabajosVerificados" as const, label: "Niveles de fluidos y torque revisados" },
                            { key: "pertenenciasEntregadas" as const, label: "Pertenencias del cliente devueltas" },
                            { key: "repuestosMostrados" as const, label: "Prueba de ruta aprobada sin testigos" },
                          ].map((chk) => {
                            const val = Boolean(etapa7Checklist[chk.key]);
                            return (
                              <label
                                key={chk.key}
                                className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center gap-2.5 cursor-pointer text-zinc-300 transition-all select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={val}
                                  onChange={(e) =>
                                    setEtapa7Checklist({ ...etapa7Checklist, [chk.key]: e.target.checked })
                                  }
                                  className="w-4 h-4 rounded text-teal-500 bg-black/60 border-white/20 focus:ring-0 cursor-pointer"
                                />
                                <span className="text-[11px] font-medium leading-tight">{chk.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Paso 2: Informe Técnico de la Orden */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-200">
                            Paso 2: Informe Técnico de Trabajos
                          </span>
                          <button
                            type="button"
                            onClick={handleAutogenerarInformeTecnico}
                            className="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>✨ Autogenerar con Etapas Previas</span>
                          </button>
                        </div>

                        <textarea
                          rows={4}
                          value={etapa7InformeTecnico}
                          onChange={(e) => setEtapa7InformeTecnico(e.target.value)}
                          placeholder="Resumen técnico de tareas ejecutadas, repuestos cambiados y recomendaciones de mantenimiento..."
                          className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-teal-500/50"
                        />

                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Adjunto Cloudflare R2: {etapa7InformeAdjuntoUrl ? "✓ Adjuntado" : "Ninguno"}</span>
                          <label className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer">
                            <span>+ Adjuntar PDF/Archivo R2</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              onChange={handleSubirInformeTecnicoEtapa7}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* PASO 3: FIRMA DIGITAL EN PANTALLA O REMOTA */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Lienzo Canvas Minimalista Táctil */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-200">
                            Paso 3: Firma en Pantalla (Tablet / Celular)
                          </span>
                          <button
                            type="button"
                            onClick={limpiarCanvasFirmaEtapa7}
                            className="text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 transition-all cursor-pointer"
                          >
                            Limpiar
                          </button>
                        </div>

                        <div className="h-44 rounded-xl bg-[#0a0a0c] border border-white/10 relative overflow-hidden flex items-center justify-center">
                          <canvas
                            ref={canvasFirmaEtapa7Ref}
                            width={420}
                            height={176}
                            onMouseDown={iniciarTrazoFirmaEtapa7}
                            onMouseMove={moverTrazoFirmaEtapa7}
                            onMouseUp={terminarTrazoFirmaEtapa7}
                            onMouseLeave={terminarTrazoFirmaEtapa7}
                            onTouchStart={iniciarTrazoFirmaEtapa7}
                            onTouchMove={moverTrazoFirmaEtapa7}
                            onTouchEnd={terminarTrazoFirmaEtapa7}
                            className="w-full h-full cursor-crosshair touch-none select-none"
                          />
                          {!tieneTrazosFirmaEtapa7Ref.current && (
                            <div className="absolute pointer-events-none text-zinc-600 text-xs font-mono">
                              [Firma aquí con el dedo o puntero táctil]
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleGuardarEtapa7EntregaFirma()}
                          disabled={guardandoEtapa7}
                          className="w-full h-11 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs sm:text-sm font-bold shadow-lg shadow-teal-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <span>{guardandoEtapa7 ? "Guardando..." : "Guardar y Pasar a Caja (Paso 8) →"}</span>
                        </button>
                      </div>

                      {/* Firma a Distancia (WhatsApp o Correo) */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-300">
                            ¿Cliente no está en el taller?
                          </span>
                          <span className="text-[10px] text-teal-400 font-semibold uppercase">Firma a Distancia</span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Envía el link al cliente para que revise el informe y firme desde su celular:
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleEnviarWhatsAppAceptacionEtapa7}
                            className="h-9 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>📲 WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCopiarLinkFirmaEtapa7}
                            className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>{copiadoLinkFirmaEtapa7 ? "✓ Copiado" : "📋 Copiar Link"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(5)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                  >
                    ← Anterior (Aviso)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(7)}
                    className="px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold cursor-pointer"
                  >
                    Siguiente: Cobro y Documentos (Paso 8) →
                  </button>
                </div>
              </div>

              {/* ===============================================================
                  SLIDE 7: ETAPA 8 - COBRO CONECTADO AL POS DE OFICINA + DOCUMENTOS
                  =============================================================== */}
              <div className="w-[12.5%] shrink-0 pr-2 sm:pr-4 space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-5">
                  {/* SECCIÓN 1: CONEXIÓN DIRECTA CON EL MÓDULO POS DE OFICINA */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Conexión Directa con POS de Oficina (/pos/venta)
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-300 max-w-xl">
                        Los servicios y repuestos registrados en garaje se transfieren a la caja de oficina con precios editables para el cobro oficial, sincronizando inventario y evitando cajas paralelas.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={enviandoAPos || !ordenActiva}
                        onClick={() => ordenActiva && handleEnviarAPosCaja(ordenActiva)}
                        className="h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2"
                      >
                        <span>🚀</span>
                        <span>
                          {enviandoAPos
                            ? "Transfiriendo..."
                            : ordenActiva?.status === "EN_CAJA"
                            ? "✓ En Oficina / Listo para Caja"
                            : "Enviar a Oficina / Listo para Caja"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/pos/venta")}
                        className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Abrir POS →</span>
                      </button>
                    </div>
                  </div>

                  {/* SECCIÓN 2: ABONOS, PAGOS PARCIALES/TOTALES Y SALDO EN VIVO */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Tarjetas de Saldos en Vivo */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-center">
                          <span className="text-[10px] text-zinc-400 block uppercase font-medium">Total Orden</span>
                          <strong className="text-white text-sm font-mono block">
                            ${(Number(ordenActiva?.totalCost) || Number(calculosPresupuestoEtapa4.total) || 0).toFixed(2)}
                          </strong>
                        </div>
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-center">
                          <span className="text-[10px] text-zinc-400 block uppercase font-medium">Abonado</span>
                          <strong className="text-emerald-400 text-sm font-mono block">
                            ${(ordenActiva?.totalPaid || 0).toFixed(2)}
                          </strong>
                        </div>
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-center">
                          <span className="text-[10px] text-zinc-400 block uppercase font-medium">Saldo Pendiente</span>
                          <strong className="text-amber-400 text-sm font-mono block">
                            ${(ordenActiva?.balanceDue !== undefined ? ordenActiva.balanceDue : Math.max(0, (Number(ordenActiva?.totalCost) || Number(calculosPresupuestoEtapa4.total) || 0) - (ordenActiva?.totalPaid || 0))).toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      {/* Historial de Abonos Registrados */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                        <span className="text-xs font-semibold text-zinc-300 block">
                          Abonos y Pagos Registrados ({(ordenActiva?.payments || []).length})
                        </span>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-white/5 text-xs">
                          {(ordenActiva?.payments || []).length === 0 ? (
                            <div className="text-center py-4 text-zinc-500 italic text-[11px]">
                              Sin abonos previos. Registra uno al lado.
                            </div>
                          ) : (
                            ordenActiva?.payments?.map((p) => (
                              <div key={p.id} className="pt-1.5 flex items-center justify-between text-zinc-300">
                                <div>
                                  <strong className="text-white font-medium">{p.method}</strong>
                                  <span className="text-[10px] text-zinc-500 block">{p.reference} • {p.date}</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-400">+${Number(p.amount).toFixed(2)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Formulario de Registro Rápido de Abonos / Pasarela */}
                    <div className="lg:col-span-7 p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200">
                          Registrar Abono o Pago Inmediato
                        </span>
                        <span className="text-[11px] text-zinc-400">Actualiza saldo automáticamente</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-1">Monto del Abono ($) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={etapa8AbonoMonto}
                            onChange={(e) => setEtapa8AbonoMonto(e.target.value)}
                            placeholder="0.00"
                            className="w-full h-10 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/60"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-zinc-400 block mb-1">Forma de Pago *</label>
                          <select
                            value={etapa8AbonoMetodo}
                            onChange={(e) => setEtapa8AbonoMetodo(e.target.value as any)}
                            className="w-full h-10 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                          >
                            <option value="EFECTIVO">💵 Efectivo</option>
                            <option value="TARJETA">💳 Tarjeta de Débito / Crédito</option>
                            <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                            <option value="LINK_PAGO">🔗 Link de Pago Web (Pasarela)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={etapa8AbonoReferencia}
                          onChange={(e) => setEtapa8AbonoReferencia(e.target.value)}
                          placeholder="Referencia / N° Comprobante / Voucher..."
                          className="flex-1 h-10 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={etapa8RegistrandoPago || !etapa8AbonoMonto}
                          onClick={() => handleRegistrarAbonoPagoEtapa8()}
                          className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {etapa8RegistrandoPago ? "Guardando..." : "+ Registrar Abono"}
                        </button>
                      </div>

                      {etapa8AbonoMetodo === "LINK_PAGO" && (
                        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between text-blue-200">
                          <span>Pasarela activa: Link de pago web para el cliente.</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (ordenActiva) {
                                const url = `${window.location.origin}/taller/seguimiento?orden=${ordenActiva.orderNumber}&pin=${etapa6TrackingPin}&pago=1`;
                                navigator.clipboard.writeText(url);
                                mostrarToast("Link de pago copiado");
                              }
                            }}
                            className="px-2.5 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-[11px] font-semibold text-blue-300 cursor-pointer"
                          >
                            Copiar Link de Pago Web
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECCIÓN 3: BARRA FINAL DE 3 BOTONES CON ICONOS TRANSPARENTES SUAVES */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-xs font-semibold text-zinc-300 block">
                      Emisión de Documentos en 1 Clic:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Botón 1: Descargar / Imprimir Orden en PDF */}
                      <button
                        type="button"
                        onClick={() => setModalImpresionDoc("PDF")}
                        className="h-14 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 shadow-sm group"
                      >
                        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <span className="block font-bold">1. Orden en PDF con Logo</span>
                          <span className="text-[10px] text-zinc-400">Reporte oficial con firma</span>
                        </div>
                      </button>

                      {/* Botón 2: Imprimir Ticket Térmico 80mm/58mm */}
                      <button
                        type="button"
                        onClick={() => setModalImpresionDoc("TICKET")}
                        className="h-14 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 shadow-sm group"
                      >
                        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.656" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <span className="block font-bold">2. Ticket Térmico</span>
                          <span className="text-[10px] text-zinc-400">POS 80mm / 58mm</span>
                        </div>
                      </button>

                      {/* Botón 3: Imprimir Etiqueta con Código QR */}
                      <button
                        type="button"
                        onClick={() => setModalImpresionDoc("ETIQUETA_QR")}
                        className="h-14 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md border border-white/[0.08] text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 shadow-sm group"
                      >
                        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625h3v3h-3zM18 18h3v3h-3zM18 13.5h3v1.5H18zM13.5 19.5h1.5v3h-1.5z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <span className="block font-bold">3. Etiqueta con QR</span>
                          <span className="text-[10px] text-zinc-400">Para llave y parabrisas</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapaActiva(6)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                  >
                    ← Anterior (Firma)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            FILA INFERIOR: "AUTOS EN PISTA" (MODO EMPLEADO: SIN REFERENCIA A PRECIOS)
            =================================================================== */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Autos en Pista (Toca un vehículo para gestionar o sumar servicios)</span>
            </h2>
            {sincronizandoOrden && (
              <span className="text-xs text-blue-400 animate-pulse">
                Sincronizando con Neon DB...
              </span>
            )}
          </div>

          {cargandoInicial ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-24 rounded-2xl bg-[#111113] border border-white/5 animate-pulse p-4"
                />
              ))}
            </div>
          ) : autosEnPista.length === 0 ? (
            <div className="bg-[#111113] rounded-2xl border border-white/5 p-6 text-center text-xs text-zinc-400">
              No hay vehículos en pista en este momento. Busca una placa arriba para iniciar.
            </div>
          ) : (
            <div className="flex gap-3.5 overflow-x-auto pb-2">
              {autosEnPista.map((auto) => {
                const activo = ordenActiva?.id === auto.id;
                const enCaja = auto.status === "EN_CAJA" || auto.status === "LISTO_PARA_COBRO";
                return (
                  <div
                    key={auto.id}
                    onClick={() => {
                      setOrdenActiva(auto);
                      setKmActualInput(auto.mileage ? String(auto.mileage) : "");
                      setFotosRecepcion(auto.receptionPhotos || []);
                    }}
                    className={`min-w-[280px] sm:min-w-[310px] text-left p-4 rounded-2xl transition-all cursor-pointer shrink-0 border flex flex-col justify-between ${
                      activo
                        ? "bg-white/[0.08] border-white/25 ring-1 ring-white/15"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
                    }`}
                  >
                    <div>
                      {/* Placa y Cronómetro */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-300">
                            {auto.plate}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            #{auto.orderNumber}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-lg bg-[#0a0a0a] border font-mono text-[11px] font-bold ${
                            enCaja
                              ? "border-emerald-500/30 text-emerald-300"
                              : "border-white/10 text-emerald-400"
                          }`}
                        >
                          ⏱ {formatElapsedTime(auto.startedAt, auto.completedAt, nowTick)}
                        </span>
                      </div>

                      {/* Vehículo y Cliente */}
                      <p className="text-sm font-semibold text-white truncate mt-2">
                        {auto.vehicle}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        Cliente: <span className="text-zinc-200">{auto.client}</span>
                      </p>

                      {/* Combustible y Servicios Asignados */}
                      <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-300">
                            ⛽ Combustible: <strong>{auto.fuelLevel || "1/2"}</strong>
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            {auto.items.length} {auto.items.length === 1 ? "servicio" : "servicios"}
                          </span>
                        </div>

                        {auto.items.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {auto.items.slice(0, 3).map((it) => (
                              <span
                                key={it.id}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 truncate max-w-[130px]"
                              >
                                {it.name}
                              </span>
                            ))}
                            {auto.items.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-400">
                                +{auto.items.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón minimalista: Enviar a Oficina / Listo para Caja */}
                    <div className="mt-3 pt-2.5 border-t border-white/5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrdenActiva(auto);
                          handleEnviarAPosCaja(auto);
                        }}
                        disabled={enviandoAPos || auto.items.length === 0}
                        className={`w-full h-9 px-3 rounded-xl border text-[11px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-40 backdrop-blur-md ${
                          enCaja
                            ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-200"
                            : "bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.1] text-zinc-200 hover:text-white"
                        }`}
                      >
                        <span className="p-1 rounded-md bg-white/5 text-zinc-200">
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 2 11 13" />
                            <path d="m22 2-7 20-4-9-9-4Z" />
                          </svg>
                        </span>
                        <span>
                          {enCaja
                            ? "En Oficina / Listo para Caja"
                            : "Enviar a Oficina / Listo para Caja"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =====================================================================
          VENTANA FLOTANTE AL MARCAR CUALQUIERA DE LAS 7 TARJETAS
          (ESTÉTICA GLASSMORPHISM Y SIN MOSTRAR PRECIOS NI SUBTOTALES)
          ===================================================================== */}
      {tarjetaSeleccionadaObj && (
        <div
          onClick={() => {
            setActiveCardId(null);
            setMostrarMenuFiltroFlotante(false);
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113]/95 backdrop-blur-xl border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[88vh] flex flex-col space-y-4"
          >
            {/* Cabecera del Flotante */}
            <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-3 rounded-xl bg-white/5 text-zinc-200 shrink-0">
                  {tarjetaSeleccionadaObj.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                    {tarjetaSeleccionadaObj.title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    {ordenActiva
                      ? `Orden #${ordenActiva.orderNumber} (${ordenActiva.plate}) • 👤 ${empleadoLogueado.nombre}`
                      : "Selecciona o busca un vehículo para sumar a su orden"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveCardId(null);
                  setMostrarMenuFiltroFlotante(false);
                }}
                className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* BARRA DE BUSCADOR Y FILTRO SOBRE EL FLOTANTE */}
            <div className="flex items-center gap-2.5 relative z-20">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
                  🔍
                </span>
                <input
                  type="text"
                  value={busquedaFlotante}
                  onChange={(e) => setBusquedaFlotante(e.target.value)}
                  placeholder={
                    tarjetaSeleccionadaObj.id === "repuestos"
                      ? "Buscar repuesto por nombre, viscosidad, código o marca..."
                      : `Buscar en ${tarjetaSeleccionadaObj.title}...`
                  }
                  className="w-full pl-10 pr-9 h-11 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-white/25 text-white text-sm font-normal placeholder:text-zinc-500 focus:outline-none transition-all"
                />
                {busquedaFlotante && (
                  <button
                    type="button"
                    onClick={() => setBusquedaFlotante("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Botón y Menú Desplegable de Filtro sobre el flotante */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMostrarMenuFiltroFlotante((prev) => !prev)}
                  className="h-11 px-4 rounded-xl bg-[#0a0a0a] hover:bg-[#161618] border border-white/10 text-zinc-200 text-sm font-normal flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>
                    {opcionesFiltroFlotante.find((o) => o.id === filtroFlotante)?.label ||
                      "Filtro"}
                  </span>
                  <svg
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      mostrarMenuFiltroFlotante ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {mostrarMenuFiltroFlotante && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#161618] border border-white/10 shadow-2xl py-1.5 z-30">
                    {opcionesFiltroFlotante.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setFiltroFlotante(opt.id);
                          setMostrarMenuFiltroFlotante(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          filtroFlotante === opt.id
                            ? "bg-white/10 text-white"
                            : "text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {filtroFlotante === opt.id && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SI ES LA TARJETA "OTRO": FORMULARIO RÁPIDO SIN PRECIOS */}
            {tarjetaSeleccionadaObj.id === "otro" && (
              <form
                onSubmit={handleAgregarServicioOtroCustom}
                className="p-3 rounded-xl bg-[#0a0a0a] border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <input
                  type="text"
                  value={otroNombreCustom}
                  onChange={(e) => setOtroNombreCustom(e.target.value)}
                  placeholder="Escribir otro servicio o trabajo realizado..."
                  className="flex-1 h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-white/25"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-100 text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  + Asignar Servicio
                </button>
              </form>
            )}

            {/* LISTADO DE SERVICIOS E ÍTEMS DENTRO DEL FLOTANTE (SIN PRECIOS NI SUBTOTALES) */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-2.5">
              {tarjetaSeleccionadaObj.id !== "repuestos" ? (
                presetsFiltradosFlotante.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-10 text-center">
                    No se encontraron servicios con ese criterio en {tarjetaSeleccionadaObj.title}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {presetsFiltradosFlotante.map((preset) => {
                      const itemEnOrden = ordenActiva?.items.find(
                        (i) =>
                          (i.code === preset.code ||
                            i.name.toLowerCase() === preset.name.toLowerCase()) &&
                          (!i.empleado_id || i.empleado_id === empleadoLogueado.id)
                      );
                      const seleccionado = Boolean(itemEnOrden);

                      return (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() =>
                            handleToggleServicioPreset(tarjetaSeleccionadaObj.title, preset)
                          }
                          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${
                            seleccionado
                              ? "bg-emerald-500/15 border-emerald-500/40 text-white"
                              : "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs border shrink-0 ${
                                seleccionado
                                  ? "bg-emerald-500 border-emerald-400 text-black font-bold"
                                  : "border-zinc-600 bg-black/40 text-transparent"
                              }`}
                            >
                              ✓
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-medium block truncate">
                                {preset.name}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {preset.subCategory}
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] font-medium text-zinc-400 shrink-0">
                            {seleccionado ? "Asignado" : "+ Agregar"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : repuestosFiltradosFlotante.length === 0 ? (
                <p className="text-xs text-zinc-500 py-10 text-center">
                  No se encontraron repuestos o insumos con ese criterio.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {repuestosFiltradosFlotante.map((prod) => {
                    const enOrden = ordenActiva?.items.find(
                      (i) =>
                        i.productId === prod.id &&
                        (!i.empleado_id || i.empleado_id === empleadoLogueado.id)
                    );
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleAgregarRepuestoAOrden(prod)}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${
                          enOrden
                            ? "bg-emerald-500/15 border-emerald-500/40"
                            : "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-10 h-10 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                              🛢️
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {prod.name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                              <span className="font-mono">{prod.code}</span>
                              <span>•</span>
                              <span
                                className={
                                  prod.stock > prod.minStock
                                    ? "text-emerald-400"
                                    : prod.stock > 0
                                    ? "text-amber-400"
                                    : "text-rose-400"
                                }
                              >
                                Stock: {prod.stock}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {enOrden ? (
                            <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold">
                              {enOrden.qty} en OT
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400 font-medium">
                              + Agregar
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie del Flotante (SIN PRECIOS NI SUBTOTALES) */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                {ordenActiva ? (
                  <span>
                    En orden: <strong className="text-white">{ordenActiva.items.length} servicios / ítems</strong> • Empleado:{" "}
                    <strong className="text-emerald-400">{empleadoLogueado.nombre}</strong>
                  </span>
                ) : (
                  <span>Sin vehículo activo seleccionado</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveCardId(null);
                  setMostrarMenuFiltroFlotante(false);
                }}
                className="h-10 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition-all cursor-pointer active:scale-95"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: HISTORIAL DE ÓRDENES PREVIAS DEL VEHÍCULO
          ===================================================================== */}
      {mostrarModalHistorial && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-white/10 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Historial de Mantenimiento • {vehiculoEncontrado?.plate}
                </h3>
                <p className="text-xs text-zinc-400">
                  {vehiculoEncontrado?.brand} {vehiculoEncontrado?.model} ({clienteEncontrado?.name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalHistorial(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {historialVehiculo.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-10">
                  No se registran órdenes previas para este vehículo.
                </p>
              ) : (
                historialVehiculo.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-xl bg-[#161618] border border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-400">
                        {h.orderNumber || h.serviceCode}
                      </span>
                      <span className="text-xs text-zinc-400">{h.date}</span>
                    </div>
                    <p className="text-xs text-white font-medium">
                      {Array.isArray(h.services) && h.services.length > 0
                        ? h.services.join(", ")
                        : h.notes || "Mantenimiento general"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
                      <span>
                        Técnico: {h.mechanic} • Km: {h.mileage}
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        Completado
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL CONFIRMACIÓN DE ENVÍO A OFICINA / CAJA POS
          ===================================================================== */}
      {modalConfirmPos && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-white">
              Enviado a Oficina / Listo para Caja
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              El cronómetro se ha detenido, el estado en Neon cambió a <strong>EN_CAJA</strong> y los servicios realizados, repuestos utilizados y empleados asignados ya están disponibles en el <strong>POS de Oficina</strong>.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmPos(null)}
                className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Seguir en Pista
              </button>
              <button
                type="button"
                onClick={() => router.push("/pos/venta")}
                className="flex-1 h-11 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer"
              >
                Abrir POS de Oficina →
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* =====================================================================
          MODAL DE IMPRESIÓN Y EMISIÓN DE DOCUMENTOS (PDF, TICKET, ETIQUETA QR)
          ===================================================================== */}
      {modalImpresionDoc && ordenActiva && (
        <div
          onClick={() => setModalImpresionDoc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4"
          >
            {/* Cabecera del Documento */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {modalImpresionDoc === "PDF"
                    ? "Vista Previa: Orden de Trabajo en PDF"
                    : modalImpresionDoc === "TICKET"
                    ? "Vista Previa: Ticket Térmico POS (80mm)"
                    : "Vista Previa: Etiqueta Adhesiva QR"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalImpresionDoc(null)}
                className="text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 cursor-pointer text-xs"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Contenido según el tipo de documento */}
            <div className="p-4 rounded-xl bg-white text-black font-sans shadow-inner space-y-4">
              {modalImpresionDoc === "PDF" && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 tracking-tight">TALLER AUTOMOTRIZ</h2>
                      <p className="text-[11px] text-zinc-500">Orden de Servicio & Control de Calidad</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-zinc-900">#{ordenActiva.orderNumber}</span>
                      <p className="text-[10px] text-zinc-500">{new Date().toLocaleDateString("es-EC")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                    <div>
                      <p><strong>Cliente:</strong> {ordenActiva.client}</p>
                      <p><strong>Teléfono:</strong> {ordenActiva.clientPhone || "N/A"}</p>
                    </div>
                    <div>
                      <p><strong>Vehículo:</strong> {ordenActiva.vehicle}</p>
                      <p><strong>Placa:</strong> {ordenActiva.plate} | <strong>Km:</strong> {ordenActiva.mileage || "N/D"}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-900 mb-1 border-b pb-1">SERVICIOS Y REPUESTOS:</h4>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b text-[11px] text-zinc-600">
                          <th className="py-1">Descripción</th>
                          <th className="py-1 text-center">Cant</th>
                          <th className="py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenActiva.items.map((it) => (
                          <tr key={it.id} className="border-b border-zinc-100">
                            <td className="py-1 font-medium">{it.name}</td>
                            <td className="py-1 text-center">{it.qty || 1}</td>
                            <td className="py-1 text-right font-mono">${((it.price || 0) * (it.qty || 1)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <div className="text-right space-y-0.5 font-mono">
                      <p className="text-xs"><strong>Total Orden:</strong> ${(Number(ordenActiva.totalCost) || Number(calculosPresupuestoEtapa4.total) || 0).toFixed(2)}</p>
                      <p className="text-xs text-emerald-700"><strong>Abonado:</strong> ${(ordenActiva.totalPaid || 0).toFixed(2)}</p>
                      <p className="text-sm font-bold text-zinc-900"><strong>Saldo:</strong> ${(ordenActiva.balanceDue !== undefined ? ordenActiva.balanceDue : Math.max(0, (Number(ordenActiva.totalCost) || Number(calculosPresupuestoEtapa4.total) || 0) - (ordenActiva.totalPaid || 0))).toFixed(2)}</p>
                    </div>
                  </div>

                  {etapa7InformeTecnico && (
                    <div className="p-2 bg-zinc-50 rounded border border-zinc-200">
                      <strong className="block text-[11px] mb-0.5">INFORME TÉCNICO:</strong>
                      <p className="font-mono text-[10px] whitespace-pre-wrap">{etapa7InformeTecnico}</p>
                    </div>
                  )}

                  <div className="pt-4 flex items-end justify-between border-t border-zinc-200">
                    <div className="text-center w-40">
                      <div className="h-10 border-b border-zinc-400 mb-1 flex items-center justify-center">
                        {etapa7FirmaDataUrl ? (
                          <img src={etapa7FirmaDataUrl} alt="Firma" className="max-h-10" />
                        ) : (
                          <span className="text-[10px] text-zinc-400">Firma registrada</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600 font-semibold">Firma del Cliente</p>
                    </div>
                    <div className="text-right text-[10px] text-zinc-400">
                      Documento generado por Sistema Taller AutoG
                    </div>
                  </div>
                </div>
              )}

              {modalImpresionDoc === "TICKET" && (
                <div className="font-mono text-[11px] space-y-2 max-w-xs mx-auto text-zinc-800">
                  <div className="text-center border-b border-dashed border-zinc-400 pb-2">
                    <h3 className="font-bold text-sm">TALLER AUTOMOTRIZ</h3>
                    <p className="text-[10px]">COMPROBANTE DE SERVICIO</p>
                    <p className="text-[10px]">#{ordenActiva.orderNumber} • {new Date().toLocaleDateString("es-EC")}</p>
                  </div>
                  <div className="border-b border-dashed border-zinc-400 pb-2 space-y-0.5 text-[10px]">
                    <p>PLACA: <strong>{ordenActiva.plate}</strong></p>
                    <p>VEHÍCULO: {ordenActiva.vehicle}</p>
                    <p>CLIENTE: {ordenActiva.client}</p>
                  </div>
                  <div className="border-b border-dashed border-zinc-400 pb-2">
                    {ordenActiva.items.map((it) => (
                      <div key={it.id} className="flex justify-between py-0.5">
                        <span className="truncate max-w-[180px]">{it.name}</span>
                        <span>${((it.price || 0) * (it.qty || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-b border-dashed border-zinc-400 pb-2 space-y-0.5 text-right font-bold">
                    <p>TOTAL: ${(Number(ordenActiva.totalCost) || Number(calculosPresupuestoEtapa4.total) || 0).toFixed(2)}</p>
                    <p className="text-emerald-700">ABONADO: ${(ordenActiva.totalPaid || 0).toFixed(2)}</p>
                    <p>SALDO: ${(ordenActiva.balanceDue !== undefined ? ordenActiva.balanceDue : Math.max(0, (Number(ordenActiva.totalCost) || Number(calculosPresupuestoEtapa4.total) || 0) - (ordenActiva.totalPaid || 0))).toFixed(2)}</p>
                  </div>
                  <div className="text-center pt-2">
                    <p className="text-[10px] text-zinc-600">¡Gracias por su preferencia!</p>
                    <p className="text-[9px] text-zinc-500 font-mono">PIN: {etapa6TrackingPin}</p>
                  </div>
                </div>
              )}

              {modalImpresionDoc === "ETIQUETA_QR" && (
                <div className="p-4 border-2 border-dashed border-zinc-400 rounded-xl max-w-sm mx-auto text-center space-y-3">
                  <div className="bg-zinc-900 text-white py-1 px-3 rounded font-mono text-xl font-bold tracking-widest inline-block">
                    {ordenActiva.plate}
                  </div>
                  <div className="space-y-0.5 text-xs text-zinc-700">
                    <p className="font-bold">ORDEN #{ordenActiva.orderNumber}</p>
                    <p>{ordenActiva.vehicle}</p>
                    <p className="text-[10px] text-zinc-500">Fecha: {new Date().toLocaleDateString("es-EC")}</p>
                  </div>
                  <div className="p-3 bg-zinc-100 rounded-lg inline-block border border-zinc-300">
                    <svg className="w-24 h-24 mx-auto text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625h3v3h-3zM18 18h3v3h-3zM18 13.5h3v1.5H18zM13.5 19.5h1.5v3h-1.5z" />
                    </svg>
                    <span className="text-[9px] text-zinc-500 font-mono block mt-1">PIN: {etapa6TrackingPin}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Escanea para ver avance en vivo</p>
                </div>
              )}
            </div>

            {/* Pie del Modal con Botón de Imprimir */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalImpresionDoc(null)}
                className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <span>🖨️</span>
                <span>Imprimir Ahora (Ctrl + P)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <TallerMobileNav />
    </div>
  );
}
