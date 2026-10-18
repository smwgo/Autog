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
// CATÁLOGO RÁPIDO DE LAS 7 TARJETAS (6 ESPECIALIDADES + "OTRO")
// ============================================================================
const SERVICE_CARDS = [
  {
    id: "lubricacion",
    title: "Lubricación y Filtros",
    color: "bg-blue-500",
    gradient: "from-blue-500 to-indigo-600",
    glowColor: "rgba(59, 130, 246, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
    color: "bg-amber-500",
    gradient: "from-amber-500 to-orange-600",
    glowColor: "rgba(245, 158, 11, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
    color: "bg-emerald-500",
    gradient: "from-emerald-400 to-teal-600",
    glowColor: "rgba(16, 185, 129, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
    color: "bg-purple-500",
    gradient: "from-purple-500 to-indigo-600",
    glowColor: "rgba(168, 85, 247, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
    color: "bg-sky-500",
    gradient: "from-sky-400 to-blue-600",
    glowColor: "rgba(14, 165, 233, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
    color: "bg-pink-500",
    gradient: "from-pink-500 to-rose-600",
    glowColor: "rgba(236, 72, 153, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    presets: [] as ServicePreset[],
  },
  {
    id: "otro",
    title: "Otro",
    color: "bg-indigo-500",
    gradient: "from-violet-500 to-fuchsia-600",
    glowColor: "rgba(139, 92, 246, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
  // FLOTANTE 01 - ETAPA 1: CLIENTE (SE ABRE AL INGRESAR AL PANEL TALLER)
  // ==========================================================================
  const [mostrarFlotanteEtapa1, setMostrarFlotanteEtapa1] = useState(true);
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
  const [mostrarFlotanteEtapa3, setMostrarFlotanteEtapa3] = useState(false);
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
  const [mostrarFlotanteEtapa4, setMostrarFlotanteEtapa4] = useState(false);
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
  const [mostrarFlotanteEtapa5, setMostrarFlotanteEtapa5] = useState(false);
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
  const [mostrarFlotanteEtapa6, setMostrarFlotanteEtapa6] = useState(false);
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
  const [mostrarFlotanteEtapa7, setMostrarFlotanteEtapa7] = useState<boolean>(false);
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

  // ==========================================================================
  // FLOTANTE 08 - ETAPA 8: COBRO Y DOCUMENTO
  // (Abonos y saldo pendiente, Link de pago pasarela, PDF con logo, Ticket térmico y Etiqueta QR)
  // ==========================================================================
  const [mostrarFlotanteEtapa8, setMostrarFlotanteEtapa8] = useState<boolean>(false);
  const [etapa8PagosLista, setEtapa8PagosLista] = useState<OrderPaymentItem[]>([]);
  const [etapa8MontoAbono, setEtapa8MontoAbono] = useState<string>("");
  const [etapa8MetodoPago, setEtapa8MetodoPago] = useState<string>("Efectivo");
  const [etapa8ReferenciaPago, setEtapa8ReferenciaPago] = useState<string>("");
  const [etapa8NotaPago, setEtapa8NotaPago] = useState<string>("");
  const [etapa8PasarelaNombre, setEtapa8PasarelaNombre] = useState<string>(
    "PayPhone / Deuna / Stripe"
  );
  const [etapa8PasarelaUrl, setEtapa8PasarelaUrl] = useState<string>("");
  const [guardandoEtapa8, setGuardandoEtapa8] = useState<boolean>(false);
  const [copiadoLinkPagoEtapa8, setCopiadoLinkPagoEtapa8] = useState<boolean>(false);

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
            if (!prev) return pista[0];
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

    // Sincronizar Etapa 8: Cobro y Documento
    const pagosActuales = Array.isArray(ordenActiva.payments) ? ordenActiva.payments : [];
    setEtapa8PagosLista(pagosActuales);
    const abonado = pagosActuales.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const pendiente = Math.max(0, Number(ordenActiva.totalCost || 0) - abonado);
    setEtapa8MontoAbono(pendiente > 0 ? pendiente.toFixed(2) : "");
    setEtapa8PasarelaUrl(ordenActiva.paymentGatewayUrl || "");
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

  const handleGuardarEtapa7EntregaFirma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenActiva) {
      setMostrarFlotanteEtapa7(false);
      setMostrarFlotanteEtapa8(true);
      return;
    }
    const updated = await sincronizarEtapa7EnNeon();
    if (updated) {
      setMostrarFlotanteEtapa7(false);
      setMostrarFlotanteEtapa8(true);
      mostrarToast(
        `Etapa 7 completada. Ahora registra el cobro e imprime el documento en Etapa 8.`
      );
    }
  };

  // ==========================================================================
  // MANEJADORES DE ETAPA 8: COBRO Y DOCUMENTO
  // (1. Abonos y saldo pendiente, 2. Link de pago pasarela, 3. PDF con logo, Ticket térmico y Etiqueta QR)
  // ==========================================================================
  const calculosCobroEtapa8 = useMemo(() => {
    const totalOrden = Number(ordenActiva?.totalCost || 0);
    const totalAbonado = Number(
      etapa8PagosLista
        .reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
        .toFixed(2)
    );
    const saldoPendiente = Number(Math.max(0, totalOrden - totalAbonado).toFixed(2));
    const porcentajePagado =
      totalOrden > 0
        ? Math.min(100, Math.round((totalAbonado / totalOrden) * 100))
        : 100;

    return {
      totalOrden,
      totalAbonado,
      saldoPendiente,
      porcentajePagado,
    };
  }, [ordenActiva?.totalCost, etapa8PagosLista]);

  const linkPagoPasarelaEtapa8 = useMemo(() => {
    if (etapa8PasarelaUrl.trim()) return etapa8PasarelaUrl.trim();
    const ordNum = ordenActiva?.orderNumber || "OT-PAGO";
    const monto = calculosCobroEtapa8.saldoPendiente.toFixed(2);
    if (typeof window === "undefined") {
      return `/taller/entrega/${encodeURIComponent(ordNum)}?monto=${monto}`;
    }
    return `${window.location.origin}/taller/entrega/${encodeURIComponent(
      ordenActiva?.quoteToken || ordNum
    )}?monto=${monto}`;
  }, [etapa8PasarelaUrl, ordenActiva, calculosCobroEtapa8.saldoPendiente]);

  const sincronizarEtapa8EnNeon = async (partial?: {
    payments?: OrderPaymentItem[];
    newPayment?: OrderPaymentItem;
    paymentGatewayUrl?: string;
  }) => {
    if (!ordenActiva) return null;

    try {
      setGuardandoEtapa8(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_8_COBRO_DOCUMENTO",
          orderId: ordenActiva.id,
          payments: partial?.payments ?? etapa8PagosLista,
          newPayment: partial?.newPayment,
          paymentGatewayUrl: partial?.paymentGatewayUrl ?? etapa8PasarelaUrl,
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
      console.error("Error sincronizando Etapa 8:", err);
    } finally {
      setGuardandoEtapa8(false);
    }
    return null;
  };

  // Registrar un abono o pago y actualizar automáticamente el saldo pendiente
  const handleRegistrarAbonoPagoEtapa8 = async () => {
    const montoNum = Number(parseFloat(etapa8MontoAbono).toFixed(2));
    if (!montoNum || montoNum <= 0) {
      mostrarToast("Ingresa un monto válido para registrar el abono o pago", "err");
      return;
    }

    const nuevoPago: OrderPaymentItem = {
      id: `pay-${Date.now()}`,
      amount: montoNum,
      method: etapa8MetodoPago,
      reference:
        etapa8ReferenciaPago.trim() ||
        `REC-${Math.floor(1000 + Math.random() * 9000)}`,
      note: etapa8NotaPago.trim(),
      date: new Date().toLocaleString("es-EC", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nuevosPagos = [...etapa8PagosLista, nuevoPago];
    setEtapa8PagosLista(nuevosPagos);
    setEtapa8ReferenciaPago("");
    setEtapa8NotaPago("");

    const nuevoTotalAbonado = nuevosPagos.reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0
    );
    const nuevoSaldo = Math.max(
      0,
      Number(((ordenActiva?.totalCost || 0) - nuevoTotalAbonado).toFixed(2))
    );
    setEtapa8MontoAbono(nuevoSaldo > 0 ? nuevoSaldo.toFixed(2) : "");

    if (ordenActiva) {
      await sincronizarEtapa8EnNeon({
        payments: nuevosPagos,
        newPayment: nuevoPago,
      });
    }
    mostrarToast(
      nuevoSaldo <= 0
        ? `Pago completo registrado ($${montoNum.toFixed(2)} • ${etapa8MetodoPago}). Saldo: $0.00`
        : `Abono de $${montoNum.toFixed(2)} (${etapa8MetodoPago}) registrado. Saldo pendiente: $${nuevoSaldo.toFixed(2)}`
    );
  };

  const handleEliminarPagoEtapa8 = async (id: string) => {
    const filtrados = etapa8PagosLista.filter((p) => p.id !== id);
    setEtapa8PagosLista(filtrados);
    if (ordenActiva) {
      await sincronizarEtapa8EnNeon({ payments: filtrados });
    }
  };

  const handleCopiarLinkPagoEtapa8 = async () => {
    try {
      await navigator.clipboard.writeText(linkPagoPasarelaEtapa8);
      setCopiadoLinkPagoEtapa8(true);
      mostrarToast("Link de pago copiado al portapapeles");
      setTimeout(() => setCopiadoLinkPagoEtapa8(false), 3000);
    } catch {
      mostrarToast("No se pudo copiar el link de pago", "err");
    }
  };

  const handleEnviarLinkPagoWhatsAppEtapa8 = () => {
    const telRaw =
      etapa6ClienteTelefono.trim() ||
      ordenActiva?.clientPhone ||
      clienteEncontrado?.phone ||
      "";
    const digits = telRaw.replace(/\D/g, "");
    const clienteNom = ordenActiva?.client || "Cliente";
    const ordNum = ordenActiva?.orderNumber || "OT";
    const saldo = calculosCobroEtapa8.saldoPendiente.toFixed(2);

    const msg = `Hola *${clienteNom}*, te compartimos el link de pago seguro (${etapa8PasarelaNombre}) para tu Orden *#${ordNum}*.\n\n💳 *Saldo a cancelar:* $${saldo}\n👉 *Paga en línea aquí:*\n${linkPagoPasarelaEtapa8}`;

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

  // 1. Imprimir Orden en PDF con tu Logo (Formato A4 Ejecutivo + Firma + Abonos)
  const handleImprimirOrdenPdfConLogoEtapa8 = () => {
    if (typeof window === "undefined") return;
    const ord = ordenActiva;
    const ordNum = ord?.orderNumber || "OT-2026";
    const cliente = ord?.client || "Cliente General";
    const docCliente = ord?.clientIdDoc || clienteEncontrado?.identification || "S/N";
    const telCliente = ord?.clientPhone || etapa6ClienteTelefono || "S/N";
    const vehiculo = ord?.vehicle || "Vehículo";
    const placa = ord?.plate || "S/P";
    const km = ord?.mileage ? `${ord.mileage.toLocaleString()} km` : "N/A";
    const proxKm = ord?.nextOilChangeKm ? `${ord.nextOilChangeKm.toLocaleString()} km` : "Por definir";
    const items = ord?.items || [];
    const qrData = encodeURIComponent(linkSeguimientoEnLinea);
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

    const itemsRows = items
      .map(
        (it, idx) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${idx + 1}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>${it.name}</strong><br/><small style="color:#6b7280">${it.code}</small></td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.qty || 1}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${Number(it.price || 0).toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;">$${((it.qty || 1) * Number(it.price || 0)).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const pagosRows =
      etapa8PagosLista.length > 0
        ? etapa8PagosLista
            .map(
              (p) => `
          <tr>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${p.date}</td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${p.method}</td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${p.reference}</td>
            <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;">$${Number(p.amount).toFixed(2)}</td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="4" style="padding:8px;color:#6b7280;text-align:center;">Sin abonos registrados</td></tr>`;

    const firmaHtml = etapa7FirmaDataUrl
      ? `<img src="${etapa7FirmaDataUrl}" style="max-height:75px;object-fit:contain;" />`
      : `<div style="height:60px;"></div>`;

    const win = window.open("", "_blank", "width=900,height=800");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Orden de Trabajo #${ordNum} - ${placa}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 28px; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
            .logo-box { display: flex; align-items: center; gap: 12px; }
            .logo-badge { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg,#2563eb,#10b981); color: #fff; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
            .box { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; background: #f9fafb; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th { background: #111827; color: #fff; text-align: left; padding: 8px; font-size: 12px; }
            .totals { width: 280px; margin-left: auto; border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; background: #f9fafb; }
            .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom:14px;text-align:right;">
            <button onclick="window.print()" style="padding:8px 16px;background:#111827;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">🖨️ Imprimir / Guardar PDF</button>
          </div>
          <div class="header">
            <div class="logo-box">
              <div class="logo-badge">AG</div>
              <div>
                <h1 style="margin:0;font-size:20px;">CENTRO AUTOMOTRIZ AUTOG</h1>
                <p style="margin:2px 0 0;color:#4b5563;font-size:12px;">Servicio Técnico Especializado • Orden de Trabajo y Comprobante de Entrega</p>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:18px;font-weight:900;color:#2563eb;">ORDEN #${ordNum}</div>
              <div style="font-size:12px;color:#4b5563;">PIN Seguimiento: <strong>${etapa6TrackingPin}</strong></div>
              <div style="font-size:11px;color:#6b7280;">Fecha: ${new Date().toLocaleDateString("es-EC")}</div>
            </div>
          </div>

          <div class="grid">
            <div class="box">
              <strong>DATOS DEL CLIENTE</strong><br/>
              Nombre: ${cliente}<br/>
              RUC / Cédula: ${docCliente}<br/>
              Teléfono: ${telCliente}
            </div>
            <div class="box">
              <strong>DATOS DEL VEHÍCULO</strong><br/>
              Vehículo: ${vehiculo} • Placa: <strong>${placa}</strong><br/>
              Kilometraje: ${km} • Próx. Cambio Aceite: <strong>${proxKm}</strong><br/>
              Técnico: ${ord?.mechanic || "Taller"}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Servicio / Repuesto</th>
                <th style="text-align:center;">Cant.</th>
                <th style="text-align:right;">P. Unit.</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows || `<tr><td colspan="5" style="padding:10px;text-align:center;">Sin ítems registrados</td></tr>`}
            </tbody>
          </table>

          <div class="grid">
            <div>
              <div class="box" style="margin-bottom:12px;">
                <strong>INFORME TÉCNICO DE ENTREGA</strong>
                <p style="white-space:pre-line;margin:6px 0 0;font-size:12px;color:#374151;">${etapa7InformeTecnico}</p>
              </div>
              <div class="box">
                <strong>HISTORIAL DE ABONOS Y PAGOS</strong>
                <table style="margin-top:6px;margin-bottom:0;">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Forma de Pago</th>
                      <th>Referencia</th>
                      <th style="text-align:right;">Monto</th>
                    </tr>
                  </thead>
                  <tbody>${pagosRows}</tbody>
                </table>
              </div>
            </div>

            <div>
              <div class="totals">
                <div class="totals-row"><span>Total Orden:</span><strong>$${calculosCobroEtapa8.totalOrden.toFixed(2)}</strong></div>
                <div class="totals-row" style="color:#059669;"><span>Total Abonado / Pagado:</span><strong>$${calculosCobroEtapa8.totalAbonado.toFixed(2)}</strong></div>
                <div class="totals-row" style="border-top:1px solid #d1d5db;margin-top:6px;padding-top:6px;font-size:15px;color:#dc2626;">
                  <span><strong>Saldo Pendiente:</strong></span>
                  <strong>$${calculosCobroEtapa8.saldoPendiente.toFixed(2)}</strong>
                </div>
              </div>

              <div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #d1d5db;border-radius:10px;padding:12px;">
                <div style="text-align:center;flex:1;">
                  ${firmaHtml}
                  <div style="border-top:1px solid #111827;padding-top:4px;font-size:11px;">
                    Firma de Conformidad: <strong>${etapa7FirmadoPor || cliente}</strong>
                  </div>
                </div>
                <img src="${qrImgUrl}" width="84" height="84" alt="QR Seguimiento" />
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  // 2. Imprimir Ticket Térmico (80mm POS)
  const handleImprimirTicketTermicoEtapa8 = () => {
    if (typeof window === "undefined") return;
    const ord = ordenActiva;
    const ordNum = ord?.orderNumber || "OT-2026";
    const placa = ord?.plate || "S/P";
    const cliente = ord?.client || "Cliente";
    const items = ord?.items || [];
    const qrData = encodeURIComponent(linkSeguimientoEnLinea);
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}`;

    const itemsHtml = items
      .map(
        (it) => `
        <div style="display:flex;justify-content:space-between;margin:3px 0;">
          <span>${it.qty || 1}x ${it.name.slice(0, 22)}</span>
          <span>$${((it.qty || 1) * Number(it.price || 0)).toFixed(2)}</span>
        </div>`
      )
      .join("");

    const win = window.open("", "_blank", "width=380,height=680");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket Térmico #${ordNum}</title>
          <style>
            body { width: 280px; margin: 0 auto; padding: 12px; font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
            .center { text-align: center; }
            .sep { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom:10px;text-align:center;">
            <button onclick="window.print()" style="padding:6px 12px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;">🖨️ Imprimir Ticket 80mm</button>
          </div>
          <div class="center">
            <strong style="font-size:15px;">TALLER AUTOMOTRIZ AUTOG</strong><br/>
            Ticket de Orden y Cobro<br/>
            <strong>#${ordNum}</strong> • Placa: <strong>${placa}</strong>
          </div>
          <div class="sep"></div>
          <div>Cliente: ${cliente}</div>
          <div>Vehículo: ${ord?.vehicle || ""}</div>
          <div>Fecha: ${new Date().toLocaleString("es-EC")}</div>
          <div class="sep"></div>
          ${itemsHtml || "<div>Servicio general de taller</div>"}
          <div class="sep"></div>
          <div class="row"><strong>TOTAL ORDEN:</strong><strong>$${calculosCobroEtapa8.totalOrden.toFixed(2)}</strong></div>
          <div class="row"><span>ABONADO:</span><span>$${calculosCobroEtapa8.totalAbonado.toFixed(2)}</span></div>
          <div class="row" style="font-size:14px;"><strong>SALDO PENDIENTE:</strong><strong>$${calculosCobroEtapa8.saldoPendiente.toFixed(2)}</strong></div>
          <div class="sep"></div>
          <div class="center">
            <div>Seguimiento en línea (PIN: <strong>${etapa6TrackingPin}</strong>)</div>
            <img src="${qrImgUrl}" width="110" height="110" style="margin:6px auto;display:block;" />
            <small>¡Gracias por su visita!</small>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  // 3. Imprimir Etiqueta con QR (Para Parabrisas / Llavero / Próximo Cambio de Aceite)
  const handleImprimirEtiquetaQrEtapa8 = () => {
    if (typeof window === "undefined") return;
    const ord = ordenActiva;
    const ordNum = ord?.orderNumber || "OT-2026";
    const placa = ord?.plate || "S/P";
    const kmActual = ord?.mileage ? `${ord.mileage.toLocaleString()} km` : "N/A";
    const proxKm = ord?.nextOilChangeKm
      ? `${ord.nextOilChangeKm.toLocaleString()} km`
      : ord?.mileage
      ? `${(ord.mileage + 5000).toLocaleString()} km`
      : "5,000 km";
    const qrData = encodeURIComponent(linkSeguimientoEnLinea);
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}`;

    const win = window.open("", "_blank", "width=420,height=360");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Etiqueta QR #${ordNum} - ${placa}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 14px; }
            .label-card { width: 320px; border: 2px solid #000; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom:10px;">
            <button onclick="window.print()" style="padding:6px 12px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;">🏷️ Imprimir Etiqueta QR</button>
          </div>
          <div class="label-card">
            <img src="${qrImgUrl}" width="96" height="96" alt="QR" />
            <div style="font-size:12px;line-height:1.4;">
              <div style="font-weight:900;font-size:15px;">PLACA: ${placa}</div>
              <div><strong>Orden:</strong> #${ordNum} (PIN: ${etapa6TrackingPin})</div>
              <div><strong>Km Actual:</strong> ${kmActual}</div>
              <div style="margin-top:4px;padding:3px 6px;background:#000;color:#fff;font-weight:bold;border-radius:4px;display:inline-block;">
                PRÓX. SERVICIO: ${proxKm}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleGuardarEtapa8CobroDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenActiva) {
      setMostrarFlotanteEtapa8(false);
      return;
    }
    const updated = await sincronizarEtapa8EnNeon();
    if (updated) {
      setMostrarFlotanteEtapa8(false);
      mostrarToast(
        `Etapa 8 guardada: Orden #${updated.orderNumber} lista (Saldo pendiente: $${calculosCobroEtapa8.saldoPendiente.toFixed(2)})`
      );
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
  // BLOQUE 1: BÚSQUEDA POR PLACA O CÉDULA/RUC Y REGISTRO EXPRESS
  // ==========================================================================
  const handleBuscarPlacaOCedula = async (e?: React.FormEvent, forcedQuery?: string) => {
    if (e) e.preventDefault();
    const q = (forcedQuery !== undefined ? forcedQuery : searchQuery).trim();
    if (!q) return;

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
        setFotosRecepcion(Array.isArray(data.vehicle?.photos) ? data.vehicle.photos.slice(0, 4) : []);

        if (data.activeOrder) {
          setOrdenActiva(data.activeOrder);
          setAutosEnPista((prev) => {
            const exists = prev.some((o) => o.id === data.activeOrder.id);
            return exists
              ? prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
              : [data.activeOrder, ...prev];
          });
          mostrarToast(`Orden activa ${data.activeOrder.orderNumber} cargada para ${data.vehicle?.plate || q}`);
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
        setRegPlaca(data.suggestedPlate || q.toUpperCase());
        setRegCedula(data.suggestedIdentification || "");
        setMostrarRegistroExpress(true);
        mostrarToast("Vehículo/Cliente no registrado. Completa el Registro Express en un paso.");
      }
    } catch (err) {
      mostrarToast("Error al consultar en Neon PostgreSQL", "err");
    } finally {
      setBuscandoVehiculo(false);
    }
  };

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
    if (!regPlaca.trim() || !regNombres.trim() || !regMarca.trim() || !regModelo.trim()) {
      mostrarToast("Placa, Nombres, Marca y Modelo son obligatorios", "err");
      return;
    }

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
          marca: regMarca,
          modelo: regModelo,
          anio: regAnio,
          color: regColor,
          kilometraje: regKilometraje,
          receptionPhotos: fotosRecepcion,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMostrarRegistroExpress(false);
        setVehiculoEncontrado(data.vehicle);
        setClienteEncontrado(data.customer);
        setKmActualInput(String(data.vehicle?.mileage || regKilometraje || ""));
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) => [data.activeOrder, ...prev]);
        mostrarToast(data.message || "Vehículo registrado y Orden abierta en pista");
      } else {
        mostrarToast(data.error || "Error al registrar vehículo", "err");
      }
    } catch (err) {
      mostrarToast("Error de conexión al guardar Registro Express", "err");
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

  const handleSubirFotoRecepcion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fotosRecepcion.length >= 4) {
      mostrarToast("Máximo 4 fotos de recepción permitidas", "err");
      return;
    }

    try {
      setSubiendoFotoRecepcion(true);
      const nuevosUrls: string[] = [];
      const limite = Math.min(files.length, 4 - fotosRecepcion.length);

      for (let i = 0; i < limite; i++) {
        const url = await subirArchivoACloudflareR2(files[i], "taller_recepcion");
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
      mostrarToast("Foto(s) de recepción almacenadas en Cloudflare R2");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir foto a R2", "err");
    } finally {
      setSubiendoFotoRecepcion(false);
      if (fileInputRecepcionRef.current) fileInputRecepcionRef.current.value = "";
    }
  };

  const handleSubirFotoEvidencia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !ordenActiva) return;

    try {
      setSubiendoEvidencia(true);
      const nuevosUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await subirArchivoACloudflareR2(files[i], "taller_evidencia");
        if (url) nuevosUrls.push(url);
      }

      const nuevasEvidencias = [...(ordenActiva.evidencePhotos || []), ...nuevosUrls];
      await sincronizarOrdenEnNeon({ evidencePhotos: nuevasEvidencias });
      mostrarToast("Evidencia fotográfica vinculada en Cloudflare R2");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir evidencia a R2", "err");
    } finally {
      setSubiendoEvidencia(false);
      if (fileInputEvidenciaRef.current) fileInputEvidenciaRef.current.value = "";
    }
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

  // Agregar o quitar un servicio rápido de las tarjetas
  const handleToggleServicioPreset = async (cardTitle: string, preset: ServicePreset) => {
    if (!ordenActiva) {
      mostrarToast("Primero selecciona un auto en pista o busca una placa arriba", "err");
      return;
    }

    const existe = ordenActiva.items.find(
      (i) => i.code === preset.code || i.name.toLowerCase() === preset.name.toLowerCase()
    );

    let nuevosItems: OrderItem[];
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
      };
      nuevosItems = [...ordenActiva.items, nuevo];
    }

    await sincronizarOrdenEnNeon({ items: nuevosItems });
  };

  // Agregar servicio personalizado desde la tarjeta "Otro"
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

    const precioNum = parseFloat(otroPrecioCustom) || 0;
    const nuevo: OrderItem = {
      id: `otro-${Date.now()}`,
      type: "SERVICE",
      category: "Otro",
      code: `OTR-${Math.floor(100 + Math.random() * 900)}`,
      name: otroNombreCustom.trim(),
      price: precioNum,
      qty: 1,
      status: "Pendiente",
    };

    const nuevosItems = [...ordenActiva.items, nuevo];
    setOtroNombreCustom("");
    setOtroPrecioCustom("");
    await sincronizarOrdenEnNeon({ items: nuevosItems });
    mostrarToast(`"${nuevo.name}" agregado a la orden ${ordenActiva.orderNumber}`);
  };

  // Agregar repuesto/insumo desde el inventario de Oficina (Tarjeta Repuestos)
  const handleAgregarRepuestoAOrden = async (prod: InventoryProduct) => {
    if (!ordenActiva) {
      mostrarToast("Selecciona primero un vehículo o auto en pista", "err");
      return;
    }

    if (prod.stock <= 0) {
      mostrarToast(`El repuesto "${prod.name}" está sin stock disponible`, "err");
      return;
    }

    const existente = ordenActiva.items.find((i) => i.productId === prod.id || i.code === prod.code);
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
      };
      nuevosItems = [...ordenActiva.items, nuevo];
    }

    await sincronizarOrdenEnNeon({ items: nuevosItems });
    mostrarToast(`${prod.name} agregado a la orden ${ordenActiva.orderNumber}`);
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

  // Enviar Orden Unificada a POS / Caja (Conecta con POS, Oficina, Gerencia y Clientes)
  const handleEnviarAPosCaja = async () => {
    if (!ordenActiva) return;
    if (ordenActiva.items.length === 0) {
      mostrarToast("Agrega al menos un servicio o repuesto a la orden antes de enviar a POS", "err");
      return;
    }

    try {
      setEnviandoAPos(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENVIAR_A_POS",
          orderId: ordenActiva.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        cargarOperacionInicial(false);

        if (data.posRequest && typeof window !== "undefined") {
          sessionStorage.setItem("pos_despacho_solicitud", JSON.stringify(data.posRequest));
        }

        setModalConfirmPos(data.posRequest || data.activeOrder);
        mostrarToast(`Orden ${ordenActiva.orderNumber} enviada a POS / Caja con éxito`);
      } else {
        mostrarToast(data.error || "No se pudo enviar la orden a POS", "err");
      }
    } catch (err) {
      mostrarToast("Error de red al transferir a POS", "err");
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

          {/* Indicador de Autos en Pista y Accesos a Etapas Flotantes 01 al 08 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMostrarFlotanteEtapa2(false);
                setMostrarFlotanteEtapa3(false);
                setMostrarFlotanteEtapa4(false);
                setMostrarFlotanteEtapa5(false);
                setMostrarFlotanteEtapa6(false);
                setMostrarFlotanteEtapa7(false);
                setMostrarFlotanteEtapa8(false);
                setMostrarFlotanteEtapa1(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-xs font-semibold text-blue-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/30 text-[10px] font-bold text-white">
                01
              </span>
              <span>Etapa 1: Cliente</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFlotanteEtapa1(false);
                setMostrarFlotanteEtapa3(false);
                setMostrarFlotanteEtapa4(false);
                setMostrarFlotanteEtapa5(false);
                setMostrarFlotanteEtapa6(false);
                setMostrarFlotanteEtapa7(false);
                setMostrarFlotanteEtapa8(false);
                setMostrarFlotanteEtapa2(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/30 text-[10px] font-bold text-white">
                02
              </span>
              <span>Etapa 2: Vehículo o equipo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFlotanteEtapa1(false);
                setMostrarFlotanteEtapa2(false);
                setMostrarFlotanteEtapa4(false);
                setMostrarFlotanteEtapa5(false);
                setMostrarFlotanteEtapa6(false);
                setMostrarFlotanteEtapa7(false);
                setMostrarFlotanteEtapa8(false);
                setMostrarFlotanteEtapa3(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold text-amber-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/30 text-[10px] font-bold text-white">
                03
              </span>
              <span>Etapa 3: Inspección</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFlotanteEtapa1(false);
                setMostrarFlotanteEtapa2(false);
                setMostrarFlotanteEtapa3(false);
                setMostrarFlotanteEtapa5(false);
                setMostrarFlotanteEtapa6(false);
                setMostrarFlotanteEtapa7(false);
                setMostrarFlotanteEtapa8(false);
                setMostrarFlotanteEtapa4(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-semibold text-purple-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/30 text-[10px] font-bold text-white">
                04
              </span>
              <span>Etapa 4: Presupuesto</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFlotanteEtapa1(false);
                setMostrarFlotanteEtapa2(false);
                setMostrarFlotanteEtapa3(false);
                setMostrarFlotanteEtapa4(false);
                setMostrarFlotanteEtapa6(false);
                setMostrarFlotanteEtapa7(false);
                setMostrarFlotanteEtapa8(false);
                setMostrarFlotanteEtapa5(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-semibold text-sky-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-sky-500/30 text-[10px] font-bold text-white">
                05
              </span>
              <span>Etapa 5: Reparación</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFlotanteEtapa1(false);
                setMostrarFlotanteEtapa2(false);
                setMostrarFlotanteEtapa3(false);
                setMostrarFlotanteEtapa4(false);
                setMostrarFlotanteEtapa5(false);
                setMostrarFlotanteEtapa7(false);
                setMostrarFlotanteEtapa8(false);
                setMostrarFlotanteEtapa6(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-xs font-semibold text-pink-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-pink-500/30 text-[10px] font-bold text-white">
                06
              </span>
              <span>Etapa 6: Estado y aviso</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFlotanteEtapa1(false);
                setMostrarFlotanteEtapa2(false);
                setMostrarFlotanteEtapa3(false);
                setMostrarFlotanteEtapa4(false);
                setMostrarFlotanteEtapa5(false);
                setMostrarFlotanteEtapa6(false);
                setMostrarFlotanteEtapa8(false);
                setMostrarFlotanteEtapa7(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-xs font-semibold text-teal-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-teal-500/30 text-[10px] font-bold text-white">
                07
              </span>
              <span>Etapa 7: Entrega y firma</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarFlotanteEtapa1(false);
                setMostrarFlotanteEtapa2(false);
                setMostrarFlotanteEtapa3(false);
                setMostrarFlotanteEtapa4(false);
                setMostrarFlotanteEtapa5(false);
                setMostrarFlotanteEtapa6(false);
                setMostrarFlotanteEtapa7(false);
                setMostrarFlotanteEtapa8(true);
              }}
              className="px-3.5 py-2 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-xs font-semibold text-indigo-300 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-[10px] font-bold text-white">
                08
              </span>
              <span>Etapa 8: Cobro y documento</span>
            </button>
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
            BLOQUE 1 (SUPERIOR): BUSCADOR POR PLACA/CÉDULA Y REGISTRO EXPRESS
            =================================================================== */}
        <section className="bg-[#111113] rounded-2xl border border-white/5 p-4 sm:p-5 shadow-xl relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)" }}
          />

          <form onSubmit={handleBuscarPlacaOCedula} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar vehículo por Placa (ej: ABC-123) o Cédula/RUC del cliente..."
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

            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                disabled={buscandoVehiculo}
                className="h-12 px-5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-sm font-semibold transition-all active:scale-95 cursor-pointer flex-1 sm:flex-initial"
              >
                {buscandoVehiculo ? "Buscando..." : "Buscar / Recepcionar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMostrarRegistroExpress((prev) => !prev);
                  if (!regPlaca && searchQuery) setRegPlaca(searchQuery.toUpperCase());
                }}
                className="h-12 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 text-sm font-semibold transition-all active:scale-95 cursor-pointer shrink-0"
              >
                + Registro Express
              </button>
            </div>
          </form>

          {/* SI EL VEHÍCULO YA EXISTE: BARRA COMPACTA DE RECEPCIÓN E INSPECCIÓN R2 */}
          {vehiculoEncontrado && !mostrarRegistroExpress && (
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 font-mono text-sm font-bold text-blue-300 tracking-wider">
                  {vehiculoEncontrado.plate}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {vehiculoEncontrado.brand} {vehiculoEncontrado.model}
                    </span>
                    {vehiculoEncontrado.year && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-zinc-300">
                        {vehiculoEncontrado.year}
                      </span>
                    )}
                    {vehiculoEncontrado.color && (
                      <span className="text-xs text-zinc-400">• {vehiculoEncontrado.color}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    <span>
                      Cliente: <strong className="text-zinc-200">{clienteEncontrado?.name || "Cliente General"}</strong>
                    </span>
                    {clienteEncontrado?.identification && (
                      <span>ID/RUC: {clienteEncontrado.identification}</span>
                    )}
                    {clienteEncontrado?.phone && (
                      <a
                        href={`https://wa.me/${clienteEncontrado.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline font-medium flex items-center gap-1"
                      >
                        <span>WhatsApp: {clienteEncontrado.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-3 h-10">
                  <span className="text-[11px] text-zinc-400 mr-2">Km actual:</span>
                  <input
                    type="number"
                    value={kmActualInput}
                    onChange={(e) => setKmActualInput(e.target.value)}
                    onBlur={() => {
                      if (ordenActiva && kmActualInput) {
                        const km = parseInt(kmActualInput, 10);
                        if (!isNaN(km)) {
                          sincronizarOrdenEnNeon({
                            mileage: km,
                            nextOilChangeKm: km + 5000,
                          });
                        }
                      }
                    }}
                    placeholder="Ej: 52000"
                    className="w-24 bg-transparent text-white text-xs font-semibold focus:outline-none"
                  />
                </div>

                <input
                  ref={fileInputRecepcionRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleSubirFotoRecepcion}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRecepcionRef.current?.click()}
                  disabled={subiendoFotoRecepcion || fotosRecepcion.length >= 4}
                  className="h-10 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>📷</span>
                  <span>
                    {subiendoFotoRecepcion
                      ? "Subiendo R2..."
                      : `Fotos R2 (${fotosRecepcion.length}/4)`}
                  </span>
                </button>

                {fotosRecepcion.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {fotosRecepcion.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-9 h-9 rounded-lg overflow-hidden border border-white/15 bg-black shrink-0 block"
                        title={`Foto recepción ${idx + 1}`}
                      >
                        <img src={url} alt={`Recepción ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMostrarModalHistorial(true)}
                  className="h-10 px-3.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Ver Historial ({historialVehiculo.length})
                </button>
              </div>
            </div>
          )}

          {/* SI NO EXISTE: FORMULARIO "REGISTRO EXPRESS" DE UN SOLO PASO CON 2 COLUMNAS */}
          {mostrarRegistroExpress && (
            <form
              onSubmit={handleGuardarRegistroExpress}
              className="mt-4 pt-4 border-t border-white/10 space-y-4 relative z-10 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white">
                    Registro Express (Cliente + Vehículo + Apertura de Orden)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Se sincroniza al instante en Neon DB para Clientes, Oficina, Gerencia y POS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarRegistroExpress(false)}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    1. Datos Personales del Cliente
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={regCedula}
                      onChange={(e) => setRegCedula(e.target.value)}
                      placeholder="Cédula / RUC *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                    />
                    <input
                      type="text"
                      required
                      value={regNombres}
                      onChange={(e) => setRegNombres(e.target.value)}
                      placeholder="Nombres Completos *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                    />
                    <input
                      type="text"
                      value={regTelefono}
                      onChange={(e) => setRegTelefono(e.target.value)}
                      placeholder="Teléfono / WhatsApp"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                    />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Email (Opcional)"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    2. Datos del Vehículo
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      required
                      value={regPlaca}
                      onChange={(e) => setRegPlaca(e.target.value.toUpperCase())}
                      placeholder="Placa (ABC-123) *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white font-mono text-xs font-bold uppercase focus:outline-none focus:border-emerald-500/60"
                    />
                    <select
                      value={regTipoVehiculo}
                      onChange={(e) => setRegTipoVehiculo(e.target.value as any)}
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    >
                      <option value="Auto">Auto</option>
                      <option value="SUV">SUV</option>
                      <option value="Camioneta">Camioneta</option>
                      <option value="Moto">Moto</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={regMarca}
                      onChange={(e) => setRegMarca(e.target.value)}
                      placeholder="Marca (Toyota) *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                    <input
                      type="text"
                      required
                      value={regModelo}
                      onChange={(e) => setRegModelo(e.target.value)}
                      placeholder="Modelo (Hilux) *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                    <input
                      type="number"
                      value={regAnio}
                      onChange={(e) => setRegAnio(e.target.value)}
                      placeholder="Año"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                    <input
                      type="text"
                      value={regColor}
                      onChange={(e) => setRegColor(e.target.value)}
                      placeholder="Color"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                    <input
                      type="number"
                      value={regKilometraje}
                      onChange={(e) => setRegKilometraje(e.target.value)}
                      placeholder="Kilometraje actual"
                      className="col-span-2 sm:col-span-3 h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMostrarRegistroExpress(false)}
                  className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoExpress}
                  className="h-10 px-5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                >
                  {guardandoExpress ? "Registrando en Neon..." : "Guardar y Abrir Orden de Trabajo"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ===================================================================
            CUERPO CENTRAL: BLOQUE 2 (7 TARJETAS) + BLOQUE 3 (ORDEN UNIFICADA)
            =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -----------------------------------------------------------------
              BLOQUE 2 (CENTRAL - 7 COLUMNAS EN DESKTOP):
              LAS 7 TARJETAS DE SERVICIO DIRECTO (AL MARCAR SALEN FLOTANTES)
              ----------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
              {SERVICE_CARDS.map((card) => {
                const isSelected = activeCardId === card.id;
                const countInOrder = conteoPorTarjeta[card.id] || 0;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleAbrirTarjetaFlotante(card.id)}
                    className={`group text-left bg-[#111113] hover:bg-[#161618] rounded-2xl p-5 sm:p-6 min-h-[96px] sm:min-h-[104px] border transition-all duration-300 ease-out hover:-translate-y-1 shadow-lg active:scale-[0.98] overflow-hidden relative flex flex-col justify-center cursor-pointer w-full ${
                      isSelected
                        ? "border-blue-500/60 ring-1 ring-blue-500/30"
                        : "border-white/5 hover:border-white/15"
                    }`}
                  >
                    {/* Resplandor radial suave en la esquina derecha de cada tarjeta */}
                    <div
                      className="absolute top-0 right-0 w-36 h-36 rounded-bl-full -mr-8 -mt-8 transition-all duration-500 ease-out group-hover:scale-125 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at top right, ${card.glowColor}, transparent 70%)`,
                      }}
                    />

                    <div className="flex items-center justify-between gap-3 min-w-0 relative z-10 w-full">
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                        {/* Ícono cuadrado redondeado con degradado vibrante exacto */}
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-md flex items-center justify-center flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3`}
                        >
                          {card.icon}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
                            {card.title}
                          </h3>
                          {countInOrder > 0 && (
                            <span className="inline-block mt-0.5 text-[11px] font-medium text-emerald-400">
                              {countInOrder} {countInOrder === 1 ? "ítem en orden" : "ítems en orden"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botón circular gris oscuro con el ícono chevron > a la derecha */}
                      <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* -----------------------------------------------------------------
              BLOQUE 3 (LATERAL DERECHO - 5 COLUMNAS EN DESKTOP):
              PANEL DE "ORDEN UNIFICADA (#OT)" EN CURSO
              ----------------------------------------------------------------- */}
          <div className="lg:col-span-5 bg-[#111113] rounded-2xl border border-white/5 p-5 shadow-2xl space-y-4 lg:sticky lg:top-6">
            {!ordenActiva ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-xl">
                  🔧
                </div>
                <h3 className="text-base font-semibold text-white">
                  Sin Orden Unificada Seleccionada
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Busca un vehículo por Placa o Cédula arriba, o selecciona uno de los{" "}
                  <strong>Autos en Pista</strong> abajo para gestionar su orden.
                </p>
              </div>
            ) : (
              <>
                {/* Encabezado de la Orden Unificada */}
                <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        #{ordenActiva.orderNumber}
                      </span>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/5 text-white border border-white/10">
                        {ordenActiva.plate}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          getEstiloColorEstado(ordenActiva.statusColor).bg
                        } ${getEstiloColorEstado(ordenActiva.statusColor).border} ${
                          getEstiloColorEstado(ordenActiva.statusColor).text
                        }`}
                      >
                        {ordenActiva.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white mt-2">
                      {ordenActiva.vehicle}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Cliente: <span className="text-zinc-200">{ordenActiva.client}</span>
                      {ordenActiva.mileage ? ` • ${ordenActiva.mileage.toLocaleString()} km` : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                        ⛽ Combustible: <strong className="text-white">{ordenActiva.fuelLevel || "1/2"}</strong>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                        🛡️ Estado: <strong className="text-white">{(ordenActiva.generalCondition || "Bueno").split("|")[0].trim()}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteEtapa2(true)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold cursor-pointer transition-colors"
                      >
                        02 Vehículo ({ordenActiva.receptionInventory?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteEtapa3(true)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold cursor-pointer transition-colors"
                      >
                        03 Inspección ({etapa3Hallazgos.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteEtapa4(true)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold cursor-pointer transition-colors"
                      >
                        04 Presupuesto ({ordenActiva.quoteStatus === "Aprobado por Cliente" ? "✓ Aprobado" : `$${ordenActiva.totalCost.toFixed(2)}`})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteEtapa5(true)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-semibold cursor-pointer transition-colors"
                      >
                        05 Reparación ({ordenActiva.progress || 0}%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteEtapa6(true)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 font-semibold cursor-pointer transition-colors"
                      >
                        06 Estado y aviso (PIN {ordenActiva.trackingPin || etapa6TrackingPin})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteEtapa7(true)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-semibold cursor-pointer transition-colors"
                      >
                        07 Entrega ({ordenActiva.deliverySignatureUrl || etapa7FirmaDataUrl ? "✓ Firmado" : "Pendiente"})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteEtapa8(true)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-semibold cursor-pointer transition-colors"
                      >
                        08 Cobro ({calculosCobroEtapa8.saldoPendiente <= 0 && calculosCobroEtapa8.totalOrden > 0 ? "✓ Pagado" : `Saldo $${calculosCobroEtapa8.saldoPendiente.toFixed(2)}`})
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerarPdfInspeccion}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold cursor-pointer transition-colors"
                      >
                        📄 PDF Inspección
                      </button>
                    </div>
                  </div>

                  {/* Cronómetro en Vivo */}
                  <div className="text-right shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-[#0a0a0a] border border-white/10 font-mono text-sm font-bold text-emerald-400">
                      ⏱ {formatElapsedTime(ordenActiva.startedAt, ordenActiva.completedAt, nowTick)}
                    </div>
                    {!ordenActiva.startedAt ? (
                      <button
                        type="button"
                        onClick={handleIniciarOrden}
                        disabled={iniciandoCronometro}
                        className="mt-1.5 w-full px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                      >
                        {iniciandoCronometro ? "Iniciando..." : "▶ Iniciar Orden"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-400 block mt-1">
                        Progreso: {ordenActiva.progress}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Selector de Técnico y Próximo Cambio de Aceite */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-2.5">
                    <label className="block text-[10px] text-zinc-400 uppercase">
                      Técnico Asignado
                    </label>
                    <select
                      value={ordenActiva.mechanic}
                      onChange={(e) => sincronizarOrdenEnNeon({ mechanic: e.target.value })}
                      className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none mt-0.5"
                    >
                      {mecanicos.map((m) => (
                        <option key={m} value={m} className="bg-[#111113] text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-2.5">
                    <label className="block text-[10px] text-zinc-400 uppercase">
                      Próx. Cambio Aceite (Km)
                    </label>
                    <input
                      type="number"
                      value={ordenActiva.nextOilChangeKm || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setOrdenActiva({
                          ...ordenActiva,
                          nextOilChangeKm: isNaN(val) ? null : val,
                        });
                      }}
                      onBlur={() =>
                        sincronizarOrdenEnNeon({ nextOilChangeKm: ordenActiva.nextOilChangeKm })
                      }
                      placeholder="Ej: 57000"
                      className="w-full bg-transparent text-xs font-semibold text-emerald-400 focus:outline-none mt-0.5"
                    />
                  </div>
                </div>

                {/* Barra de Progreso en Tiempo Real */}
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, ordenActiva.progress || 10))}%` }}
                  />
                </div>

                {/* Lista de Servicios y Repuestos de la Orden Unificada */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {ordenActiva.items.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                      <p className="text-xs text-zinc-400">
                        Toca cualquiera de las <strong>7 tarjetas</strong> a la izquierda para sumar servicios o repuestos a esta orden.
                      </p>
                    </div>
                  ) : (
                    ordenActiva.items.map((item) => {
                      const statusStyle =
                        item.status === "Listo"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : item.status === "En Proceso"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-zinc-800 text-zinc-300 border-white/10";

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-[#161618] border border-white/5 flex items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono">
                                {item.type === "PART" ? "REP" : "SRV"}
                              </span>
                              <p className="text-xs font-semibold text-white truncate">
                                {item.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-emerald-400">
                                ${((Number(item.price) || 0) * (item.qty || 1)).toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-lg px-1.5 py-0.5 border border-white/5">
                                <button
                                  type="button"
                                  onClick={() => handleCambiarCantidadItem(item.id, -1)}
                                  className="text-xs text-zinc-400 hover:text-white px-1 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="text-[11px] font-semibold text-white px-1">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCambiarCantidadItem(item.id, 1)}
                                  className="text-xs text-zinc-400 hover:text-white px-1 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCiclarEstadoItem(item.id)}
                              title="Clic para cambiar estado: Pendiente → En Proceso → Listo"
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer active:scale-95 ${statusStyle}`}
                            >
                              {item.status}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEliminarItemOrden(item.id)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 flex items-center justify-center text-xs cursor-pointer"
                              title="Quitar ítem"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Evidencia Fotográfica (Cloudflare R2) vinculada a la orden */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">
                      Evidencia Fotográfica R2 ({ordenActiva.evidencePhotos?.length || 0})
                    </span>
                    <input
                      ref={fileInputEvidenciaRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleSubirFotoEvidencia}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputEvidenciaRef.current?.click()}
                      disabled={subiendoEvidencia}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
                    >
                      {subiendoEvidencia ? "Subiendo a R2..." : "📎 Adjuntar Foto R2"}
                    </button>
                  </div>

                  {ordenActiva.evidencePhotos && ordenActiva.evidencePhotos.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {ordenActiva.evidencePhotos.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-12 h-12 rounded-xl overflow-hidden border border-white/15 bg-black shrink-0 block"
                        >
                          <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total Acumulado y Botón [ Enviar a POS / Caja ] */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-400">
                      Total Orden ({ordenActiva.items.reduce((a, b) => a + (b.qty || 1), 0)} ítems)
                    </span>
                    <span className="text-2xl font-bold text-emerald-400">
                      ${Number(ordenActiva.totalCost || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnviarAPosCaja}
                    disabled={enviandoAPos || ordenActiva.items.length === 0}
                    className="w-full h-12 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                  >
                    <span>
                      {enviandoAPos
                        ? "Sincronizando POS, Stock y Tiempos..."
                        : "Enviar a POS / Caja"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===================================================================
            FILA INFERIOR: "AUTOS EN PISTA" (TARJETAS HORIZONTALES COMPACTAS)
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
                return (
                  <button
                    key={auto.id}
                    type="button"
                    onClick={() => {
                      setOrdenActiva(auto);
                      setKmActualInput(auto.mileage ? String(auto.mileage) : "");
                      setFotosRecepcion(auto.receptionPhotos || []);
                    }}
                    className={`min-w-[260px] sm:min-w-[290px] text-left p-4 rounded-2xl transition-all cursor-pointer shrink-0 border ${
                      activo
                        ? "bg-[#161618] border-blue-500/60 ring-1 ring-blue-500/30"
                        : "bg-[#111113] hover:bg-[#161618] border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-300">
                        {auto.plate}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          auto.status === "LISTO_PARA_COBRO"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {auto.status}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-white truncate mt-2">
                      {auto.vehicle}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {auto.client} • {auto.orderNumber}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        {auto.items.length} {auto.items.length === 1 ? "servicio" : "servicios"}
                      </span>
                      <span className="font-bold text-emerald-400">
                        ${Number(auto.totalCost || 0).toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =====================================================================
          VENTANA FLOTANTE AL MARCAR CUALQUIERA DE LAS 7 TARJETAS
          (CON BUSCADOR Y FILTRO ARRIBA SOBRE EL FLOTANTE)
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
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[88vh] flex flex-col space-y-4"
          >
            {/* Cabecera del Flotante */}
            <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${tarjetaSeleccionadaObj.gradient} flex items-center justify-center shrink-0 shadow-md`}
                >
                  {tarjetaSeleccionadaObj.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                    {tarjetaSeleccionadaObj.title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    {ordenActiva
                      ? `Orden activa: #${ordenActiva.orderNumber} • Placa ${ordenActiva.plate}`
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
              {/* Buscador h-11 */}
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
                  className="w-full pl-10 pr-9 h-11 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-blue-500/60 text-white text-sm font-normal placeholder:text-zinc-500 focus:outline-none transition-all"
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
                      strokeWidth={2}
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
                            ? "bg-blue-500/20 text-blue-300"
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

            {/* SI ES LA TARJETA "OTRO": FORMULARIO RÁPIDO PARA AGREGAR SERVICIO / TRABAJO LIBRE */}
            {tarjetaSeleccionadaObj.id === "otro" && (
              <form
                onSubmit={handleAgregarServicioOtroCustom}
                className="p-3 rounded-xl bg-[#0a0a0a] border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <input
                  type="text"
                  value={otroNombreCustom}
                  onChange={(e) => setOtroNombreCustom(e.target.value)}
                  placeholder="Escribir otro servicio o trabajo personalizado..."
                  className="flex-1 h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/60"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={otroPrecioCustom}
                    onChange={(e) => setOtroPrecioCustom(e.target.value)}
                    placeholder="Precio $"
                    className="w-28 h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/60"
                  />
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    + Agregar
                  </button>
                </div>
              </form>
            )}

            {/* LISTADO MULTISELECCIÓN DENTRO DEL FLOTANTE */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-2.5">
              {tarjetaSeleccionadaObj.id !== "repuestos" ? (
                presetsFiltradosFlotante.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-10 text-center">
                    No se encontraron servicios con ese criterio en {tarjetaSeleccionadaObj.title}.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {presetsFiltradosFlotante.map((preset) => {
                      const seleccionado = ordenActiva?.items.some(
                        (i) =>
                          i.code === preset.code ||
                          i.name.toLowerCase() === preset.name.toLowerCase()
                      );

                      return (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() =>
                            handleToggleServicioPreset(tarjetaSeleccionadaObj.title, preset)
                          }
                          className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${
                            seleccionado
                              ? "bg-emerald-500/15 border-emerald-500/40 text-white"
                              : "bg-[#161618] hover:bg-zinc-800/80 border-white/5 text-zinc-200"
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
                          <span className="text-xs font-bold text-emerald-400 shrink-0">
                            ${preset.price.toFixed(2)}
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
                    const enOrden = ordenActiva?.items.find((i) => i.productId === prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleAgregarRepuestoAOrden(prod)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${
                          enOrden
                            ? "bg-pink-500/15 border-pink-500/40"
                            : "bg-[#161618] hover:bg-zinc-800/80 border-white/5"
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
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-base shrink-0">
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
                          <p className="text-xs font-bold text-emerald-400">
                            ${Number(prod.price).toFixed(2)}
                          </p>
                          {enOrden && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold">
                              {enOrden.qty} en OT
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pie del Flotante */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                {ordenActiva ? (
                  <span>
                    En orden: <strong className="text-white">{ordenActiva.items.length} ítems</strong> • Total:{" "}
                    <strong className="text-emerald-400">
                      ${Number(ordenActiva.totalCost || 0).toFixed(2)}
                    </strong>
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
                className="h-10 px-5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-all cursor-pointer active:scale-95"
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
                      <span className="text-emerald-400 font-bold">
                        ${Number(h.cost || 0).toFixed(2)}
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
          MODAL CONFIRMACIÓN DE ENVÍO A POS / CAJA
          ===================================================================== */}
      {modalConfirmPos && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-white">
              Orden Lista para Cobro en POS
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Los servicios y repuestos fueron transferidos a <strong>POS / Caja</strong>, el stock fue actualizado en <strong>Oficina</strong>, los tiempos en <strong>Gerencia</strong> y el expediente en <strong>Clientes</strong>.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmPos(null)}
                className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Seguir en Taller
              </button>
              <button
                type="button"
                onClick={() => router.push("/pos/venta")}
                className="flex-1 h-11 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer"
              >
                Ir a POS / Cobrar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FLOTANTE 01: ETAPA 1 - CLIENTE ("NUEVA ORDEN DE TRABAJO")
          Se abre primero al ingresar al Panel Taller.
          - Búsqueda por nombre, RUC/RUT, teléfono o correo
          - Cliente nuevo sin salir de la orden
          - Técnico asignado y motivo de ingreso
          ===================================================================== */}
      {mostrarFlotanteEtapa1 && (
        <div
          onClick={() => setMostrarFlotanteEtapa1(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <form
            onSubmit={handleCrearOrdenEtapa1}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-5"
          >
            {/* Cabecera del Flotante 01 */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-[11px] font-bold text-blue-300">
                    01
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Etapa 1: Cliente
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Nueva Orden de Trabajo
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa1(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Selector Tipo: Persona / Empresa */}
            <div className="flex items-center gap-5 text-sm">
              <span className="text-xs font-medium text-zinc-400">Tipo:</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-zinc-200">
                <input
                  type="radio"
                  name="tipoClienteEtapa1"
                  checked={etapa1TipoCliente === "Persona"}
                  onChange={() => setEtapa1TipoCliente("Persona")}
                  className="accent-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Persona</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-zinc-200">
                <input
                  type="radio"
                  name="tipoClienteEtapa1"
                  checked={etapa1TipoCliente === "Empresa"}
                  onChange={() => setEtapa1TipoCliente("Empresa")}
                  className="accent-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Empresa</span>
              </label>
            </div>

            {/* Bloque Cliente: Tarjeta Seleccionada / Buscador / Nuevo Cliente Inline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Cliente</label>
                {!modoFormularioClienteEtapa1 && (
                  <button
                    type="button"
                    onClick={() => handleIniciarNuevoClienteInline()}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
                  >
                    + Cliente nuevo sin salir de la orden
                  </button>
                )}
              </div>

              {/* ESTADO 1: CLIENTE SELECCIONADO (DISEÑO IDÉNTICO A LA CAPTURA) */}
              {clienteSeleccionadoEtapa1 && !modoFormularioClienteEtapa1 ? (
                <div className="p-3.5 rounded-xl bg-[#161618] border border-blue-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar circular con ícono de cliente */}
                    <div className="w-10 h-10 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {clienteSeleccionadoEtapa1.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-0.5">
                        <span>
                          # {clienteSeleccionadoEtapa1.identification || "Sin RUC/RUT"}
                        </span>
                        {clienteSeleccionadoEtapa1.phone &&
                          clienteSeleccionadoEtapa1.phone !== "S/N" && (
                            <span className="flex items-center gap-1">
                              <span>📞</span>
                              <span>{clienteSeleccionadoEtapa1.phone}</span>
                            </span>
                          )}
                        {clienteSeleccionadoEtapa1.email && (
                          <span className="truncate max-w-[180px]">
                            ✉️ {clienteSeleccionadoEtapa1.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones Lápiz (Editar) y X (Cambiar cliente) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleEditarClienteSeleccionadoEtapa1}
                      title="Editar datos del cliente"
                      className="w-8 h-8 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSeleccionadoEtapa1(null);
                        setBusquedaClienteEtapa1("");
                      }}
                      title="Quitar y buscar otro cliente"
                      className="w-8 h-8 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : modoFormularioClienteEtapa1 ? (
                /* ESTADO 2: REGISTRO / EDICIÓN DE CLIENTE NUEVO SIN SALIR DE LA ORDEN */
                <div className="p-4 rounded-xl bg-[#161618] border border-blue-500/30 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-400">
                      {clienteSeleccionadoEtapa1
                        ? "Editar Cliente en la Orden"
                        : "Registrar Cliente Nuevo (Sin salir de la orden)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModoFormularioClienteEtapa1(false)}
                      className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Volver a buscar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={etapa1Nombre}
                      onChange={(e) => setEtapa1Nombre(e.target.value)}
                      placeholder={
                        etapa1TipoCliente === "Empresa"
                          ? "Razón Social / Empresa *"
                          : "Nombre y Apellido *"
                      }
                      className="sm:col-span-2 h-10 px-3 rounded-lg bg-[#0a0a0a] border border-white/10 focus:border-blue-500 text-white text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      value={etapa1Ruc}
                      onChange={(e) => setEtapa1Ruc(e.target.value)}
                      placeholder="RUC / RUT / Cédula (ej: 12.345.678-5)"
                      className="h-10 px-3 rounded-lg bg-[#0a0a0a] border border-white/10 focus:border-blue-500 text-white text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      value={etapa1Telefono}
                      onChange={(e) => setEtapa1Telefono(e.target.value)}
                      placeholder="Teléfono / WhatsApp (ej: +56 900000412)"
                      className="h-10 px-3 rounded-lg bg-[#0a0a0a] border border-white/10 focus:border-blue-500 text-white text-xs focus:outline-none"
                    />
                    <input
                      type="email"
                      value={etapa1Email}
                      onChange={(e) => setEtapa1Email(e.target.value)}
                      placeholder="Correo electrónico"
                      className="h-10 px-3 rounded-lg bg-[#0a0a0a] border border-white/10 focus:border-blue-500 text-white text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      value={etapa1PlacaOpcional}
                      onChange={(e) => setEtapa1PlacaOpcional(e.target.value.toUpperCase())}
                      placeholder="Placa Vehículo (Opcional: ABC-123)"
                      className="h-10 px-3 rounded-lg bg-[#0a0a0a] border border-white/10 focus:border-blue-500 text-white font-mono text-xs uppercase focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConfirmarClienteInlineEtapa1}
                      disabled={guardandoClienteEtapa1}
                      className="h-9 px-4 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
                    >
                      {guardandoClienteEtapa1
                        ? "Guardando cliente..."
                        : "✓ Confirmar Cliente"}
                    </button>
                  </div>
                </div>
              ) : (
                /* ESTADO 3: BUSCADOR POR NOMBRE, RUC/RUT, TELÉFONO O CORREO */
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
                      🔍
                    </span>
                    <input
                      type="text"
                      value={busquedaClienteEtapa1}
                      onChange={(e) => setBusquedaClienteEtapa1(e.target.value)}
                      placeholder="Buscar por nombre, RUC/RUT, teléfono o correo (o escribe un nombre nuevo)..."
                      className="w-full pl-10 pr-9 h-11 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-blue-500 text-white text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none transition-all"
                    />
                    {busquedaClienteEtapa1 && (
                      <button
                        type="button"
                        onClick={() => setBusquedaClienteEtapa1("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Resultados de clientes o botón directo para registrar el nombre escrito */}
                  <div className="rounded-xl bg-[#0a0a0a] border border-white/5 max-h-44 overflow-y-auto divide-y divide-white/5">
                    {busquedaClienteEtapa1.trim() && (
                      <button
                        type="button"
                        onClick={() =>
                          handleIniciarNuevoClienteInline(busquedaClienteEtapa1.trim())
                        }
                        className="w-full text-left px-3.5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <span>
                          + Registrar &ldquo;{busquedaClienteEtapa1.trim()}&rdquo; como cliente nuevo
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
                          Nuevo
                        </span>
                      </button>
                    )}

                    {buscandoClientesRemoto && clientesFiltradosEtapa1.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-3 px-3.5">
                        Buscando clientes en Neon DB...
                      </p>
                    ) : clientesFiltradosEtapa1.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-3 px-3.5">
                        No se encontró coincidencia. Toca arriba para registrarlo como cliente nuevo o presiona &ldquo;Crear orden&rdquo; directamente.
                      </p>
                    ) : (
                      clientesFiltradosEtapa1.map((cli) => (
                        <button
                          key={cli.id}
                          type="button"
                          onClick={() => {
                            setClienteSeleccionadoEtapa1(cli);
                            setBusquedaClienteEtapa1("");
                            if (cli.type === "Empresa") setEtapa1TipoCliente("Empresa");
                            else setEtapa1TipoCliente("Persona");
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-white truncate">
                              {cli.name}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              # {cli.identification}
                              {cli.phone && cli.phone !== "S/N" ? ` • 📞 ${cli.phone}` : ""}
                              {cli.email ? ` • ✉️ ${cli.email}` : ""}
                            </p>
                          </div>
                          {cli.vehicles && cli.vehicles.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 shrink-0">
                              {cli.vehicles[0].plate}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Fila 2 Columnas: Ingresado por & Técnico asignado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Ingresado por
                </label>
                <input
                  type="text"
                  value={etapa1IngresadoPor}
                  onChange={(e) => setEtapa1IngresadoPor(e.target.value)}
                  placeholder="Nombre de quien recepciona"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-blue-500 text-zinc-200 text-xs sm:text-sm focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Técnico asignado
                </label>
                <select
                  value={etapa1Tecnico}
                  onChange={(e) => setEtapa1Tecnico(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-blue-500 text-white text-xs sm:text-sm font-medium focus:outline-none transition-all cursor-pointer"
                >
                  {mecanicos.map((mec) => (
                    <option key={mec} value={mec} className="bg-[#111113] text-white">
                      {mec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Motivo de ingreso */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Motivo de ingreso
              </label>
              <textarea
                rows={3}
                value={etapa1MotivoIngreso}
                onChange={(e) => setEtapa1MotivoIngreso(e.target.value)}
                placeholder="Ej: Mantención 40.000 km. Luz de check engine encendida."
                className="w-full p-3.5 rounded-xl bg-[#0a0a0a] border border-blue-500/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none transition-all resize-none"
              />
            </div>

            {/* Pie del Flotante: Cancelar / Crear orden */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa1(false)}
                className="h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creandoOrdenEtapa1}
                className="h-11 px-6 rounded-xl bg-blue-600/25 hover:bg-blue-600/35 border border-blue-500/50 text-blue-200 hover:text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {creandoOrdenEtapa1 ? "Creando orden..." : "Crear orden → Etapa 2"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          FLOTANTE 02: ETAPA 2 - VEHÍCULO O EQUIPO ("RECIBE EL VEHÍCULO O EQUIPO")
          Asocias el vehículo o equipo del cliente y registras cómo llega:
          - Kilometraje y nivel de combustible
          - Estado general (condición + testigos + observaciones + fotos R2)
          - Inventario de lo que trae
          ===================================================================== */}
      {mostrarFlotanteEtapa2 && (
        <div
          onClick={() => setMostrarFlotanteEtapa2(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <form
            onSubmit={handleGuardarEtapa2Vehiculo}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-5"
          >
            {/* Cabecera del Flotante 02 */}
            <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa2(false);
                      setMostrarFlotanteEtapa1(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    01 Cliente ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                    02
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Etapa 2: Vehículo o equipo
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Recibe el vehículo o equipo
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Asocias el vehículo o equipo del cliente y registras cómo llega: kilometraje, nivel de combustible, estado general y el inventario de lo que trae.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa2(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 1. ASOCIAR O REGISTRAR VEHÍCULO / EQUIPO DEL CLIENTE */}
            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  1. Asociar Vehículo o Equipo del Cliente
                </span>
                <span className="text-xs text-zinc-400">
                  Cliente:{" "}
                  <strong className="text-white">
                    {clienteEncontrado?.name ||
                      clienteSeleccionadoEtapa1?.name ||
                      ordenActiva?.client ||
                      "Cliente Taller"}
                  </strong>
                </span>
              </div>

              {/* Si el cliente ya tiene vehículos registrados, permitir seleccionarlos con 1 clic */}
              {((clienteEncontrado?.vehicles && clienteEncontrado.vehicles.length > 0) ||
                (clienteSeleccionadoEtapa1?.vehicles &&
                  clienteSeleccionadoEtapa1.vehicles.length > 0)) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-zinc-400">Vehículos del cliente:</span>
                  {(
                    clienteEncontrado?.vehicles ||
                    clienteSeleccionadoEtapa1?.vehicles ||
                    []
                  ).map((v: any) => {
                    const activo = etapa2Placa === v.plate;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => cargarVehiculoEnFormularioEtapa2(v)}
                        className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          activo
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                            : "bg-[#111113] hover:bg-[#161618] border-white/10 text-zinc-300"
                        }`}
                      >
                        <span className="font-mono font-bold">{v.plate}</span> • {v.brand}{" "}
                        {v.model}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => cargarVehiculoEnFormularioEtapa2(null)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-blue-300 font-semibold cursor-pointer"
                  >
                    + Nuevo vehículo / equipo
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">Tipo</label>
                  <select
                    value={etapa2TipoVehiculo}
                    onChange={(e) => setEtapa2TipoVehiculo(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Auto">Auto</option>
                    <option value="SUV">SUV</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Moto">Moto</option>
                    <option value="Camión / Maquinaria">Camión / Maquinaria</option>
                    <option value="Equipo">Equipo / Motor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">
                    Placa / N° Serie *
                  </label>
                  <input
                    type="text"
                    required
                    value={etapa2Placa}
                    onChange={(e) => setEtapa2Placa(e.target.value.toUpperCase())}
                    placeholder="Ej: ABC-123"
                    className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white font-mono text-xs font-bold uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">Marca</label>
                  <input
                    type="text"
                    value={etapa2Marca}
                    onChange={(e) => setEtapa2Marca(e.target.value)}
                    placeholder="Ej: Toyota"
                    className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">Modelo</label>
                  <input
                    type="text"
                    value={etapa2Modelo}
                    onChange={(e) => setEtapa2Modelo(e.target.value)}
                    placeholder="Ej: Hilux"
                    className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">Año</label>
                  <input
                    type="number"
                    value={etapa2Anio}
                    onChange={(e) => setEtapa2Anio(e.target.value)}
                    placeholder="2024"
                    className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">Color</label>
                  <input
                    type="text"
                    value={etapa2Color}
                    onChange={(e) => setEtapa2Color(e.target.value)}
                    placeholder="Ej: Plata"
                    className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. KILOMETRAJE Y NIVEL DE COMBUSTIBLE */}
            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  2. Kilometraje y Combustible
                </span>
                {etapa2Kilometraje && !isNaN(parseInt(etapa2Kilometraje, 10)) && (
                  <span className="text-[11px] text-emerald-400 font-medium">
                    Próx. cambio aceite:{" "}
                    {(parseInt(etapa2Kilometraje, 10) + 5000).toLocaleString()} km
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">
                    Kilometraje / Horómetro de llegada
                  </label>
                  <input
                    type="number"
                    value={etapa2Kilometraje}
                    onChange={(e) => setEtapa2Kilometraje(e.target.value)}
                    placeholder="Ej: 40000"
                    className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">
                    Tipo de Combustible / Energía
                  </label>
                  <select
                    value={etapa2TipoCombustible}
                    onChange={(e) => setEtapa2TipoCombustible(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diésel">Diésel</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Eléctrico">Eléctrico</option>
                    <option value="GLP / GNV">GLP / GNV</option>
                  </select>
                </div>
              </div>

              {/* Selector Visual de Nivel de Combustible */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Nivel de Combustible al ingreso:</span>
                  <strong className="text-white">⛽ {etapa2NivelCombustible}</strong>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {NIVELES_COMBUSTIBLE.map((niv) => {
                    const activo = etapa2NivelCombustible === niv.id;
                    return (
                      <button
                        key={niv.id}
                        type="button"
                        onClick={() => setEtapa2NivelCombustible(niv.id)}
                        className={`h-9 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          activo
                            ? "bg-blue-500/20 border-blue-500 text-blue-200 shadow-sm"
                            : "bg-[#111113] hover:bg-[#161618] border-white/10 text-zinc-400"
                        }`}
                      >
                        {niv.label}
                      </button>
                    );
                  })}
                </div>

                {/* Barra de nivel visual */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      NIVELES_COMBUSTIBLE.find((n) => n.id === etapa2NivelCombustible)
                        ?.color || "bg-blue-500"
                    }`}
                    style={{
                      width: `${
                        NIVELES_COMBUSTIBLE.find((n) => n.id === etapa2NivelCombustible)
                          ?.pct || 50
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3. ESTADO GENERAL */}
            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  3. Estado General de Llegada
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRecepcionRef.current?.click()}
                  disabled={subiendoFotoRecepcion || fotosRecepcion.length >= 4}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-zinc-200 cursor-pointer"
                >
                  {subiendoFotoRecepcion
                    ? "Subiendo R2..."
                    : `📷 Fotos Recepción R2 (${fotosRecepcion.length}/4)`}
                </button>
              </div>

              {/* Condición Exterior / General */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ESTADOS_GENERALES.map((est) => {
                  const activo = etapa2EstadoGeneral === est.id;
                  return (
                    <button
                      key={est.id}
                      type="button"
                      onClick={() => setEtapa2EstadoGeneral(est.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        activo
                          ? "bg-amber-500/15 border-amber-500/50 text-white"
                          : "bg-[#111113] hover:bg-[#161618] border-white/5 text-zinc-300"
                      }`}
                    >
                      <p className="text-xs font-semibold">{est.label}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{est.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Testigos encendidos en tablero */}
              <div className="space-y-1.5">
                <span className="block text-[11px] text-zinc-400">
                  Testigos encendidos en tablero (marca si aplica):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TESTIGOS_TABLERO.map((testigo) => {
                    const marcado = etapa2Testigos.includes(testigo);
                    return (
                      <button
                        key={testigo}
                        type="button"
                        onClick={() => handleToggleTestigoEtapa2(testigo)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                          marcado
                            ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                            : "bg-[#111113] hover:bg-white/5 border-white/10 text-zinc-400"
                        }`}
                      >
                        {marcado ? `⚠️ ${testigo}` : testigo}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observaciones del estado general */}
              <input
                type="text"
                value={etapa2ObservacionesEstado}
                onChange={(e) => setEtapa2ObservacionesEstado(e.target.value)}
                placeholder="Observaciones de carrocería o estado general (rayones, golpes, ruidos al llegar)..."
                className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* 4. INVENTARIO DE LO QUE TRAE */}
            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  4. Inventario de lo que trae ({etapa2InventarioTrae.length} marcados)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEtapa2InventarioTrae([...INVENTARIO_RECEPCION_ITEMS])}
                    className="text-[11px] text-purple-300 hover:underline cursor-pointer"
                  >
                    Marcar todos
                  </button>
                  <span className="text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={() => setEtapa2InventarioTrae([])}
                    className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {INVENTARIO_RECEPCION_ITEMS.map((item) => {
                  const marcado = etapa2InventarioTrae.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleToggleInventarioEtapa2(item)}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        marcado
                          ? "bg-purple-500/15 border-purple-500/40 text-white"
                          : "bg-[#111113] hover:bg-[#161618] border-white/5 text-zinc-400"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border shrink-0 ${
                          marcado
                            ? "bg-purple-500 border-purple-400 text-black font-bold"
                            : "border-zinc-600 bg-black/40 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="text-xs font-medium truncate">{item}</span>
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={etapa2ObjetosValor}
                onChange={(e) => setEtapa2ObjetosValor(e.target.value)}
                placeholder="Objetos personales o pertenencias adicionales que deja el cliente..."
                className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Pie del Flotante 02 */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMostrarFlotanteEtapa2(false);
                  setMostrarFlotanteEtapa1(true);
                }}
                className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                ← Volver a Etapa 1
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFlotanteEtapa2(false);
                    setMostrarFlotanteEtapa3(true);
                  }}
                  className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Ir a Etapa 3 →
                </button>
                <button
                  type="submit"
                  disabled={guardandoEtapa2}
                  className="h-11 px-6 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {guardandoEtapa2
                    ? "Guardando recepción..."
                    : "Guardar y Pasar a Etapa 3: Inspección →"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          FLOTANTE 03 — ETAPA 3: INSPECCIÓN (5 VISTAS, EVIDENCIA Y PDF)
          ===================================================================== */}
      {mostrarFlotanteEtapa3 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setMostrarFlotanteEtapa3(false)}
        >
          <form
            onSubmit={handleGuardarEtapa3Inspeccion}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl p-5 sm:p-6 shadow-2xl relative max-h-[93vh] overflow-y-auto space-y-5"
          >
            {/* Cabecera del Flotante 03 */}
            <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa3(false);
                      setMostrarFlotanteEtapa1(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    01 Cliente ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa3(false);
                      setMostrarFlotanteEtapa2(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    02 Vehículo ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[11px] font-bold text-amber-300">
                    03
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Etapa 3: Inspección
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Registra la inspección y marca cada hallazgo
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                  Desde el celular tocas el esquema del vehículo en la vista frontal, trasera, laterales o superior y anotas lo que encuentras. Sumas fotos como evidencia y generas el PDF de la inspección.
                </p>

                {/* 3 Píldoras clave de Etapa 3 */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                    ✓ Cinco vistas del vehículo
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
                    ✓ Fotos como evidencia
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium">
                    ✓ PDF de inspección
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa3(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* BARRA RESUMEN DEL VEHÍCULO Y BOTÓN RÁPIDO DE PDF */}
            <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 font-mono font-bold text-amber-300">
                  {ordenActiva?.plate || vehiculoEncontrado?.plate || etapa2Placa || "SIN PLACA"}
                </span>
                <span className="font-semibold text-white">
                  {ordenActiva?.vehicle ||
                    (vehiculoEncontrado
                      ? `${vehiculoEncontrado.brand} ${vehiculoEncontrado.model}`
                      : `${etapa2Marca} ${etapa2Modelo}`.trim() || "Vehículo en recepción")}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">
                  Cliente:{" "}
                  <strong className="text-zinc-200">
                    {ordenActiva?.client ||
                      clienteSeleccionadoEtapa1?.name ||
                      etapa1Nombre ||
                      "Cliente"}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleGenerarPdfInspeccion}
                className="h-9 px-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <span>📄</span>
                <span>Generar PDF de Inspección</span>
              </button>
            </div>

            {/* ===============================================================
                SECCIÓN 1: CINCO VISTAS DEL VEHÍCULO + ESQUEMA INTERACTIVO TÁCTIL
                =============================================================== */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  1. Cinco Vistas del Vehículo (Toca el esquema o una zona para marcar hallazgos)
                </span>
                <span className="text-[11px] text-zinc-400">
                  Total marcados:{" "}
                  <strong className="text-amber-300">{etapa3Hallazgos.length}</strong>
                </span>
              </div>

              {/* Selector de las 5 Vistas */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {VISTAS_INSPECCION.map((v) => {
                  const activa = etapa3VistaActiva === v.id;
                  const countVista = etapa3Hallazgos.filter((h) => h.vista === v.id).length;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setEtapa3VistaActiva(v.id);
                        setEtapa3ZonaActual("");
                      }}
                      className={`h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        activa
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md"
                          : "bg-[#0a0a0a] hover:bg-[#161618] border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{v.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          countVista > 0
                            ? "bg-amber-500 text-black"
                            : "bg-white/5 text-zinc-500"
                        }`}
                      >
                        {countVista}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Contenedor Principal: Esquema Táctil (Izquierda) + Editor de Hallazgo (Derecha) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* ESQUEMA INTERACTIVO DEL VEHÍCULO (7 COLUMNAS) */}
                <div className="lg:col-span-7 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">
                      Esquema: {vistaActivaConfig.label}
                    </span>
                    <span className="text-[11px] text-amber-300/90">
                      👆 Toca cualquier punto del vehículo para marcar
                    </span>
                  </div>

                  {/* Lienzo interactivo con SVG de las 5 vistas */}
                  <div
                    onClick={handleTocarEsquemaVehiculo}
                    className="relative w-full h-64 sm:h-72 rounded-xl bg-gradient-to-b from-[#111115] to-[#08080a] border border-white/10 overflow-hidden cursor-crosshair select-none touch-manipulation flex items-center justify-center"
                  >
                    {/* Cuadrícula técnica sutil de fondo */}
                    <div
                      className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)",
                        backgroundSize: "18px 18px",
                      }}
                    />

                    {/* Dibujo técnico SVG según la vista activa */}
                    {etapa3VistaActiva === "frontal" && (
                      <svg
                        viewBox="0 0 300 220"
                        className="w-full h-full max-w-[340px] pointer-events-none stroke-zinc-400"
                        fill="none"
                      >
                        {/* Silueta Frontal del Vehículo */}
                        <path
                          d="M65 160 L50 115 L78 55 L222 55 L250 115 L235 160 Z"
                          strokeWidth="2.5"
                          className="fill-zinc-900/70"
                        />
                        {/* Parabrisas delantero */}
                        <polygon
                          points="86,62 214,62 232,108 68,108"
                          strokeWidth="2"
                          className="fill-sky-500/10 stroke-sky-400/50"
                        />
                        {/* Capó */}
                        <path d="M68 108 L232 108 L242 135 L58 135 Z" strokeWidth="1.8" />
                        {/* Parrilla y Faros */}
                        <rect x="62" y="136" width="36" height="16" rx="4" strokeWidth="2" className="fill-amber-400/20 stroke-amber-300" />
                        <rect x="202" y="136" width="36" height="16" rx="4" strokeWidth="2" className="fill-amber-400/20 stroke-amber-300" />
                        <rect x="106" y="138" width="88" height="14" rx="3" strokeWidth="1.8" className="fill-zinc-800" />
                        {/* Parachoques delantero */}
                        <rect x="48" y="154" width="204" height="22" rx="8" strokeWidth="2.2" className="fill-zinc-800/90" />
                        {/* Espejos laterales */}
                        <rect x="38" y="92" width="18" height="12" rx="4" strokeWidth="1.8" />
                        <rect x="244" y="92" width="18" height="12" rx="4" strokeWidth="1.8" />
                        {/* Llantas delanteras */}
                        <rect x="52" y="172" width="32" height="26" rx="5" strokeWidth="2" className="fill-zinc-950" />
                        <rect x="216" y="172" width="32" height="26" rx="5" strokeWidth="2" className="fill-zinc-950" />
                        <text x="150" y="25" textAnchor="middle" className="fill-zinc-500 text-[10px] font-mono">
                          VISTA FRONTAL
                        </text>
                      </svg>
                    )}

                    {etapa3VistaActiva === "trasera" && (
                      <svg
                        viewBox="0 0 300 220"
                        className="w-full h-full max-w-[340px] pointer-events-none stroke-zinc-400"
                        fill="none"
                      >
                        {/* Silueta Trasera */}
                        <path
                          d="M65 160 L54 112 L82 56 L218 56 L246 112 L235 160 Z"
                          strokeWidth="2.5"
                          className="fill-zinc-900/70"
                        />
                        {/* Parabrisas trasero */}
                        <polygon
                          points="90,64 210,64 226,105 74,105"
                          strokeWidth="2"
                          className="fill-sky-500/10 stroke-sky-400/50"
                        />
                        {/* Compuerta / Maletero */}
                        <rect x="70" y="108" width="160" height="44" rx="4" strokeWidth="1.8" />
                        {/* Faros traseros (Stops) */}
                        <rect x="58" y="118" width="32" height="20" rx="4" strokeWidth="2" className="fill-rose-500/30 stroke-rose-400" />
                        <rect x="210" y="118" width="32" height="20" rx="4" strokeWidth="2" className="fill-rose-500/30 stroke-rose-400" />
                        {/* Placa */}
                        <rect x="122" y="126" width="56" height="16" rx="3" strokeWidth="1.5" className="fill-amber-400/20 stroke-amber-300" />
                        {/* Parachoques trasero */}
                        <rect x="48" y="154" width="204" height="22" rx="8" strokeWidth="2.2" className="fill-zinc-800/90" />
                        {/* Llantas traseras */}
                        <rect x="52" y="172" width="32" height="26" rx="5" strokeWidth="2" className="fill-zinc-950" />
                        <rect x="216" y="172" width="32" height="26" rx="5" strokeWidth="2" className="fill-zinc-950" />
                        <text x="150" y="25" textAnchor="middle" className="fill-zinc-500 text-[10px] font-mono">
                          VISTA TRASERA
                        </text>
                      </svg>
                    )}

                    {etapa3VistaActiva === "lateral_izq" && (
                      <svg
                        viewBox="0 0 360 200"
                        className="w-full h-full max-w-[420px] pointer-events-none stroke-zinc-400"
                        fill="none"
                      >
                        {/* Carrocería Lateral Izquierda */}
                        <path
                          d="M28 135 L35 102 L95 92 L135 55 L255 55 L295 92 L332 102 L336 138 L28 138 Z"
                          strokeWidth="2.4"
                          className="fill-zinc-900/75"
                        />
                        {/* Ventanas */}
                        <polygon points="105,90 140,62 192,62 192,90" strokeWidth="1.8" className="fill-sky-500/15 stroke-sky-400/50" />
                        <polygon points="198,62 250,62 282,90 198,90" strokeWidth="1.8" className="fill-sky-500/15 stroke-sky-400/50" />
                        {/* División de Puertas */}
                        <line x1="115" y1="90" x2="115" y2="136" strokeWidth="1.8" />
                        <line x1="195" y1="58" x2="195" y2="136" strokeWidth="1.8" />
                        <line x1="270" y1="90" x2="270" y2="136" strokeWidth="1.8" />
                        {/* Manijas */}
                        <rect x="168" y="102" width="16" height="4" rx="2" strokeWidth="1.5" />
                        <rect x="242" y="102" width="16" height="4" rx="2" strokeWidth="1.5" />
                        {/* Ruedas */}
                        <circle cx="88" cy="142" r="26" strokeWidth="3" className="fill-zinc-950 stroke-zinc-300" />
                        <circle cx="88" cy="142" r="12" strokeWidth="1.5" />
                        <circle cx="276" cy="142" r="26" strokeWidth="3" className="fill-zinc-950 stroke-zinc-300" />
                        <circle cx="276" cy="142" r="12" strokeWidth="1.5" />
                        <text x="180" y="24" textAnchor="middle" className="fill-zinc-500 text-[10px] font-mono">
                          LATERAL IZQUIERDO (CONDUCTOR)
                        </text>
                      </svg>
                    )}

                    {etapa3VistaActiva === "lateral_der" && (
                      <svg
                        viewBox="0 0 360 200"
                        className="w-full h-full max-w-[420px] pointer-events-none stroke-zinc-400"
                        fill="none"
                      >
                        {/* Carrocería Lateral Derecha */}
                        <path
                          d="M332 135 L325 102 L265 92 L225 55 L105 55 L65 92 L28 102 L24 138 L332 138 Z"
                          strokeWidth="2.4"
                          className="fill-zinc-900/75"
                        />
                        {/* Ventanas */}
                        <polygon points="255,90 220,62 168,62 168,90" strokeWidth="1.8" className="fill-sky-500/15 stroke-sky-400/50" />
                        <polygon points="162,62 110,62 78,90 162,90" strokeWidth="1.8" className="fill-sky-500/15 stroke-sky-400/50" />
                        {/* División de Puertas */}
                        <line x1="245" y1="90" x2="245" y2="136" strokeWidth="1.8" />
                        <line x1="165" y1="58" x2="165" y2="136" strokeWidth="1.8" />
                        <line x1="90" y1="90" x2="90" y2="136" strokeWidth="1.8" />
                        {/* Manijas */}
                        <rect x="176" y="102" width="16" height="4" rx="2" strokeWidth="1.5" />
                        <rect x="102" y="102" width="16" height="4" rx="2" strokeWidth="1.5" />
                        {/* Ruedas */}
                        <circle cx="84" cy="142" r="26" strokeWidth="3" className="fill-zinc-950 stroke-zinc-300" />
                        <circle cx="84" cy="142" r="12" strokeWidth="1.5" />
                        <circle cx="272" cy="142" r="26" strokeWidth="3" className="fill-zinc-950 stroke-zinc-300" />
                        <circle cx="272" cy="142" r="12" strokeWidth="1.5" />
                        <text x="180" y="24" textAnchor="middle" className="fill-zinc-500 text-[10px] font-mono">
                          LATERAL DERECHO (COPILOTO)
                        </text>
                      </svg>
                    )}

                    {etapa3VistaActiva === "superior" && (
                      <svg
                        viewBox="0 0 260 240"
                        className="w-full h-full max-w-[280px] pointer-events-none stroke-zinc-400"
                        fill="none"
                      >
                        {/* Contorno Superior del Vehículo */}
                        <rect x="65" y="18" width="130" height="204" rx="34" strokeWidth="2.5" className="fill-zinc-900/75" />
                        {/* Capó superior */}
                        <path d="M72 68 L188 68" strokeWidth="1.8" />
                        {/* Parabrisas delantero */}
                        <polygon points="75,68 185,68 175,98 85,98" strokeWidth="1.8" className="fill-sky-500/15 stroke-sky-400/50" />
                        {/* Techo central */}
                        <rect x="85" y="98" width="90" height="64" rx="6" strokeWidth="2" className="fill-zinc-800/70" />
                        {/* Luneta trasera */}
                        <polygon points="85,162 175,162 184,188 76,188" strokeWidth="1.8" className="fill-sky-500/15 stroke-sky-400/50" />
                        {/* Espejos */}
                        <rect x="48" y="82" width="16" height="10" rx="4" strokeWidth="1.6" />
                        <rect x="196" y="82" width="16" height="10" rx="4" strokeWidth="1.6" />
                        <text x="130" y="12" textAnchor="middle" className="fill-zinc-500 text-[9px] font-mono">
                          FRENTE ↑ • VISTA SUPERIOR
                        </text>
                      </svg>
                    )}

                    {/* Puntos guía sutiles de las zonas predefinidas */}
                    {vistaActivaConfig.zonas.map((z) => (
                      <button
                        key={z.nombre}
                        type="button"
                        title={`Marcar en: ${z.nombre}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleAgregarHallazgoEnPunto(z.x, z.y, z.nombre);
                        }}
                        style={{ left: `${z.x}%`, top: `${z.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 hover:bg-amber-400/40 border border-white/25 hover:border-amber-300 flex items-center justify-center text-[9px] text-white/70 hover:scale-125 transition-all cursor-pointer"
                      >
                        +
                      </button>
                    ))}

                    {/* Pines numerados de Hallazgos registrados en esta vista */}
                    {etapa3Hallazgos
                      .map((h, globalIdx) => ({ h, globalIdx }))
                      .filter(({ h }) => h.vista === etapa3VistaActiva)
                      .map(({ h, globalIdx }) => {
                        const seleccionado = etapa3HallazgoSeleccionadoId === h.id;
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setEtapa3HallazgoSeleccionadoId(h.id);
                              setEtapa3TipoHallazgoActual(h.tipo);
                              setEtapa3ZonaActual(h.zona);
                              setEtapa3DescripcionActual(h.descripcion);
                            }}
                            style={{ left: `${h.x}%`, top: `${h.y}%` }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full font-mono text-xs font-bold flex items-center justify-center shadow-lg transition-all cursor-pointer z-20 ${
                              seleccionado
                                ? "bg-amber-400 text-black ring-4 ring-amber-400/40 scale-125"
                                : "bg-rose-500 text-white border-2 border-white hover:scale-110"
                            }`}
                            title={`#${globalIdx + 1} ${h.zona}: ${h.tipo}`}
                          >
                            {globalIdx + 1}
                          </button>
                        );
                      })}
                  </div>

                  {/* Botones rápidos de Zonas de la Vista Activa (Ideal para tocar rápido en celular) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-zinc-400 block">
                      Toque rápido por pieza ({vistaActivaConfig.label}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {vistaActivaConfig.zonas.map((z) => (
                        <button
                          key={z.nombre}
                          type="button"
                          onClick={() => handleAgregarHallazgoEnPunto(z.x, z.y, z.nombre)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#111113] hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-[11px] text-zinc-300 hover:text-amber-200 transition-all cursor-pointer active:scale-95"
                        >
                          + {z.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PANEL DERECHO: DETALLE DEL HALLAZGO Y LISTA DE MARCADOS (5 COLUMNAS) */}
                <div className="lg:col-span-5 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        Detalle del Hallazgo
                      </span>
                      {etapa3HallazgoSeleccionadoId && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono">
                          Editando punto seleccionado
                        </span>
                      )}
                    </div>

                    {/* Selector de Tipo de Hallazgo */}
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                        Tipo de daño / hallazgo
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {TIPOS_HALLAZGO.map((t) => {
                          const activo = etapa3TipoHallazgoActual === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setEtapa3TipoHallazgoActual(t.id);
                                if (etapa3HallazgoSeleccionadoId) {
                                  handleActualizarHallazgoSeleccionado(
                                    etapa3HallazgoSeleccionadoId,
                                    { tipo: t.id }
                                  );
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                                activo
                                  ? t.color
                                  : "bg-[#111113] border-white/5 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {t.id}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Zona y Anotación de lo encontrado */}
                    <div className="grid grid-cols-1 gap-2.5">
                      <div>
                        <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                          Pieza / Zona del esquema
                        </label>
                        <input
                          type="text"
                          value={etapa3ZonaActual}
                          onChange={(e) => {
                            setEtapa3ZonaActual(e.target.value);
                            if (etapa3HallazgoSeleccionadoId) {
                              handleActualizarHallazgoSeleccionado(
                                etapa3HallazgoSeleccionadoId,
                                { zona: e.target.value }
                              );
                            }
                          }}
                          placeholder="Ej: Puerta delantera izq., Parachoques..."
                          className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                          Anota lo que encuentras en este punto
                        </label>
                        <input
                          type="text"
                          value={etapa3DescripcionActual}
                          onChange={(e) => {
                            setEtapa3DescripcionActual(e.target.value);
                            if (etapa3HallazgoSeleccionadoId) {
                              handleActualizarHallazgoSeleccionado(
                                etapa3HallazgoSeleccionadoId,
                                { descripcion: e.target.value }
                              );
                            }
                          }}
                          placeholder="Ej: Rayón profundo de 10cm, abolladura leve..."
                          className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Lista de Hallazgos Marcados */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-300">
                          Hallazgos registrados ({etapa3Hallazgos.length})
                        </span>
                        {etapa3Hallazgos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEtapa3Hallazgos([]);
                              setEtapa3HallazgoSeleccionadoId(null);
                            }}
                            className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Limpiar todos
                          </button>
                        )}
                      </div>

                      {etapa3Hallazgos.length === 0 ? (
                        <div className="p-4 rounded-xl bg-[#111113] border border-white/5 text-center text-xs text-zinc-500">
                          Toca el esquema del vehículo a la izquierda para agregar el punto #1.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {etapa3Hallazgos.map((h, idx) => {
                            const activo = etapa3HallazgoSeleccionadoId === h.id;
                            return (
                              <div
                                key={h.id}
                                onClick={() => {
                                  setEtapa3VistaActiva(h.vista);
                                  setEtapa3HallazgoSeleccionadoId(h.id);
                                  setEtapa3TipoHallazgoActual(h.tipo);
                                  setEtapa3ZonaActual(h.zona);
                                  setEtapa3DescripcionActual(h.descripcion);
                                }}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                                  activo
                                    ? "bg-amber-500/15 border-amber-500/40 text-white"
                                    : "bg-[#111113] hover:bg-[#161618] border-white/5 text-zinc-300"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="truncate">
                                    <p className="font-semibold text-white truncate">
                                      {h.zona}{" "}
                                      <span className="text-[10px] text-amber-300 font-normal">
                                        ({h.tipo})
                                      </span>
                                    </p>
                                    <p className="text-[11px] text-zinc-400 truncate">
                                      {h.vistaLabel}: {h.descripcion}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleEliminarHallazgoEtapa3(h.id);
                                  }}
                                  className="w-6 h-6 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center text-xs shrink-0 cursor-pointer"
                                  title="Eliminar hallazgo"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===============================================================
                SECCIÓN 2: FOTOS COMO EVIDENCIA (CLOUDFLARE R2) Y OBSERVACIONES
                =============================================================== */}
            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                    2. Fotos como Evidencia (Cloudflare R2)
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Toma fotos con la cámara del celular o súbelas de la galería como respaldo de la recepción.
                  </p>
                </div>

                <label className="h-10 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all active:scale-95">
                  <span>📷</span>
                  <span>
                    {subiendoFotoRecepcion ? "Subiendo a R2..." : "+ Sumar Foto de Evidencia"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleSubirFotoRecepcion}
                    className="hidden"
                    disabled={subiendoFotoRecepcion}
                  />
                </label>
              </div>

              {/* Galería de fotos cargadas */}
              {fotosRecepcion.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
                  {fotosRecepcion.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="relative group rounded-xl overflow-hidden border border-white/10 bg-[#111113] aspect-video"
                    >
                      <img
                        src={url}
                        alt={`Evidencia ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFotosRecepcion((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-rose-400 text-xs flex items-center justify-center opacity-90 hover:opacity-100 cursor-pointer"
                        title="Quitar foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#111113] border border-dashed border-white/10 text-center text-xs text-zinc-500">
                  Aún no se han adjuntado fotos de evidencia en esta inspección.
                </div>
              )}

              {/* Observaciones generales de la inspección */}
              <div className="pt-1">
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Observaciones adicionales de la inspección
                </label>
                <input
                  type="text"
                  value={etapa3NotasGenerales}
                  onChange={(e) => setEtapa3NotasGenerales(e.target.value)}
                  placeholder="Ej: Vehículo ingresa con carrocería húmeda / sucia, cliente autoriza revisión..."
                  className="w-full h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* ===============================================================
                PIE DEL FLOTANTE 03: VOLVER, GENERAR PDF Y GUARDAR INSPECCIÓN
                =============================================================== */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMostrarFlotanteEtapa3(false);
                  setMostrarFlotanteEtapa2(true);
                }}
                className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                ← Volver a Etapa 2
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleGenerarPdfInspeccion}
                  className="h-11 px-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <span>📄</span>
                  <span>PDF de Inspección</span>
                </button>

                <button
                  type="submit"
                  disabled={guardandoEtapa3}
                  className="h-11 px-6 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {guardandoEtapa3
                    ? "Guardando inspección..."
                    : "Guardar y Pasar a Etapa 4: Presupuesto →"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          FLOTANTE 04 — ETAPA 4: PRESUPUESTO
          - Servicios y repuestos de tu catálogo (con los más usados a un clic)
          - Impuestos y descuentos al instante
          - Aprobación del cliente con un link desde su celular
          ===================================================================== */}
      {mostrarFlotanteEtapa4 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setMostrarFlotanteEtapa4(false)}
        >
          <form
            onSubmit={(e) => handleGuardarEtapa4Presupuesto(e)}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl p-5 sm:p-6 shadow-2xl relative max-h-[93vh] overflow-y-auto space-y-5"
          >
            {/* Cabecera del Flotante 04 */}
            <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa4(false);
                      setMostrarFlotanteEtapa1(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    01 Cliente ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa4(false);
                      setMostrarFlotanteEtapa2(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    02 Vehículo ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa4(false);
                      setMostrarFlotanteEtapa3(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    03 Inspección ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-[11px] font-bold text-purple-300">
                    04
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                    Etapa 4: Presupuesto
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Arma el presupuesto
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                  Agregas servicios y repuestos desde tu catálogo, con los más usados a un clic, y los totales se calculan con impuestos y descuentos. Creas el presupuesto desde la misma orden y el cliente lo aprueba desde su celular con un link.
                </p>

                {/* 3 Píldoras clave de Etapa 4 */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                    ✓ Servicios y repuestos de tu catálogo
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
                    ✓ Impuestos y descuentos al instante
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium">
                    ✓ Aprobación del cliente con un link
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa4(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* BARRA RESUMEN DE LA ORDEN Y ESTADO DEL PRESUPUESTO */}
            <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 font-mono font-bold text-purple-300">
                  {ordenActiva?.quoteNumber ||
                    (ordenActiva ? `PRE-${ordenActiva.orderNumber}` : "NUEVO PRESUPUESTO")}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-zinc-200">
                  {ordenActiva?.plate || vehiculoEncontrado?.plate || etapa2Placa || "SIN PLACA"}
                </span>
                <span className="font-semibold text-white">
                  {ordenActiva?.vehicle ||
                    (vehiculoEncontrado
                      ? `${vehiculoEncontrado.brand} ${vehiculoEncontrado.model}`
                      : `${etapa2Marca} ${etapa2Modelo}`.trim() || "Vehículo")}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">
                  Cliente:{" "}
                  <strong className="text-zinc-200">
                    {ordenActiva?.client ||
                      clienteSeleccionadoEtapa1?.name ||
                      etapa1Nombre ||
                      "Cliente"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
                    etapa4QuoteStatus === "Aprobado por Cliente"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                  }`}
                >
                  {etapa4QuoteStatus}
                </span>
              </div>
            </div>

            {/* ===============================================================
                BLOQUE PRINCIPAL (2 COLUMNAS EN DESKTOP):
                IZQUIERDA: CATÁLOGO (MÁS USADOS A 1 CLIC, SERVICIOS Y REPUESTOS)
                DERECHA: PRESUPUESTO EN VIVO + IMPUESTOS Y DESCUENTOS AL INSTANTE
                =============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* COLUMNA IZQUIERDA (7 COLS): CATÁLOGO Y MÁS USADOS A UN CLIC */}
              <div className="lg:col-span-7 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    1. Servicios y Repuestos de tu Catálogo
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Toca para sumar al presupuesto
                  </span>
                </div>

                {/* Pestañas del Catálogo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "MAS_USADOS", label: "⚡ Más usados (1 clic)" },
                    { id: "SERVICIOS", label: `🔧 Servicios (${catalogoServiciosCompleto.length})` },
                    { id: "REPUESTOS", label: `⚙️ Repuestos (${productosInventario.length})` },
                    { id: "MANUAL", label: "➕ Ítem libre" },
                  ].map((tab) => {
                    const activo = etapa4TabCatalogo === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setEtapa4TabCatalogo(tab.id as any)}
                        className={`h-9 px-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer truncate ${
                          activo
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow"
                            : "bg-[#111113] hover:bg-[#161618] border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Buscador rápido cuando está en Servicios o Repuestos */}
                {(etapa4TabCatalogo === "SERVICIOS" || etapa4TabCatalogo === "REPUESTOS") && (
                  <div className="relative">
                    <input
                      type="text"
                      value={etapa4BusquedaCatalogo}
                      onChange={(e) => setEtapa4BusquedaCatalogo(e.target.value)}
                      placeholder={
                        etapa4TabCatalogo === "SERVICIOS"
                          ? "Buscar servicio en tu catálogo por nombre o código..."
                          : "Buscar repuesto o insumo por nombre, código o marca..."
                      }
                      className="w-full h-10 pl-3.5 pr-9 rounded-xl bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                    {etapa4BusquedaCatalogo && (
                      <button
                        type="button"
                        onClick={() => setEtapa4BusquedaCatalogo("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* VISTA 1: LOS MÁS USADOS A UN CLIC */}
                {etapa4TabCatalogo === "MAS_USADOS" && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400">
                      Agrega los servicios y repuestos más frecuentes con un solo toque:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                      {masUsadosCatalogo.map((item) => {
                        const enPresupuesto = etapa4Items.find(
                          (i) =>
                            i.code === item.code ||
                            i.name.toLowerCase() === item.name.toLowerCase()
                        );
                        return (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => handleToggleItemCatalogoEtapa4(item)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-95 ${
                              enPresupuesto
                                ? "bg-purple-500/15 border-purple-500/40 text-white"
                                : "bg-[#111113] hover:bg-[#161618] border-white/5 text-zinc-200"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                    item.type === "PART"
                                      ? "bg-pink-500/20 text-pink-300"
                                      : "bg-blue-500/20 text-blue-300"
                                  }`}
                                >
                                  {item.type === "PART" ? "REPUESTO" : "SERVICIO"}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {item.code}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-white truncate mt-1">
                                {item.name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-mono font-bold text-emerald-400 block">
                                ${item.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-purple-300 font-semibold">
                                {enPresupuesto ? `✓ Cant: ${enPresupuesto.qty}` : "+ Sumar"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VISTA 2: CATÁLOGO COMPLETO DE SERVICIOS */}
                {etapa4TabCatalogo === "SERVICIOS" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {catalogoServiciosCompleto
                      .filter((s) => {
                        const q = etapa4BusquedaCatalogo.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          s.name.toLowerCase().includes(q) ||
                          s.code.toLowerCase().includes(q) ||
                          s.category.toLowerCase().includes(q)
                        );
                      })
                      .map((srv) => {
                        const enPresupuesto = etapa4Items.find(
                          (i) =>
                            i.code === srv.code ||
                            i.name.toLowerCase() === srv.name.toLowerCase()
                        );
                        return (
                          <button
                            key={`${srv.code}-${srv.name}`}
                            type="button"
                            onClick={() =>
                              handleToggleItemCatalogoEtapa4({
                                ...srv,
                                type: "SERVICE",
                              })
                            }
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-95 ${
                              enPresupuesto
                                ? "bg-blue-500/15 border-blue-500/40 text-white"
                                : "bg-[#111113] hover:bg-[#161618] border-white/5 text-zinc-200"
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] text-blue-300 block truncate">
                                {srv.category}
                              </span>
                              <p className="text-xs font-semibold text-white truncate">
                                {srv.name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-mono font-bold text-emerald-400 block">
                                ${srv.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-blue-300">
                                {enPresupuesto ? `✓ (${enPresupuesto.qty})` : "+ Sumar"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* VISTA 3: CATÁLOGO DE REPUESTOS E INSUMOS (INVENTARIO EN VIVO) */}
                {etapa4TabCatalogo === "REPUESTOS" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {productosInventario
                      .filter((p) => {
                        const q = etapa4BusquedaCatalogo.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.code.toLowerCase().includes(q) ||
                          (p.brand || "").toLowerCase().includes(q) ||
                          (p.category || "").toLowerCase().includes(q)
                        );
                      })
                      .map((prod) => {
                        const enPresupuesto = etapa4Items.find(
                          (i) => i.productId === prod.id || i.code === prod.code
                        );
                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() =>
                              handleToggleItemCatalogoEtapa4({
                                code: prod.code,
                                name: prod.name,
                                price: Number(prod.price) || 0,
                                type: "PART",
                                category: "Repuestos e Insumos",
                                productId: prod.id,
                                imageUrl: prod.imageUrl,
                              })
                            }
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-95 ${
                              enPresupuesto
                                ? "bg-pink-500/15 border-pink-500/40 text-white"
                                : "bg-[#111113] hover:bg-[#161618] border-white/5 text-zinc-200"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-pink-300">
                                  {prod.code}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  • Stock: {prod.stock}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-white truncate">
                                {prod.name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-mono font-bold text-emerald-400 block">
                                ${Number(prod.price || 0).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-pink-300">
                                {enPresupuesto ? `✓ (${enPresupuesto.qty})` : "+ Sumar"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* VISTA 4: AGREGAR ÍTEM LIBRE / PERSONALIZADO */}
                {etapa4TabCatalogo === "MANUAL" && (
                  <div className="p-3.5 rounded-xl bg-[#111113] border border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEtapa4ManualTipo("SERVICE")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          etapa4ManualTipo === "SERVICE"
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                            : "bg-black/40 border-white/10 text-zinc-400"
                        }`}
                      >
                        🔧 Servicio
                      </button>
                      <button
                        type="button"
                        onClick={() => setEtapa4ManualTipo("PART")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          etapa4ManualTipo === "PART"
                            ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                            : "bg-black/40 border-white/10 text-zinc-400"
                        }`}
                      >
                        ⚙️ Repuesto / Insumo
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={etapa4ManualNombre}
                          onChange={(e) => setEtapa4ManualNombre(e.target.value)}
                          placeholder="Descripción del servicio o repuesto..."
                          className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={etapa4ManualPrecio}
                          onChange={(e) => setEtapa4ManualPrecio(e.target.value)}
                          placeholder="$ Precio"
                          className="w-full h-10 px-3 rounded-lg bg-[#0a0a0a] border border-white/10 text-white text-xs font-mono placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={handleAgregarManualEtapa4}
                          className="h-10 px-3.5 rounded-lg bg-purple-500/25 hover:bg-purple-500/35 border border-purple-500/40 text-purple-200 text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* COLUMNA DERECHA (5 COLS): DETALLE DEL PRESUPUESTO, IMPUESTOS Y DESCUENTOS AL INSTANTE */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      2. Ítems e Impuestos al Instante
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {etapa4Items.length} ítem(s)
                    </span>
                  </div>

                  {/* Lista editable de ítems del presupuesto */}
                  {etapa4Items.length === 0 ? (
                    <div className="p-5 rounded-xl bg-[#111113] border border-white/5 text-center text-xs text-zinc-500">
                      Toca cualquier servicio o repuesto a la izquierda para armar el presupuesto.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {etapa4Items.map((it) => (
                        <div
                          key={it.id}
                          className="p-2.5 rounded-xl bg-[#111113] border border-white/5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white truncate">{it.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-zinc-400">P.Unit $:</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.price}
                                onChange={(e) =>
                                  handleCambiarPrecioEtapa4(it.id, e.target.value)
                                }
                                className="w-16 h-6 px-1.5 rounded bg-black/50 border border-white/10 text-white font-mono text-[11px]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCambiarCantidadEtapa4(it.id, -1)}
                              className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-white">
                              {it.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCambiarCantidadEtapa4(it.id, 1)}
                              className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center font-bold cursor-pointer"
                            >
                              +
                            </button>
                            <span className="w-14 text-right font-mono font-bold text-emerald-400">
                              ${((Number(it.price) || 0) * (Number(it.qty) || 1)).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEliminarItemEtapa4(it.id)}
                              className="w-6 h-6 rounded-md bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center text-[11px] cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Controles de Descuento e Impuestos (IVA) al instante */}
                  <div className="p-3 rounded-xl bg-[#111113] border border-white/5 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Descuento */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-zinc-400">
                            Descuento
                          </label>
                          <div className="flex rounded overflow-hidden border border-white/10 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setEtapa4DiscountType("PERCENT")}
                              className={`px-1.5 py-0.5 font-bold cursor-pointer ${
                                etapa4DiscountType === "PERCENT"
                                  ? "bg-purple-500 text-white"
                                  : "bg-black/40 text-zinc-400"
                              }`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => setEtapa4DiscountType("FIXED")}
                              className={`px-1.5 py-0.5 font-bold cursor-pointer ${
                                etapa4DiscountType === "FIXED"
                                  ? "bg-purple-500 text-white"
                                  : "bg-black/40 text-zinc-400"
                              }`}
                            >
                              $
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={etapa4Discount}
                          onChange={(e) => setEtapa4Discount(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg bg-[#0a0a0a] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      {/* Impuesto IVA (%) */}
                      <div>
                        <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                          Impuesto (IVA %)
                        </label>
                        <div className="flex gap-1">
                          {["0", "12", "15"].map((tasa) => (
                            <button
                              key={tasa}
                              type="button"
                              onClick={() => setEtapa4TaxRate(tasa)}
                              className={`flex-1 h-9 rounded-lg border text-xs font-mono font-semibold cursor-pointer ${
                                etapa4TaxRate === tasa
                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                                  : "bg-[#0a0a0a] border-white/10 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {tasa}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Resumen numérico en tiempo real */}
                    <div className="pt-2 border-t border-white/5 space-y-1 text-xs">
                      <div className="flex justify-between text-zinc-400">
                        <span>Subtotal Catálogo</span>
                        <span className="font-mono text-zinc-200">
                          ${calculosPresupuestoEtapa4.subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>
                          Descuento{" "}
                          {etapa4DiscountType === "PERCENT" ? `(${etapa4Discount || 0}%)` : "($)"}
                        </span>
                        <span className="font-mono">
                          -${calculosPresupuestoEtapa4.discountAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Impuesto (IVA {calculosPresupuestoEtapa4.taxRateNum}%)</span>
                        <span className="font-mono text-zinc-200">
                          +${calculosPresupuestoEtapa4.taxAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-white/10 text-sm font-bold text-white">
                        <span>Total Presupuesto</span>
                        <span className="text-base font-mono text-emerald-400">
                          ${calculosPresupuestoEtapa4.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===============================================================
                SECCIÓN 3: APROBACIÓN DEL CLIENTE CON UN LINK DESDE SU CELULAR
                =============================================================== */}
            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-sky-500/25 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                    3. Aprobación del Cliente con un Link (Desde su Celular)
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Comparte este link por WhatsApp o cópialo para que el cliente revise y apruebe el presupuesto desde su teléfono.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopiarLinkPresupuesto}
                    className="h-9 px-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <span>📋</span>
                    <span>{copiadoLinkPresupuesto ? "¡Link Copiado!" : "Copiar Link"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEnviarWhatsAppPresupuesto}
                    className="h-9 px-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <span>📲</span>
                    <span>Enviar Link por WhatsApp</span>
                  </button>

                  <a
                    href={linkAprobacionCliente}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <span>🔗</span>
                    <span>Abrir Vista Cliente</span>
                  </a>
                </div>
              </div>

              {/* Caja con la URL del Link Móvil y botón de aprobación directa */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-8">
                  <input
                    type="text"
                    readOnly
                    value={linkAprobacionCliente}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-sky-300 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <button
                    type="button"
                    disabled={guardandoEtapa4}
                    onClick={() =>
                      handleGuardarEtapa4Presupuesto(undefined, "Aprobado por Cliente")
                    }
                    className="w-full h-10 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                  >
                    ✅ Marcar Aprobado Ahora
                  </button>
                </div>
              </div>
            </div>

            {/* ===============================================================
                PIE DEL FLOTANTE 04: VOLVER Y GUARDAR PRESUPUESTO EN LA ORDEN
                =============================================================== */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMostrarFlotanteEtapa4(false);
                  setMostrarFlotanteEtapa3(true);
                }}
                className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                ← Volver a Etapa 3: Inspección
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMostrarFlotanteEtapa4(false)}
                  className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Seguir en Panel Taller
                </button>

                <button
                  type="submit"
                  disabled={guardandoEtapa4}
                  className="h-11 px-6 rounded-xl bg-purple-500/25 hover:bg-purple-500/35 border border-purple-500/50 text-purple-200 hover:text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {guardandoEtapa4
                    ? "Guardando presupuesto..."
                    : "Guardar y Pasar a Etapa 5: Reparación →"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          FLOTANTE 05 — ETAPA 5: REPARACIÓN
          - Asignas uno o más técnicos y cada uno recibe el aviso
          - Fotos del avance (desde el computador o el celular a Cloudflare R2)
          - Notas de voz y chat interno
          - Registro de horas por técnico
          ===================================================================== */}
      {mostrarFlotanteEtapa5 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setMostrarFlotanteEtapa5(false)}
        >
          <form
            onSubmit={handleGuardarEtapa5Reparacion}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl p-5 sm:p-6 shadow-2xl relative max-h-[93vh] overflow-y-auto space-y-5"
          >
            {/* Cabecera del Flotante 05 */}
            <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa5(false);
                      setMostrarFlotanteEtapa1(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    01 Cliente ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa5(false);
                      setMostrarFlotanteEtapa2(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    02 Vehículo ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa5(false);
                      setMostrarFlotanteEtapa3(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    03 Inspección ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa5(false);
                      setMostrarFlotanteEtapa4(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    04 Presupuesto ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/40 text-[11px] font-bold text-sky-300">
                    05
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Etapa 5: Reparación
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white">
                  El técnico trabaja y la orden se va completando
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                  Asignas uno o más técnicos y cada uno recibe el aviso. Desde el computador o el celular suben fotos, dejan notas de voz, conversan en el chat interno y registran sus horas en la orden.
                </p>

                {/* 3 Píldoras clave de Etapa 5 */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium">
                    ✓ Fotos del avance
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                    ✓ Notas de voz y chat interno
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
                    ✓ Registro de horas por técnico
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa5(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* BARRA DE PROGRESO EN VIVO DE LA ORDEN Y CRONÓMETRO */}
            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 font-mono font-bold text-sky-300">
                    #{ordenActiva?.orderNumber || "OT-EN-CURSO"}
                  </span>
                  <span className="font-semibold text-white">
                    {ordenActiva?.vehicle ||
                      `${etapa2Marca} ${etapa2Modelo}`.trim() ||
                      "Vehículo en Reparación"}{" "}
                    ({ordenActiva?.plate || etapa2Placa || "S/P"})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#111113] border border-white/10 font-mono text-xs font-bold text-emerald-400">
                    ⏱ {formatElapsedTime(ordenActiva?.startedAt || null, ordenActiva?.completedAt || null, nowTick)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 font-mono text-xs font-bold text-sky-300">
                    Avance: {ordenActiva?.progress ?? 50}%
                  </span>
                </div>
              </div>

              {/* Barra de progreso visual */}
              <div className="w-full h-2.5 rounded-full bg-[#161618] overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(8, ordenActiva?.progress ?? 50))}%` }}
                />
              </div>

              {/* Tareas / Servicios de la orden que se van completando con 1 clic */}
              {ordenActiva && ordenActiva.items.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-400 block">
                    Toca cada trabajo para actualizar su avance (Pendiente → En Proceso → Listo):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ordenActiva.items.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => handleCiclarEstadoItem(it.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                          it.status === "Listo"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : it.status === "En Proceso"
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                            : "bg-[#111113] border-white/10 text-zinc-300 hover:text-white"
                        }`}
                      >
                        <span>
                          {it.status === "Listo"
                            ? "✓"
                            : it.status === "En Proceso"
                            ? "⚙️"
                            : "○"}
                        </span>
                        <span className="truncate max-w-[180px]">{it.name}</span>
                        <span className="text-[10px] opacity-80">({it.status})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ===============================================================
                SECCIÓN 1: ASIGNAR UNO O MÁS TÉCNICOS Y ENVIAR AVISO
                =============================================================== */}
            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                    1. Técnicos Asignados a la Orden ({etapa5TecnicosAsignados.length})
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Selecciona uno o varios técnicos para esta reparación; cada uno recibe el aviso en su tablero.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleEnviarAvisoTecnicosEtapa5}
                  className="h-9 px-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <span>🔔</span>
                  <span>Enviar Aviso a Técnicos ({etapa5TecnicosAsignados.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {mecanicos.map((nombreTec) => {
                  const asignadoObj = etapa5TecnicosAsignados.find(
                    (t) => t.name === nombreTec
                  );
                  const activo = Boolean(asignadoObj);
                  return (
                    <button
                      key={nombreTec}
                      type="button"
                      onClick={() => handleToggleTecnicoEtapa5(nombreTec)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-95 ${
                        activo
                          ? "bg-sky-500/15 border-sky-500/40 text-white"
                          : "bg-[#111113] hover:bg-[#161618] border-white/5 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            activo
                              ? "bg-sky-500 text-black"
                              : "bg-white/5 text-zinc-400"
                          }`}
                        >
                          {nombreTec.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate">{nombreTec}</p>
                          <p className="text-[10px] text-emerald-400">
                            {activo ? "🔔 Aviso recibido" : "Toca para asignar"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border shrink-0 ${
                          activo
                            ? "bg-sky-500 border-sky-400 text-black font-bold"
                            : "border-zinc-700 bg-black/40 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ===============================================================
                SECCIÓN 2 Y 3 (2 COLUMNAS EN DESKTOP):
                IZQUIERDA: NOTAS DE VOZ Y CHAT INTERNO DE LA ORDEN
                DERECHA: FOTOS DEL AVANCE (R2) + REGISTRO DE HORAS POR TÉCNICO
                =============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* COLUMNA IZQUIERDA (6 COLS): NOTAS DE VOZ Y CHAT INTERNO */}
              <div className="lg:col-span-6 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex flex-col justify-between space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      2. Notas de Voz y Chat Interno
                    </span>
                    <select
                      value={etapa5ChatAutor}
                      onChange={(e) => setEtapa5ChatAutor(e.target.value)}
                      className="h-7 px-2 rounded-lg bg-[#111113] border border-white/10 text-[11px] text-zinc-200 focus:outline-none focus:border-purple-500"
                    >
                      {etapa5TecnicosAsignados.map((t) => (
                        <option key={t.name} value={t.name} className="bg-[#111113]">
                          Habla: {t.name}
                        </option>
                      ))}
                      <option value="Jefe de Taller" className="bg-[#111113]">
                        Habla: Jefe de Taller
                      </option>
                    </select>
                  </div>

                  {/* Historial de mensajes y notas de voz */}
                  <div className="h-60 rounded-xl bg-[#111113] border border-white/5 p-3 overflow-y-auto space-y-2.5">
                    {etapa5ChatMensajes.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-1">
                        <span>💬</span>
                        <p>
                          Sin mensajes aún. Escribe en el chat o graba una nota de voz desde el celular o PC.
                        </p>
                      </div>
                    ) : (
                      etapa5ChatMensajes.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-2.5 rounded-xl bg-[#161618] border border-white/5 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-purple-300">{msg.author}</span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {msg.createdAt}
                            </span>
                          </div>
                          {msg.text && <p className="text-zinc-200 leading-relaxed">{msg.text}</p>}
                          {msg.audioUrl && (
                            <audio
                              controls
                              src={msg.audioUrl}
                              className="w-full h-8 mt-1"
                            />
                          )}
                          {msg.photoUrl && (
                            <img
                              src={msg.photoUrl}
                              alt="Avance"
                              className="w-28 h-20 object-cover rounded-lg border border-white/10 mt-1"
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Controles para enviar mensaje o grabar nota de voz */}
                <div className="space-y-2 pt-1">
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
                      placeholder="Escribe un comentario técnico en el chat interno..."
                      className="flex-1 h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleEnviarMensajeChatEtapa5}
                      className="h-10 px-3.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-semibold cursor-pointer active:scale-95 shrink-0"
                    >
                      Enviar
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={subiendoAudioEtapa5}
                      onClick={handleToggleGrabacionNotaVozEtapa5}
                      className={`flex-1 h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                        grabandoAudioEtapa5
                          ? "bg-rose-500/25 border-rose-500/50 text-rose-300 animate-pulse"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      <span>🎙️</span>
                      <span>
                        {subiendoAudioEtapa5
                          ? "Subiendo nota de voz a R2..."
                          : grabandoAudioEtapa5
                          ? `Grabando (${segundosGrabacionAudio}s) • Toca para enviar`
                          : "Grabar Nota de Voz (Celular / PC)"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA (6 COLS): FOTOS DEL AVANCE (R2) + REGISTRO DE HORAS POR TÉCNICO */}
              <div className="lg:col-span-6 space-y-4">
                {/* SUB-BLOQUE A: FOTOS DEL AVANCE (CLOUDFLARE R2) */}
                <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                        3. Fotos del Avance (Cloudflare R2)
                      </span>
                      <p className="text-[11px] text-zinc-400">
                        Sube fotos del proceso o repuestos instalados desde tu celular o PC.
                      </p>
                    </div>

                    <label className="h-9 px-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                      <span>📷</span>
                      <span>
                        {subiendoEvidencia ? "Subiendo..." : "+ Subir Foto Avance"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSubirFotoAvanceEtapa5}
                        className="hidden"
                        disabled={subiendoEvidencia}
                      />
                    </label>
                  </div>

                  {ordenActiva?.evidencePhotos && ordenActiva.evidencePhotos.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {ordenActiva.evidencePhotos.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative rounded-xl overflow-hidden border border-white/10 bg-[#111113] aspect-video"
                        >
                          <img
                            src={url}
                            alt={`Avance ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#111113] border border-dashed border-white/10 text-center text-xs text-zinc-500">
                      Aún no se han subido fotos del avance de reparación.
                    </div>
                  )}
                </div>

                {/* SUB-BLOQUE B: REGISTRO DE HORAS POR TÉCNICO */}
                <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      4. Registro de Horas por Técnico
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {etapa5HorasRegistros.length} registro(s)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <select
                        value={etapa5HoraTecnico}
                        onChange={(e) => setEtapa5HoraTecnico(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg bg-[#111113] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {mecanicos.map((m) => (
                          <option key={m} value={m} className="bg-[#111113]">
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={etapa5HoraCantHoras}
                        onChange={(e) => setEtapa5HoraCantHoras(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg bg-[#111113] border border-white/10 text-white font-mono text-xs text-center"
                        title="Horas"
                      />
                      <span className="text-[11px] text-zinc-400">h</span>
                    </div>
                    <div className="sm:col-span-4 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="5"
                        value={etapa5HoraCantMinutos}
                        onChange={(e) => setEtapa5HoraCantMinutos(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg bg-[#111113] border border-white/10 text-white font-mono text-xs text-center"
                        title="Minutos"
                      />
                      <span className="text-[11px] text-zinc-400">m</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={etapa5HoraTarea}
                      onChange={(e) => setEtapa5HoraTarea(e.target.value)}
                      placeholder="Actividad realizada (ej: Cambio de pastillas y purga)..."
                      className="flex-1 h-9 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAgregarHorasTecnicoEtapa5}
                      className="h-9 px-3.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer active:scale-95"
                    >
                      + Registrar Horas
                    </button>
                  </div>

                  {/* Lista de horas registradas por técnico */}
                  {etapa5HorasRegistros.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 pt-1">
                      {etapa5HorasRegistros.map((reg) => (
                        <div
                          key={reg.id}
                          className="p-2 rounded-lg bg-[#111113] border border-white/5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">
                              {reg.technician}{" "}
                              <span className="text-emerald-400 font-mono">
                                ({reg.hours}h {reg.minutes}m)
                              </span>
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {reg.taskDescription} • {reg.date}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleEliminarHoraTecnicoEtapa5(reg.id)}
                            className="w-6 h-6 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center text-xs shrink-0 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===============================================================
                PIE DEL FLOTANTE 05: VOLVER Y GUARDAR AVANCE DE REPARACIÓN
                =============================================================== */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMostrarFlotanteEtapa5(false);
                  setMostrarFlotanteEtapa4(true);
                }}
                className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                ← Volver a Etapa 4: Presupuesto
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMostrarFlotanteEtapa5(false)}
                  className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Seguir en Panel Taller
                </button>

                <button
                  type="submit"
                  disabled={guardandoEtapa5}
                  className="h-11 px-6 rounded-xl bg-sky-500/25 hover:bg-sky-500/35 border border-sky-500/50 text-sky-200 hover:text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {guardandoEtapa5
                    ? "Guardando avance..."
                    : "Guardar Avance → Etapa 6: Estado y aviso"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          FLOTANTE 06: ETAPA 6 - ESTADO Y AVISO
          ("CAMBIAS EL ESTADO Y EL AVISO AL CLIENTE YA ESTÁ ESCRITO")
          - Estados con el nombre y color que elijas
          - Aviso por WhatsApp o correo en un clic
          - Seguimiento en línea con número de orden y PIN
          ===================================================================== */}
      {mostrarFlotanteEtapa6 && (
        <div
          onClick={() => setMostrarFlotanteEtapa6(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <form
            onSubmit={handleGuardarEtapa6EstadoAviso}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-4xl p-5 sm:p-6 shadow-2xl relative max-h-[94vh] overflow-y-auto space-y-5"
          >
            {/* Cabecera del Flotante 06 */}
            <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa6(false);
                      setMostrarFlotanteEtapa1(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    01 Cliente ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa6(false);
                      setMostrarFlotanteEtapa2(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    02 Vehículo ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa6(false);
                      setMostrarFlotanteEtapa3(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    03 Inspección ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa6(false);
                      setMostrarFlotanteEtapa4(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    04 Presupuesto ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarFlotanteEtapa6(false);
                      setMostrarFlotanteEtapa5(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-400 hover:text-white cursor-pointer"
                  >
                    05 Reparación ✓
                  </button>
                  <span className="text-zinc-600 text-xs">→</span>
                  <span className="px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/40 text-[11px] font-bold text-pink-300">
                    06
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-pink-400">
                    Etapa 6: Estado y aviso
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Cambias el estado y el aviso al cliente ya está escrito
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                  Cada orden avanza por los estados que definas. Al cambiar el estado, la app te ofrece el mensaje listo para enviarlo por WhatsApp o correo. El cliente también puede revisar su orden en la página de seguimiento.
                </p>

                {/* 3 Píldoras clave de Etapa 6 */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 font-medium">
                    ✓ Estados con el nombre y color que elijas
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
                    ✓ Aviso por WhatsApp o correo en un clic
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium">
                    ✓ Seguimiento en línea con número de orden y PIN
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa6(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* ===============================================================
                SECCIÓN 1: ESTADOS CON EL NOMBRE Y COLOR QUE ELIJAS
                =============================================================== */}
            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider block">
                    1. Estados con el nombre y color que elijas
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Toca cualquier estado para avanzar la orden y redactar el aviso al instante, o crea tus propios estados personalizados.
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    getEstiloColorEstado(etapa6ColorSeleccionado).bg
                  } ${getEstiloColorEstado(etapa6ColorSeleccionado).border} ${
                    getEstiloColorEstado(etapa6ColorSeleccionado).text
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      getEstiloColorEstado(etapa6ColorSeleccionado).dot
                    }`}
                  />
                  <span>Actual: {etapa6EstadoSeleccionado}</span>
                </span>
              </div>

              {/* Grilla de Estados (Predefinidos + Personalizados) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {etapa6EstadosLista.map((st) => {
                  const activo =
                    etapa6EstadoSeleccionado.toLowerCase() === st.name.toLowerCase();
                  const estilo = getEstiloColorEstado(st.color);

                  return (
                    <div
                      key={st.id}
                      onClick={() => handleSeleccionarEstadoEtapa6(st)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 active:scale-95 ${
                        activo
                          ? `${estilo.bg} ${estilo.border} ${estilo.text} ring-1 ring-white/20`
                          : "bg-[#111113] hover:bg-[#161618] border-white/5 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 ${estilo.dot}`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {st.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Avance: {st.progress}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {activo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/30 text-white">
                            Activo
                          </span>
                        )}
                        {st.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEliminarEstadoPersonalizadoEtapa6(st.id);
                            }}
                            className="w-6 h-6 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center text-[10px]"
                            title="Eliminar estado personalizado"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Creador de Nuevo Estado Personalizado con Nombre y Color */}
              <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={etapa6NuevoEstadoNombre}
                  onChange={(e) => setEtapa6NuevoEstadoNombre(e.target.value)}
                  placeholder="Escribe un nuevo estado (ej: En Prueba de Ruta, En Pintura)..."
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#111113] border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                />

                {/* Selector de color para el nuevo estado */}
                <div className="flex items-center gap-1.5 bg-[#111113] border border-white/10 rounded-xl px-2.5 py-1.5 overflow-x-auto">
                  {COLORES_ESTADO_ETAPA6.map((col) => {
                    const sel = etapa6NuevoEstadoColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          setEtapa6NuevoEstadoColor(col.id);
                          setEtapa6ColorSeleccionado(col.id);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                          sel
                            ? `${col.bg} ${col.border} ${col.text} border`
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span>{col.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleCrearEstadoPersonalizadoEtapa6}
                  className="h-10 px-4 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer active:scale-95 transition-all"
                >
                  + Crear Estado
                </button>
              </div>
            </div>

            {/* ===============================================================
                SECCIÓN 2 Y 3 (2 COLUMNAS EN DESKTOP):
                IZQUIERDA: AVISO AL CLIENTE YA ESCRITO (WHATSAPP O CORREO EN 1 CLIC)
                DERECHA: SEGUIMIENTO EN LÍNEA CON NÚMERO DE ORDEN Y PIN
                =============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* COLUMNA IZQUIERDA (7 COLS): AVISO POR WHATSAPP O CORREO EN UN CLIC */}
              <div className="lg:col-span-7 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                      2. Aviso al Cliente Listo para Enviar (1 Clic)
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      El mensaje se redacta automáticamente al elegir el estado. Puedes editarlo si deseas.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEtapa6MensajeAviso(
                        generarMensajeAvisoClienteEtapa6(etapa6EstadoSeleccionado)
                      )
                    }
                    className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-zinc-300 hover:text-white cursor-pointer"
                  >
                    🔄 Regenerar texto
                  </button>
                </div>

                {/* Datos de contacto del cliente (WhatsApp y Correo) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      WhatsApp / Teléfono del cliente
                    </label>
                    <input
                      type="text"
                      value={etapa6ClienteTelefono}
                      onChange={(e) => setEtapa6ClienteTelefono(e.target.value)}
                      placeholder="Ej: 0991234567"
                      className="w-full h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Correo electrónico del cliente
                    </label>
                    <input
                      type="email"
                      value={etapa6ClienteEmail}
                      onChange={(e) => setEtapa6ClienteEmail(e.target.value)}
                      placeholder="cliente@correo.com"
                      className="w-full h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Mensaje pre-escrito listo para enviar */}
                <div className="space-y-1">
                  <label className="block text-[11px] text-zinc-400">
                    Mensaje de aviso pre-escrito (incluye estado, link de seguimiento, orden y PIN):
                  </label>
                  <textarea
                    rows={6}
                    value={etapa6MensajeAviso}
                    onChange={(e) => setEtapa6MensajeAviso(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#111113] border border-emerald-500/30 focus:border-emerald-500 text-zinc-100 text-xs leading-relaxed focus:outline-none resize-none"
                  />
                </div>

                {/* Botones de envío en 1 clic: WhatsApp y Correo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleEnviarWhatsAppAvisoEtapa6}
                    className="h-11 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-lg"
                  >
                    <span>📲</span>
                    <span>Enviar por WhatsApp en 1 clic</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEnviarCorreoAvisoEtapa6}
                    className="h-11 px-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-lg"
                  >
                    <span>✉️</span>
                    <span>Enviar por Correo en 1 clic</span>
                  </button>
                </div>
              </div>

              {/* COLUMNA DERECHA (5 COLS): SEGUIMIENTO EN LÍNEA CON NÚMERO DE ORDEN Y PIN */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex flex-col justify-between space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                      3. Seguimiento en Línea con Orden y PIN
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      El cliente ingresa con su número de orden y PIN para ver el estado, fotos y servicios en vivo.
                    </p>
                  </div>

                  {/* Tarjeta de Credenciales de Seguimiento (N° Orden + PIN) */}
                  <div className="p-3.5 rounded-xl bg-[#111113] border border-sky-500/30 space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase block">
                          Número de Orden
                        </span>
                        <strong className="text-sm font-mono text-white">
                          #{ordenActiva?.orderNumber || "OT-EN-CURSO"}
                        </strong>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#0a0a0a] border border-sky-500/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-sky-400 uppercase font-semibold">
                            PIN Cliente
                          </span>
                          <button
                            type="button"
                            onClick={handleGenerarNuevoPinEtapa6}
                            className="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                            title="Generar nuevo PIN de 4 dígitos"
                          >
                            🔄 Nuevo
                          </button>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={etapa6TrackingPin}
                          onChange={(e) => {
                            const nuevo = e.target.value;
                            setEtapa6TrackingPin(nuevo);
                            setEtapa6MensajeAviso(
                              generarMensajeAvisoClienteEtapa6(
                                etapa6EstadoSeleccionado,
                                nuevo
                              )
                            );
                          }}
                          className="w-full bg-transparent text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* URL de la página de seguimiento */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 block">
                        Página pública de seguimiento del cliente:
                      </span>
                      <div className="p-2 rounded-lg bg-[#0a0a0a] border border-white/10 font-mono text-[11px] text-sky-300 break-all">
                        {linkSeguimientoEnLinea}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCopiarLinkSeguimientoEtapa6}
                        className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold cursor-pointer active:scale-95"
                      >
                        {copiadoLinkSeguimiento ? "✓ Link Copiado" : "📋 Copiar Link"}
                      </button>

                      <a
                        href={linkSeguimientoEnLinea}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-3 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <span>🔎 Ver Seguimiento ↗</span>
                      </a>
                    </div>
                  </div>

                  {/* Bitácora / Historial de Estados y Avisos de la Orden */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-zinc-400 block">
                      Historial reciente de estados y avisos:
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {Array.isArray(ordenActiva?.statusHistory) &&
                      ordenActiva.statusHistory.length > 0 ? (
                        ordenActiva.statusHistory.map((h) => {
                          const col = getEstiloColorEstado(h.color as any);
                          return (
                            <div
                              key={h.id}
                              className="p-2 rounded-lg bg-[#111113] border border-white/5 flex items-center justify-between gap-2 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                                <span className="font-semibold text-white truncate">
                                  {h.status}
                                </span>
                                {h.channel && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold">
                                    {h.channel}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                {h.createdAt}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-zinc-500 py-2">
                          Al cambiar de estado o enviar un aviso quedará registrado aquí.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===============================================================
                PIE DEL FLOTANTE 06: VOLVER A ETAPA 5 Y GUARDAR ESTADO Y AVISO
                =============================================================== */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMostrarFlotanteEtapa6(false);
                  setMostrarFlotanteEtapa5(true);
                }}
                className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                ← Volver a Etapa 5: Reparación
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMostrarFlotanteEtapa6(false)}
                  className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="submit"
                  disabled={guardandoEtapa6}
                  className="h-11 px-6 rounded-xl bg-pink-500/25 hover:bg-pink-500/35 border border-pink-500/50 text-pink-200 hover:text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {guardandoEtapa6
                    ? "Guardando estado..."
                    : "Guardar y Continuar a Etapa 7 →"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          FLOTANTE 07 — ETAPA 7: ENTREGA Y FIRMA
          (1. Detalle de la entrega, 2. Informe técnico, 3. Firma en el taller o a distancia)
          ===================================================================== */}
      {mostrarFlotanteEtapa7 && (
        <div
          className="fixed inset-0 z-[79] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setMostrarFlotanteEtapa7(false)}
        >
          <form
            onSubmit={handleGuardarEtapa7EntregaFirma}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-6xl max-h-[94vh] overflow-y-auto p-5 sm:p-7 shadow-2xl space-y-5 relative"
          >
            {/* Resplandor superior */}
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-25 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(20,184,166,0.45) 0%, transparent 70%)",
              }}
            />

            {/* Encabezado Flotante 07 */}
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 shadow-lg flex flex-col items-center justify-center shrink-0 border border-white/10">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-teal-100/90 leading-none">
                    ETAPA
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white leading-tight">
                    07
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                      Etapa 7: Entrega y firma
                    </span>
                    {ordenActiva && (
                      <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-200 border border-white/10">
                        #{ordenActiva.orderNumber} • {ordenActiva.plate} •{" "}
                        {ordenActiva.client}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        etapa7FirmaDataUrl
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {etapa7FirmaDataUrl
                        ? `✓ Recepción Firmada (${etapa7FirmadoPor || ordenActiva?.client || "Cliente"})`
                        : ordenActiva?.deliveryStatus || "Pendiente de Firma"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Entrega en tres pasos, con la firma del cliente.
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 max-w-3xl leading-relaxed">
                    Revisas el detalle de la entrega, adjuntas el informe técnico y el
                    cliente firma la recepción en la pantalla. Si no está en el taller, le
                    envías la aceptación por correo para que firme desde su celular.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa7(false)}
                className="w-9 h-9 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* 3 Pilares Clave de la Etapa 7 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5">
                <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </span>
                <span className="text-xs font-medium text-zinc-200">
                  Detalle de la entrega
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </span>
                <span className="text-xs font-medium text-zinc-200">
                  Informe técnico
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5">
                <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </span>
                <span className="text-xs font-medium text-zinc-200">
                  Firma en el taller o a distancia
                </span>
              </div>
            </div>

            {/* CUERPO EN 3 COLUMNAS: PASO 1 (DETALLE), PASO 2 (INFORME TÉCNICO), PASO 3 (FIRMA) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
              {/* =============================================================
                  PASO 1 (4 COLUMNAS): DETALLE DE LA ENTREGA Y CHECKLIST
                  ============================================================= */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                      1. Detalle de la entrega
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Verifica con el cliente los trabajos realizados y las condiciones de salida.
                    </p>
                  </div>

                  {/* Resumen de trabajos realizados */}
                  <div className="p-3 rounded-xl bg-[#111113] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-medium">
                        Servicios / Repuestos en orden:
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {ordenActiva?.items.length || 0} ítems ($
                        {Number(ordenActiva?.totalCost || 0).toFixed(2)})
                      </span>
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {ordenActiva?.items && ordenActiva.items.length > 0 ? (
                        ordenActiva.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-none"
                          >
                            <span className="text-zinc-200 truncate pr-2">
                              ✓ {it.name} (x{it.qty || 1})
                            </span>
                            <span className="font-mono text-zinc-400 shrink-0">
                              ${((it.qty || 1) * Number(it.price || 0)).toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-zinc-500">
                          Sin servicios cargados aún en la orden activa.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Checklist de conformidad de entrega */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-zinc-300 block">
                      Checklist de control de entrega:
                    </span>
                    {[
                      {
                        key: "trabajosVerificados" as const,
                        label: "Trabajos y servicios revisados con el cliente",
                      },
                      {
                        key: "pertenenciasEntregadas" as const,
                        label: "Inventario e ítems personales entregados completos",
                      },
                      {
                        key: "repuestosMostrados" as const,
                        label: "Repuestos reemplazados mostrados / entregados",
                      },
                      {
                        key: "vehiculoLimpio" as const,
                        label: "Vehículo limpio y niveles verificados para salida",
                      },
                    ].map((chk) => {
                      const checked = Boolean(etapa7Checklist[chk.key]);
                      return (
                        <label
                          key={chk.key}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            checked
                              ? "bg-teal-500/10 border-teal-500/30 text-white"
                              : "bg-[#111113] border-white/5 text-zinc-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setEtapa7Checklist((prev) => ({
                                ...prev,
                                [chk.key]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 accent-teal-500 rounded"
                          />
                          <span>{chk.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Datos de quien recibe y observaciones */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">
                        Recibido por (Nombre)
                      </label>
                      <input
                        type="text"
                        value={etapa7Checklist.recibidoPorNombre}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEtapa7Checklist((prev) => ({
                            ...prev,
                            recibidoPorNombre: val,
                          }));
                          if (!etapa7FirmadoPor) setEtapa7FirmadoPor(val);
                        }}
                        placeholder="Nombre del cliente"
                        className="w-full h-9 px-2.5 rounded-lg bg-[#111113] border border-white/10 text-xs text-white focus:outline-none focus:border-teal-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">
                        Cédula / RUC / ID
                      </label>
                      <input
                        type="text"
                        value={etapa7Checklist.recibidoPorDoc}
                        onChange={(e) =>
                          setEtapa7Checklist((prev) => ({
                            ...prev,
                            recibidoPorDoc: e.target.value,
                          }))
                        }
                        placeholder="Documento"
                        className="w-full h-9 px-2.5 rounded-lg bg-[#111113] border border-white/10 text-xs text-white focus:outline-none focus:border-teal-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">
                      Observaciones de entrega / Garantía
                    </label>
                    <input
                      type="text"
                      value={etapa7Checklist.observacionesEntrega}
                      onChange={(e) =>
                        setEtapa7Checklist((prev) => ({
                          ...prev,
                          observacionesEntrega: e.target.value,
                        }))
                      }
                      placeholder="Ej: Garantía de 30 días en mano de obra..."
                      className="w-full h-9 px-2.5 rounded-lg bg-[#111113] border border-white/10 text-xs text-white focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* =============================================================
                  PASO 2 (4 COLUMNAS): INFORME TÉCNICO Y ADJUNTO
                  ============================================================= */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        2. Informe técnico
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Redacta o adjunta el diagnóstico y trabajo final entregado.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const resumenItems = (ordenActiva?.items || [])
                          .map((i) => `• ${i.name} (x${i.qty || 1})`)
                          .join("\n");
                        const hallazgosTxt =
                          etapa3Hallazgos.length > 0
                            ? `\n\nHallazgos atendidos:\n` +
                              etapa3Hallazgos
                                .map((h) => `• [${h.vista.toUpperCase()}] ${h.descripcion}`)
                                .join("\n")
                            : "";
                        setEtapa7InformeTecnico(
                          `INFORME TÉCNICO DE ENTREGA - ORDEN #${
                            ordenActiva?.orderNumber || "OT"
                          }\nVehículo: ${ordenActiva?.vehicle || ""} (${
                            ordenActiva?.plate || ""
                          })\nTécnico Responsable: ${
                            ordenActiva?.mechanic || "Taller"
                          }\n\nTrabajos ejecutados:\n${
                            resumenItems || "• Revisión y mantenimiento general."
                          }${hallazgosTxt}\n\nRecomendaciones: Próximo control sugerido a los ${
                            ordenActiva?.nextOilChangeKm
                              ? `${ordenActiva.nextOilChangeKm.toLocaleString()} km`
                              : "+5,000 km"
                          }. Vehículo operativo y probado en pista.`
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 cursor-pointer shrink-0"
                    >
                      ⚡ Autocompletar
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    value={etapa7InformeTecnico}
                    onChange={(e) => setEtapa7InformeTecnico(e.target.value)}
                    placeholder="Describe el diagnóstico final, pruebas realizadas y recomendaciones para el cliente..."
                    className="w-full p-3 rounded-xl bg-[#111113] border border-white/10 focus:border-emerald-500/50 text-xs text-white leading-relaxed focus:outline-none resize-none"
                  />

                  {/* Subir archivo / foto del Informe Técnico a Cloudflare R2 */}
                  <div className="p-3 rounded-xl bg-[#111113] border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          Adjuntar Informe Técnico (PDF / Imagen)
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Sube el escaneo de escáner o hoja técnica a Cloudflare R2
                        </span>
                      </div>
                      <label className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer transition-all shrink-0">
                        {subiendoInformeEtapa7 ? "Subiendo..." : "📎 Adjuntar"}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleSubirInformeTecnicoEtapa7}
                          className="hidden"
                          disabled={subiendoInformeEtapa7}
                        />
                      </label>
                    </div>

                    {etapa7InformeAdjuntoUrl && (
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0a0a0a] border border-emerald-500/30 text-xs">
                        <a
                          href={etapa7InformeAdjuntoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-300 hover:underline truncate font-medium"
                        >
                          📄 Ver Informe Técnico Adjunto ↗
                        </a>
                        <button
                          type="button"
                          onClick={() => setEtapa7InformeAdjuntoUrl(null)}
                          className="text-rose-400 hover:text-rose-300 text-[11px] cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* =============================================================
                  PASO 3 (4 COLUMNAS): FIRMA EN EL TALLER O A DISTANCIA
                  ============================================================= */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      3. Firma en el taller o a distancia
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      El cliente firma en pantalla o recibe el enlace por correo/WhatsApp para firmar desde su celular.
                    </p>
                  </div>

                  {/* Lienzo de Firma Digital en Pantalla */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-200">
                        ✍️ Firma del cliente en pantalla:
                      </span>
                      <button
                        type="button"
                        onClick={limpiarCanvasFirmaEtapa7}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                      >
                        🗑️ Limpiar firma
                      </button>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-teal-500/30 bg-[#050505] relative">
                      <canvas
                        ref={canvasFirmaEtapa7Ref}
                        width={420}
                        height={150}
                        onMouseDown={iniciarTrazoFirmaEtapa7}
                        onMouseMove={moverTrazoFirmaEtapa7}
                        onMouseUp={terminarTrazoFirmaEtapa7}
                        onMouseLeave={terminarTrazoFirmaEtapa7}
                        onTouchStart={iniciarTrazoFirmaEtapa7}
                        onTouchMove={moverTrazoFirmaEtapa7}
                        onTouchEnd={terminarTrazoFirmaEtapa7}
                        className="w-full h-36 touch-none cursor-crosshair block"
                      />
                      {!etapa7FirmaDataUrl && (
                        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-zinc-600 uppercase tracking-widest">
                          Firme aquí con el dedo o mouse
                        </span>
                      )}
                    </div>

                    {etapa7FirmaDataUrl && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-emerald-300 font-semibold">
                          ✓ Firma capturada lista para el documento
                        </span>
                        <img
                          src={etapa7FirmaDataUrl}
                          alt="Firma del cliente"
                          className="h-8 bg-black/50 rounded px-1 object-contain"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">
                        Nombre de quien firma la conformidad
                      </label>
                      <input
                        type="text"
                        value={etapa7FirmadoPor}
                        onChange={(e) => setEtapa7FirmadoPor(e.target.value)}
                        placeholder={ordenActiva?.client || "Nombre y Apellido"}
                        className="w-full h-9 px-2.5 rounded-lg bg-[#111113] border border-white/10 text-xs text-white focus:outline-none focus:border-sky-500/50"
                      />
                    </div>
                  </div>

                  {/* Si el cliente NO está en el taller: Envío a distancia para firmar desde su celular */}
                  <div className="p-3 rounded-xl bg-[#111113] border border-sky-500/30 space-y-2.5">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        📲 ¿El cliente no está en el taller?
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Envíale la aceptación por correo o WhatsApp para que firme desde su celular:
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#0a0a0a] border border-white/10 font-mono text-[10px] text-sky-300 break-all">
                      {linkFirmaRemotaEtapa7}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleEnviarCorreoAceptacionEtapa7}
                        className="h-9 px-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>✉️ Enviar por Correo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEnviarWhatsAppAceptacionEtapa7}
                        className="h-9 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>💬 Enviar WhatsApp</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCopiarLinkFirmaEtapa7}
                        className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-[11px] font-semibold cursor-pointer"
                      >
                        {copiadoLinkFirmaEtapa7 ? "✓ Link Copiado" : "📋 Copiar Link"}
                      </button>

                      <a
                        href={linkFirmaRemotaEtapa7}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1"
                      >
                        <span>📱 Vista Celular ↗</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PIE DEL FLOTANTE 07 */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5 relative z-10">
              <button
                type="button"
                onClick={() => {
                  setMostrarFlotanteEtapa7(false);
                  setMostrarFlotanteEtapa6(true);
                }}
                className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                ← Volver a Etapa 6: Estado y aviso
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMostrarFlotanteEtapa7(false)}
                  className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="submit"
                  disabled={guardandoEtapa7}
                  className="h-11 px-6 rounded-xl bg-teal-500/25 hover:bg-teal-500/35 border border-teal-500/50 text-teal-200 hover:text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {guardandoEtapa7
                    ? "Guardando entrega..."
                    : "Guardar Entrega y Continuar a Etapa 8: Cobro →"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          FLOTANTE 08 — ETAPA 8: COBRO Y DOCUMENTO
          (1. Abonos y saldo pendiente, 2. Link de pago pasarela, 3. PDF con logo, ticket térmico y etiqueta QR)
          ===================================================================== */}
      {mostrarFlotanteEtapa8 && (
        <div
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setMostrarFlotanteEtapa8(false)}
        >
          <form
            onSubmit={handleGuardarEtapa8CobroDocumento}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-6xl max-h-[94vh] overflow-y-auto p-5 sm:p-7 shadow-2xl space-y-5 relative"
          >
            {/* Resplandor superior */}
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-25 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 70%)",
              }}
            />

            {/* Encabezado Flotante 08 */}
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg flex flex-col items-center justify-center shrink-0 border border-white/10">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-100/90 leading-none">
                    ETAPA
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white leading-tight">
                    08
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      Etapa 8: Cobro y documento
                    </span>
                    {ordenActiva && (
                      <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-200 border border-white/10">
                        #{ordenActiva.orderNumber} • {ordenActiva.plate} •{" "}
                        {ordenActiva.client}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        calculosCobroEtapa8.saldoPendiente <= 0 &&
                        calculosCobroEtapa8.totalOrden > 0
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {calculosCobroEtapa8.saldoPendiente <= 0 &&
                      calculosCobroEtapa8.totalOrden > 0
                        ? "✓ Orden Pagada al 100%"
                        : `Saldo Pendiente: $${calculosCobroEtapa8.saldoPendiente.toFixed(2)}`}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Cobra y entrega el documento que necesites.
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 max-w-3xl leading-relaxed">
                    Registras abonos y pagos con la forma de pago que corresponda, y el
                    saldo pendiente se actualiza solo. Imprimes la orden en PDF con tu
                    logo, ticket térmico o etiqueta con QR.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarFlotanteEtapa8(false)}
                className="w-9 h-9 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* 3 Pilares Clave de la Etapa 8 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </span>
                <span className="text-xs font-medium text-zinc-200">
                  Abonos y saldo pendiente
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </span>
                <span className="text-xs font-medium text-zinc-200">
                  Link de pago si conectas una pasarela
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#0a0a0a] border border-white/5">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </span>
                <span className="text-xs font-medium text-zinc-200">
                  PDF, ticket térmico y etiqueta QR
                </span>
              </div>
            </div>

            {/* CUERPO EN 3 COLUMNAS: 1. ABONOS Y SALDO, 2. PASARELA DE PAGO, 3. DOCUMENTOS IMPRIMIBLES */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
              {/* =============================================================
                  COLUMNA 1 (5 COLUMNAS): ABONOS Y SALDO PENDIENTE AUTOMÁTICO
                  ============================================================= */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      1. Abonos y saldo pendiente
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Registra anticipos, abonos o el pago total; el saldo se recalcula al instante.
                    </p>
                  </div>

                  {/* Resumen numérico en vivo */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#111113] border border-white/5">
                      <span className="text-[10px] text-zinc-400 uppercase block">
                        Total Orden
                      </span>
                      <strong className="text-sm sm:text-base font-mono font-bold text-white">
                        ${calculosCobroEtapa8.totalOrden.toFixed(2)}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#111113] border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 uppercase block">
                        Abonado
                      </span>
                      <strong className="text-sm sm:text-base font-mono font-bold text-emerald-400">
                        ${calculosCobroEtapa8.totalAbonado.toFixed(2)}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#111113] border border-amber-500/30">
                      <span className="text-[10px] text-amber-400 uppercase block">
                        Saldo
                      </span>
                      <strong className="text-sm sm:text-base font-mono font-bold text-amber-300">
                        ${calculosCobroEtapa8.saldoPendiente.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Barra de progreso de pago */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Avance de cobro</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {calculosCobroEtapa8.porcentajePagado}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                        style={{ width: `${calculosCobroEtapa8.porcentajePagado}%` }}
                      />
                    </div>
                  </div>

                  {/* Formulario para agregar abono / pago */}
                  <div className="p-3 rounded-xl bg-[#111113] border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        Registrar nuevo abono o pago
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setEtapa8MontoAbono(
                              (calculosCobroEtapa8.saldoPendiente / 2).toFixed(2)
                            )
                          }
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300 cursor-pointer"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEtapa8MontoAbono(
                              calculosCobroEtapa8.saldoPendiente.toFixed(2)
                            )
                          }
                          className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-300 font-semibold cursor-pointer"
                        >
                          100% Saldo
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">
                          Monto ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={etapa8MontoAbono}
                          onChange={(e) => setEtapa8MontoAbono(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-9 px-2.5 rounded-lg bg-[#0a0a0a] border border-white/10 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">
                          Forma de pago
                        </label>
                        <select
                          value={etapa8MetodoPago}
                          onChange={(e) => setEtapa8MetodoPago(e.target.value)}
                          className="w-full h-9 px-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                        >
                          <option value="Efectivo">💵 Efectivo</option>
                          <option value="Transferencia Bancaria">
                            🏦 Transferencia Bancaria
                          </option>
                          <option value="Tarjeta de Crédito / Débito">
                            💳 Tarjeta Crédito / Débito
                          </option>
                          <option value="Deuna / PayPhone">📱 Deuna / PayPhone</option>
                          <option value="Cheque / Crédito">📄 Cheque / Crédito</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={etapa8ReferenciaPago}
                        onChange={(e) => setEtapa8ReferenciaPago(e.target.value)}
                        placeholder="N° Comprobante / Ref."
                        className="w-full h-8 px-2.5 rounded-lg bg-[#0a0a0a] border border-white/10 text-[11px] text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={etapa8NotaPago}
                        onChange={(e) => setEtapa8NotaPago(e.target.value)}
                        placeholder="Nota (ej: Anticipo 50%)"
                        className="w-full h-8 px-2.5 rounded-lg bg-[#0a0a0a] border border-white/10 text-[11px] text-white focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleRegistrarAbonoPagoEtapa8}
                      className="w-full h-9 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold transition-all cursor-pointer active:scale-95"
                    >
                      + Registrar Abono / Pago
                    </button>
                  </div>

                  {/* Historial de abonos de la orden */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-zinc-400 block">
                      Pagos y abonos registrados ({etapa8PagosLista.length}):
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                      {etapa8PagosLista.length > 0 ? (
                        etapa8PagosLista.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 rounded-lg bg-[#111113] border border-white/5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-emerald-400">
                                  ${Number(p.amount).toFixed(2)}
                                </span>
                                <span className="text-white font-medium truncate">
                                  • {p.method}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500 block truncate">
                                {p.date} {p.reference ? `• Ref: ${p.reference}` : ""}{" "}
                                {p.note ? `(${p.note})` : ""}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEliminarPagoEtapa8(p.id)}
                              className="text-rose-400 hover:text-rose-300 text-[11px] px-1.5 cursor-pointer shrink-0"
                              title="Eliminar abono"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-zinc-500 py-1.5">
                          Aún no se han registrado abonos en esta orden.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* =============================================================
                  COLUMNA 2 (3 COLUMNAS): LINK DE PAGO SI CONECTAS UNA PASARELA
                  ============================================================= */}
              <div className="lg:col-span-3 space-y-4">
                <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      2. Link de pago pasarela
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Comparte un link de cobro en línea con el saldo pendiente.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">
                      Pasarela conectada
                    </label>
                    <select
                      value={etapa8PasarelaNombre}
                      onChange={(e) => setEtapa8PasarelaNombre(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#111113] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="PayPhone / Deuna">📱 PayPhone / Deuna</option>
                      <option value="Stripe / Tarjeta Online">
                        💳 Stripe / Tarjeta Online
                      </option>
                      <option value="Kushki / Datafast">🏦 Kushki / Datafast</option>
                      <option value="MercadoPago / PayPal">🌎 MercadoPago / PayPal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">
                      Link de pasarela externo (opcional)
                    </label>
                    <input
                      type="text"
                      value={etapa8PasarelaUrl}
                      onChange={(e) => setEtapa8PasarelaUrl(e.target.value)}
                      placeholder="https://pay.tu-pasarela.com/..."
                      className="w-full h-9 px-2.5 rounded-lg bg-[#111113] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#111113] border border-indigo-500/30 space-y-2">
                    <span className="text-[10px] text-indigo-300 font-semibold block">
                      Link activo por ${calculosCobroEtapa8.saldoPendiente.toFixed(2)}:
                    </span>
                    <div className="p-2 rounded-lg bg-[#0a0a0a] border border-white/5 font-mono text-[10px] text-indigo-300 break-all">
                      {linkPagoPasarelaEtapa8}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopiarLinkPagoEtapa8}
                      className="w-full h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-[11px] font-semibold cursor-pointer"
                    >
                      {copiadoLinkPagoEtapa8 ? "✓ Link Copiado" : "📋 Copiar Link de Pago"}
                    </button>
                    <button
                      type="button"
                      onClick={handleEnviarLinkPagoWhatsAppEtapa8}
                      className="w-full h-9 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-semibold cursor-pointer active:scale-95"
                    >
                      💬 Enviar Link de Pago por WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              {/* =============================================================
                  COLUMNA 3 (4 COLUMNAS): PDF CON TU LOGO, TICKET TÉRMICO Y ETIQUETA QR
                  ============================================================= */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      3. PDF, ticket térmico y etiqueta QR
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Imprime al instante el documento que necesites entregar al cliente.
                    </p>
                  </div>

                  {/* Opción 1: Orden en PDF con tu logo */}
                  <button
                    type="button"
                    onClick={handleImprimirOrdenPdfConLogoEtapa8}
                    className="w-full p-3.5 rounded-xl bg-[#111113] hover:bg-[#161618] border border-white/10 hover:border-blue-500/40 text-left flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-lg shrink-0">
                        📄
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-white block group-hover:text-blue-300">
                          Orden en PDF con tu Logo
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Formato A4 con servicios, abonos, firma y QR
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-400 shrink-0">
                      Imprimir ↗
                    </span>
                  </button>

                  {/* Opción 2: Ticket Térmico 80mm */}
                  <button
                    type="button"
                    onClick={handleImprimirTicketTermicoEtapa8}
                    className="w-full p-3.5 rounded-xl bg-[#111113] hover:bg-[#161618] border border-white/10 hover:border-emerald-500/40 text-left flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
                        🧾
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-white block group-hover:text-emerald-300">
                          Ticket Térmico (80mm)
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Tirilla rápida de caja con abonos, saldo y QR
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 shrink-0">
                      Imprimir ↗
                    </span>
                  </button>

                  {/* Opción 3: Etiqueta Adhesiva con QR */}
                  <button
                    type="button"
                    onClick={handleImprimirEtiquetaQrEtapa8}
                    className="w-full p-3.5 rounded-xl bg-[#111113] hover:bg-[#161618] border border-white/10 hover:border-amber-500/40 text-left flex items-center justify-between gap-3 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
                        🏷️
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-white block group-hover:text-amber-300">
                          Etiqueta con QR (Parabrisas / Llave)
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Placa, Km actual, próximo servicio y QR en vivo
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-400 shrink-0">
                      Imprimir ↗
                    </span>
                  </button>

                  {/* Conexión directa con POS / Facturación */}
                  <div className="pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarFlotanteEtapa8(false);
                        handleEnviarAPosCaja();
                      }}
                      className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/35 hover:to-teal-500/35 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>💳 Enviar a Caja POS / Emitir Factura</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PIE DEL FLOTANTE 08 */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5 relative z-10">
              <button
                type="button"
                onClick={() => {
                  setMostrarFlotanteEtapa8(false);
                  setMostrarFlotanteEtapa7(true);
                }}
                className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                ← Volver a Etapa 7: Entrega y firma
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMostrarFlotanteEtapa8(false)}
                  className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  type="submit"
                  disabled={guardandoEtapa8}
                  className="h-11 px-6 rounded-xl bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-500/50 text-indigo-200 hover:text-white text-xs sm:text-sm font-semibold shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {guardandoEtapa8
                    ? "Guardando cobro..."
                    : "Guardar Cobro y Finalizar Orden ✓"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <TallerMobileNav />
    </div>
  );
}
