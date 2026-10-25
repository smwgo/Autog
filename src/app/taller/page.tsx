"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";
import InspeccionVehiculo from "@/components/taller/InspeccionVehiculo";
import ModalNuevaOrdenTrabajo from "@/components/taller/ModalNuevaOrdenTrabajo";
import ModalPresupuestoPdf from "@/components/taller/ModalPresupuestoPdf";
import LubricentroExpress from "./components/LubricentroExpress";
import { getClientActiveBranch, getClientUserBranch } from "@/lib/branch";
import { VoiceNoteRecord } from "@/lib/transcription";

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
  completed?: boolean;
  productId?: string;
  imageUrl?: string | null;
  empleado_id?: string;
  empleado_nombre?: string;
}

export interface UnifiedOrder {
  id: string;
  orderNumber: string;
  workshopName?: string;
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
  voiceNotes?: VoiceNoteRecord[];
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
  quoteSignatureUrl?: string | null;
  quoteSignedBy?: string;
  deliverySignedAt?: string | null;
  deliveryStatus?: string;
  receptionSignatureUrl?: string | null;
  receptionSignedAt?: string | null;
  payments?: OrderPaymentItem[];
  totalPaid?: number;
  balanceDue?: number;
  paymentGatewayUrl?: string;
  posRequestId?: string | null;
  stockDeducted?: boolean;
  branch?: string;
  transferredFrom?: string | null;
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

export interface FindingItemLink {
  id: string;
  name: string;
  price: number;
  type: "SERVICE" | "PART";
  qty: number;
}

export interface InspectionFinding {
  id: string;
  vista: "frontal" | "trasera" | "lateral_izq" | "lateral_der" | "superior" | "motor" | "frenos" | "suspension" | "electrico" | string;
  vistaLabel: string;
  x: number;
  y: number;
  zona: string;
  tipo: string;
  descripcion: string;
  pinNumber?: number;
  photoUrl?: string;
  photoUrls?: string[];
  audioUrl?: string;
  capturedAt?: string;
  severidad?: "LEVE" | "MODERADO" | "GRAVE" | string;
  linkedItems?: FindingItemLink[];
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
  { id: "st-1", name: "01 Pendiente", color: "amber", progress: 10 },
  { id: "st-2", name: "02 En Diagnóstico", color: "blue", progress: 30 },
  { id: "st-3", name: "03 En Reparación", color: "rose", progress: 60 },
  { id: "st-4", name: "04 Listo para Entrega", color: "emerald", progress: 90 },
  { id: "st-5", name: "05 Entregada", color: "purple", progress: 100 },
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
// CATÁLOGO RÁPIDO DE LAS TARJETAS DE TALLER MECÁNICO (GLASSMORPHISM)
// ============================================================================
const SERVICE_CARDS = [
  {
    id: "diagnostico",
    title: "Diagnóstico y Escáner",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3m6 6h6" />
      </svg>
    ),
    presets: [
      { code: "DIA-001", name: "Escáner", price: 20.0, subCategory: "Diagnóstico" },
      { code: "DIA-002", name: "Diagnóstico", price: 18.0, subCategory: "Diagnóstico" },
      { code: "DIA-003", name: "Compresión", price: 25.0, subCategory: "Diagnóstico" },
      { code: "DIA-004", name: "Vacío", price: 20.0, subCategory: "Diagnóstico" },
      { code: "DIA-005", name: "Inspección", price: 30.0, subCategory: "Diagnóstico" },
    ] as ServicePreset[],
  },
  {
    id: "mantenimiento",
    title: "Mantenimiento y Afinamiento",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39" />
      </svg>
    ),
    presets: [
      { code: "MAN-001", name: "Afinamiento", price: 35.0, subCategory: "Afinamiento" },
      { code: "MAN-002", name: "Inyectores", price: 30.0, subCategory: "Afinamiento" },
      { code: "MAN-003", name: "Aceleración", price: 20.0, subCategory: "Afinamiento" },
      { code: "MAN-004", name: "Bujías", price: 18.0, subCategory: "Afinamiento" },
      { code: "MAN-005", name: "Mantenimiento", price: 40.0, subCategory: "General" },
      { code: "MAN-006", name: "Filtros", price: 15.0, subCategory: "General" },
    ] as ServicePreset[],
  },
  {
    id: "frenos",
    title: "Frenos",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
        <path d="M5 12a7 7 0 0 1 7-7" />
        <path d="M19 12a7 7 0 0 1-7 7" />
      </svg>
    ),
    presets: [
      { code: "FRE-001", name: "Pastillas", price: 25.0, subCategory: "Frenos" },
      { code: "FRE-002", name: "Discos", price: 30.0, subCategory: "Frenos" },
      { code: "FRE-003", name: "Zapatas", price: 28.0, subCategory: "Frenos" },
      { code: "FRE-004", name: "Líquido", price: 18.0, subCategory: "Frenos" },
      { code: "FRE-005", name: "Frenos", price: 45.0, subCategory: "Frenos" },
      { code: "FRE-006", name: "Caliper", price: 35.0, subCategory: "Frenos" },
    ] as ServicePreset[],
  },
  {
    id: "motor",
    title: "Motor",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M8 6V4m8 2V4m4 6h2m-2 4h2M2 10h2m-2 4h2m4-1v2m8-2v2" />
      </svg>
    ),
    presets: [
      { code: "MOT-001", name: "Cambio de faja / kit de distribución", price: 75.0, subCategory: "Distribución" },
      { code: "MOT-002", name: "Cambio de empaquetadura tapa válvulas", price: 30.0, subCategory: "Empaquetaduras" },
      { code: "MOT-003", name: "Cambio de retenes cigüeñal / árbol levas", price: 40.0, subCategory: "Retenes" },
      { code: "MOT-004", name: "Reparación y cepillado de culata", price: 120.0, subCategory: "Motor Mayor" },
      { code: "MOT-005", name: "Cambio de bomba de agua y termostato", price: 45.0, subCategory: "Refrigeración" },
      { code: "MOT-006", name: "Reparación completa de motor (Overhaul)", price: 300.0, subCategory: "Motor Mayor" },
    ] as ServicePreset[],
  },
  {
    id: "suspension",
    title: "Suspensión y Dirección",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v3m0 14v3M9 5h6m-5 4 4-2m-4 4 4-2m-4 4 4-2m-4 4 4-2m-1 3h6" />
      </svg>
    ),
    presets: [
      { code: "SUS-001", name: "Cambio de amortiguadores delanteros (par)", price: 40.0, subCategory: "Suspensión" },
      { code: "SUS-002", name: "Cambio de amortiguadores posteriores (par)", price: 35.0, subCategory: "Suspensión" },
      { code: "SUS-003", name: "Cambio de terminales y rótulas dirección", price: 30.0, subCategory: "Dirección" },
      { code: "SUS-004", name: "Cambio de bujes trapecio / barra estabilizadora", price: 35.0, subCategory: "Suspensión" },
      { code: "SUS-005", name: "Reparación / Cambio cremallera de dirección", price: 80.0, subCategory: "Dirección" },
      { code: "SUS-006", name: "Alineación computarizada y balanceo", price: 25.0, subCategory: "Dirección" },
    ] as ServicePreset[],
  },
  {
    id: "electrico",
    title: "Sistema Eléctrico",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    presets: [
      { code: "ELE-001", name: "Diagnóstico y cambio de batería", price: 12.0, subCategory: "Batería" },
      { code: "ELE-002", name: "Mantenimiento / Reparación de alternador", price: 45.0, subCategory: "Carga" },
      { code: "ELE-003", name: "Mantenimiento motor de arranque", price: 45.0, subCategory: "Arranque" },
      { code: "ELE-004", name: "Reparación de cableado y cortocircuitos", price: 30.0, subCategory: "Cableado" },
      { code: "ELE-005", name: "Diagnóstico de sensores (Oxígeno, MAF, CKP)", price: 25.0, subCategory: "Sensores" },
      { code: "ELE-006", name: "Regulación y cambio de faros / focos", price: 15.0, subCategory: "Iluminación" },
    ] as ServicePreset[],
  },
  {
    id: "transmision",
    title: "Transmisión y Embrague",
    color: "bg-white/5",
    gradient: "from-white/10 to-white/5",
    glowColor: "rgba(255, 255, 255, 0.04)",
    icon: (
      <svg className="w-6 h-6 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="4" />
        <circle cx="16" cy="16" r="4" />
        <path d="M11 11l2 2" />
      </svg>
    ),
    presets: [
      { code: "TRA-001", name: "Cambio de kit de embrague (disco, plato, collarín)", price: 80.0, subCategory: "Embrague" },
      { code: "TRA-002", name: "Bajada y reparación de caja mecánica", price: 95.0, subCategory: "Caja" },
      { code: "TRA-003", name: "Cambio de guardapolvos y puntas de palier", price: 35.0, subCategory: "Transmisión" },
      { code: "TRA-004", name: "Cambio de bomba / bombín de embrague", price: 25.0, subCategory: "Embrague" },
      { code: "TRA-005", name: "Mantenimiento de caja automática (ATF)", price: 50.0, subCategory: "Caja" },
      { code: "TRA-006", name: "Cambio de crucetas y cardán", price: 35.0, subCategory: "Transmisión" },
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

function formatearFechaCompleta(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
  } catch {
    return String(dateStr);
  }
}

function formatearFechaIngreso(dateStr?: string | null): string {
  if (!dateStr) return "Hoy";
  try {
    const ingreso = new Date(dateStr);
    if (isNaN(ingreso.getTime())) return String(dateStr);

    const ahora = new Date();
    // Cálculo de días calendario exactos entre la fecha de ingreso y hoy
    const fechaIngresoZero = new Date(ingreso.getFullYear(), ingreso.getMonth(), ingreso.getDate());
    const fechaAhoraZero = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const diffDias = Math.round((fechaAhoraZero.getTime() - fechaIngresoZero.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) {
      return "Hoy";
    }
    if (diffDias === 1) {
      return "Ayer";
    }
    if (diffDias >= 2 && diffDias <= 6) {
      return `${diffDias} días`;
    }
    if (diffDias >= 7 && diffDias <= 13) {
      return "1 semana";
    }
    if (diffDias >= 14 && diffDias <= 20) {
      return "Quincena";
    }
    if (diffDias >= 21 && diffDias <= 27) {
      return "3 semanas";
    }
    const diffMeses = Math.floor(diffDias / 30);
    if (diffMeses <= 1) {
      return "1 mes";
    }
    if (diffMeses < 12) {
      return `${diffMeses} meses`;
    }
    const diffAnios = Math.floor(diffDias / 365);
    return diffAnios === 1 ? "1 año" : `${diffAnios} años`;
  } catch {
    return "Hoy";
  }
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

  // SELECTOR SUPERIOR 4 EN 1: TALLER MECÁNICO, LUBRICENTRO, CAR WASH Y TECNICENTRO
  const [moduloTaller, setModuloTaller] = useState<"taller" | "lubricentro" | "carwash" | "tecnicentro">("taller");

  // FLOTANTE NUEVA ORDEN DE TRABAJO (SOLO SE ABRE AL PULSAR BOTÓN NUEVA ORDEN)
  const [mostrarModalNuevaOrden, setMostrarModalNuevaOrden] = useState(false);
  // MODAL / LISTA DE CLIENTES Y AUTOS EN ATENCIÓN (PAUSAR, CAMBIAR, CONTINUAR)
  const [mostrarModalAutosAtencion, setMostrarModalAutosAtencion] = useState(false);

  // Pausar el trabajo de una orden para seguir con otra
  const handlePausarOrden = async (auto: UnifiedOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTUALIZAR_ORDEN",
          orderId: auto.id,
          status: "Pausada",
        }),
      });
      const data = await res.json();
      const updated = data.success && data.activeOrder ? data.activeOrder : { ...auto, status: "Pausada" };
      setAutosEnPista((prev) => prev.map((o) => (o.id === auto.id ? updated : o)));
      if (ordenActiva?.id === auto.id) {
        setOrdenActiva(updated);
      }
      mostrarToast(`Trabajo de ${auto.plate} pausado`);
    } catch {
      mostrarToast("No se pudo pausar la orden", "err");
    }
  };

  // Reanudar el trabajo de una orden pausada y seleccionarla
  const handleReanudarOrden = async (auto: UnifiedOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTUALIZAR_ORDEN",
          orderId: auto.id,
          status: "En Proceso",
          startTimer: !auto.startedAt,
        }),
      });
      const data = await res.json();
      const updated = data.success && data.activeOrder ? data.activeOrder : { ...auto, status: "En Proceso" };
      setAutosEnPista((prev) => prev.map((o) => (o.id === auto.id ? updated : o)));
      setOrdenActiva(updated);
      setKmActualInput(updated.mileage ? String(updated.mileage) : "");
      setFotosRecepcion(updated.receptionPhotos || []);
      setMostrarModalAutosAtencion(false);
      mostrarToast(`Trabajo reanudado para ${auto.plate}`);
    } catch {
      mostrarToast("No se pudo reanudar la orden", "err");
    }
  };

  // Seleccionar auto de la lista y volver a la vista
  const handleSeleccionarAutoYVolver = (auto: UnifiedOrder) => {
    setOrdenActiva(auto);
    setKmActualInput(auto.mileage ? String(auto.mileage) : "");
    setFotosRecepcion(auto.receptionPhotos || []);
    setMostrarModalAutosAtencion(false);
    mostrarToast(`Atendiendo a ${auto.client} (${auto.plate})`);
  };

  // Marcar trabajo como terminado totalmente y enviarlo a Historial de Órdenes en Panel Órdenes
  const handleFinalizarOrdenAHistorial = async (auto: UnifiedOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();

    setAutosEnPista((prev) => {
      const restantes = prev.filter((o) => o.id !== auto.id);
      if (ordenActiva?.id === auto.id) {
        const siguiente = restantes[0] || null;
        setOrdenActiva(siguiente);
        setKmActualInput(siguiente?.mileage ? String(siguiente.mileage) : "");
        setFotosRecepcion(siguiente?.receptionPhotos || []);
        if (typeof window !== "undefined") {
          try {
            if (siguiente?.id) {
              localStorage.setItem("taller_orden_activa_id", siguiente.id);
            } else {
              localStorage.removeItem("taller_orden_activa_id");
            }
          } catch {}
        }
      }
      return restantes;
    });

    try {
      await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FINALIZAR_ORDEN_HISTORIAL",
          orderId: auto.id,
        }),
      });
    } catch (err) {
      console.error("Error al finalizar orden a historial:", err);
    }
  };

  // Transferir orden de trabajo entre Principal y Sucursal
  const handleTransferirOrdenSucursal = async (auto: UnifiedOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFERIR_ORDEN_SUCURSAL",
          orderId: auto.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await cargarOperacionInicial(true);
      }
    } catch (err) {
      console.error("Error al transferir orden entre sedes:", err);
    }
  };

  const handleOrdenCreadaDesdeModal = (
    nuevaOrden: UnifiedOrder,
    cliente?: any,
    tipo?: "Taller" | "Lubricentro" | "Lavado"
  ) => {
    setOrdenActiva(nuevaOrden);
    setAutosEnPista((prev) => [
      nuevaOrden,
      ...prev.filter((o) => o.id !== nuevaOrden.id),
    ]);
    if (cliente) {
      setClientesCatalogo((prev) => [
        cliente,
        ...prev.filter((c) => c.id !== cliente.id),
      ]);
    }

    // Sincronizar campos de ingreso táctil en el panel principal
    if (nuevaOrden.fuelLevel) {
      setEtapa2NivelCombustible(nuevaOrden.fuelLevel);
    }
    if (nuevaOrden.mileage) {
      setEtapa2Kilometraje(String(nuevaOrden.mileage));
      setKmActualInput(String(nuevaOrden.mileage));
    }
    if (Array.isArray(nuevaOrden.receptionInventory)) {
      setEtapa2InventarioTrae(nuevaOrden.receptionInventory);
    }
    if (Array.isArray(nuevaOrden.receptionPhotos)) {
      setFotosRecepcion(nuevaOrden.receptionPhotos);
    }

    // Si la orden se creó como Lubricentro o Lavado, abrir directamente su categoría
    if (
      tipo === "Lubricentro" ||
      nuevaOrden?.notes?.includes("[Lubricentro]") ||
      (nuevaOrden as any)?.motivoIngreso?.includes("[Lubricentro]")
    ) {
      setModuloTaller("lubricentro");
    } else if (
      tipo === "Lavado" ||
      nuevaOrden?.notes?.includes("[Lavado]") ||
      (nuevaOrden as any)?.motivoIngreso?.includes("[Lavado]")
    ) {
      setModuloTaller("carwash");
    } else {
      setModuloTaller("taller");
    }
    setEtapaActiva(2);
  };

  // ==========================================================================
  // FLOTANTE 01 - ETAPA 1: CLIENTE
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
    "Matrícula",
    "Repuesto",
    "Gata",
    "Llave",
  ]);
  const [itemManualInventario, setItemManualInventario] = useState("");
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
  const [modalPresupuestoPdfAbierto, setModalPresupuestoPdfAbierto] = useState(false);
  const [pinCotizandoId, setPinCotizandoId] = useState<string | null>(null);
  const [cotizarPinNombre, setCotizarPinNombre] = useState("");
  const [cotizarPinPrecio, setCotizarPinPrecio] = useState("");
  const [cotizarPinTipo, setCotizarPinTipo] = useState<"SERVICE" | "PART">("SERVICE");
  const [cotizarBuscadorFiltro, setCotizarBuscadorFiltro] = useState<"ALL" | "SERVICE" | "PART">("ALL");
  const [dropdownBuscadorPinAbierto, setDropdownBuscadorPinAbierto] = useState(false);
  const [dropdownCatalogoAbierto, setDropdownCatalogoAbierto] = useState(false);
  const [etapa4FiltroTipo, setEtapa4FiltroTipo] = useState<"ALL" | "SERVICE" | "PART">("ALL");

  // ==========================================================================
  // FLOTANTE 05 - ETAPA 5: REPARACIÓN
  // (Múltiples técnicos con aviso, Fotos del avance, Notas de voz y chat interno, Horas por técnico)
  // ==========================================================================
  const [mostrarFlotanteEtapa5, _setMostrarFlotanteEtapa5] = useState(false);
  const setMostrarFlotanteEtapa5 = (val: boolean) => { _setMostrarFlotanteEtapa5(val); if (val) setEtapaActiva(5); };
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
  const [modoFirma, setModoFirma] = useState<"ACEPTACION" | "ENTREGA">("ACEPTACION");
  const [firmaAceptacionDataUrl, setFirmaAceptacionDataUrl] = useState<string | null>(null);
  const [firmaEntregaDataUrl, setFirmaEntregaDataUrl] = useState<string | null>(null);
  const [guardandoPasarPos, setGuardandoPasarPos] = useState<boolean>(false);
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

  // Flujo Deslizable Automático de 3 Etapas (Inspección, Presupuesto, Firma)
  const [etapaActiva, setEtapaActiva] = useState<number>(2);
  const [mostrarCabeceraMovil, setMostrarCabeceraMovil] = useState(true);
  const stepperCarouselRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStepperScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) return;
    const container = e.currentTarget;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const width = container.clientWidth;
      if (width > 0) {
        const pageIndex = Math.round(container.scrollLeft / width);
        const steps = [2, 4];
        const targetStep = steps[pageIndex];
        if (targetStep && targetStep !== etapaActiva) {
          setEtapaActiva(targetStep);
        }
      }
    }, 80);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640 && stepperCarouselRef.current) {
      const container = stepperCarouselRef.current;
      const el = document.getElementById(`stepper-step-${etapaActiva}`);
      if (el) {
        const targetLeft = el.offsetLeft - container.offsetLeft;
        container.scrollTo({ left: targetLeft, behavior: "smooth" });
      }
    }
  }, [etapaActiva]);
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
    else setEtapaActiva(5);
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
  const [modalYaPasadaPos, setModalYaPasadaPos] = useState(false);

  const fileInputRecepcionRef = useRef<HTMLInputElement | null>(null);
  const fileInputEvidenciaRef = useRef<HTMLInputElement | null>(null);
  const ordenesCarouselRef = useRef<HTMLDivElement | null>(null);
  const ordenesCarouselScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback((_texto: string, _tipo: "ok" | "err" = "ok") => {
    // Desactivado: sin etiquetas flotantes verde ni roja al realizar acciones
  }, []);

  // Número de veces que se ha atendido el cliente / vehículo
  const [vecesAtendido, setVecesAtendido] = useState<number>(1);

  useEffect(() => {
    if (!ordenActiva?.plate) return;
    let cancel = false;
    fetch(`/api/taller/operacion?q=${encodeURIComponent(ordenActiva.plate)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancel) return;
        const countHistory = Array.isArray(data.history) ? data.history.length : 0;
        const total = countHistory > 0 ? countHistory + 1 : 1;
        setVecesAtendido(total);
        if (data.history) setHistorialVehiculo(data.history);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [ordenActiva?.id, ordenActiva?.plate]);

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
      const uBranch = getClientUserBranch();
      const sActiva = getClientActiveBranch("/taller");
      const res = await fetch(`/api/taller/operacion?sede=${sActiva}&userBranch=${uBranch}`);
      if (!res.ok) {
        console.warn(`Respuesta no exitosa al cargar taller (${res.status})`);
        return false;
      }
      const data = await res.json();
      if (data.success) {
        const pista: UnifiedOrder[] = data.autosEnPista || [];
        setAutosEnPista(pista);
        try {
          localStorage.setItem(
            "taller_pista_cache",
            JSON.stringify(pista.map((o) => ({ ...o, receptionPhotos: [] })))
          );
        } catch {}
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
            let targetOrder: UnifiedOrder | null = null;
            if (typeof window !== "undefined") {
              try {
                const savedId = localStorage.getItem("taller_orden_activa_id");
                if (savedId) {
                  targetOrder = pista.find((o) => o.id === savedId) || null;
                }
              } catch {}
            }
            if (!targetOrder && prev) {
              targetOrder = pista.find((o) => o.id === prev.id || o.orderNumber === prev.orderNumber) || null;
            }
            const finalOrder = targetOrder || pista[0];
            setFotosRecepcion(finalOrder.receptionPhotos || []);
            setKmActualInput(finalOrder.mileage ? String(finalOrder.mileage) : "");
            return finalOrder;
          });
        } else if (selectFirstIfNone && pista.length === 0) {
          setOrdenActiva(null);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error cargando operación de taller:", err);
      return false;
    } finally {
      setCargandoInicial(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("taller_pista_cache") || "null");
      if (Array.isArray(cached) && cached.length > 0) {
        const savedId = localStorage.getItem("taller_orden_activa_id");
        setAutosEnPista((prev) => (prev.length > 0 ? prev : cached));
        setOrdenActiva((prev) => prev || cached.find((o: UnifiedOrder) => o.id === savedId) || cached[0]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cargado = false;
    cargarOperacionInicial(true).then((ok) => {
      cargado = ok;
    });
    const retryTimer = setTimeout(() => {
      if (!cargado) cargarOperacionInicial(true);
    }, 1500);
    const handleBranchChange = () => cargarOperacionInicial(true);
    window.addEventListener("autog-branch-change", handleBranchChange);
    return () => {
      clearTimeout(retryTimer);
      window.removeEventListener("autog-branch-change", handleBranchChange);
    };
  }, [cargarOperacionInicial]);

  useEffect(() => {
    if (typeof window !== "undefined" && ordenActiva?.id) {
      try {
        localStorage.setItem("taller_orden_activa_id", ordenActiva.id);
      } catch {}
    }
  }, [ordenActiva?.id]);

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
    const nuevaLista = etapa2InventarioTrae.includes(item)
      ? etapa2InventarioTrae.filter((i) => i !== item)
      : [...etapa2InventarioTrae, item];
    setEtapa2InventarioTrae(nuevaLista);
    if (ordenActiva) {
      void sincronizarOrdenEnNeon({ receptionInventory: nuevaLista });
    }
  };

  const handleAgregarItemManualInventario = () => {
    const val = itemManualInventario.trim();
    if (!val) return;
    if (!etapa2InventarioTrae.includes(val)) {
      const nuevaLista = [...etapa2InventarioTrae, val];
      setEtapa2InventarioTrae(nuevaLista);
      if (ordenActiva) {
        void sincronizarOrdenEnNeon({ receptionInventory: nuevaLista });
      }
    }
    setItemManualInventario("");
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
    setEtapa2NivelCombustible(ordenActiva.fuelLevel || "1/2");
    setEtapa2Kilometraje(ordenActiva.mileage ? String(ordenActiva.mileage) : "");
    setEtapa2InventarioTrae(
      Array.isArray(ordenActiva.receptionInventory) && ordenActiva.receptionInventory.length > 0
        ? ordenActiva.receptionInventory
        : ["Matrícula", "Repuesto", "Gata", "Llave"]
    );
    setFotosRecepcion(Array.isArray(ordenActiva.receptionPhotos) ? ordenActiva.receptionPhotos : []);
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

  // Catálogo combinado de Servicios y Repuestos para el buscador inteligente de cotización de hallazgos
  const catalogoItemsCotizar = useMemo(() => {
    const lista: { name: string; price: number; type: "SERVICE" | "PART"; category: string }[] = [];
    const vistos = new Set<string>();

    SERVICE_CARDS.forEach((card) => {
      card.presets.forEach((p) => {
        const key = p.name.toLowerCase().trim();
        if (!vistos.has(key)) {
          vistos.add(key);
          lista.push({
            name: p.name,
            price: Number(p.price) || 20,
            type: card.id === "repuestos" ? "PART" : "SERVICE",
            category: card.title,
          });
        }
      });
    });

    const repuestosComunes = [
      { name: "Pintura", price: 40, category: "Pintura" },
      { name: "Masilla", price: 15, category: "Carrocería" },
      { name: "Desabollado", price: 35, category: "Carrocería" },
      { name: "Pulido", price: 15, category: "Carrocería" },
      { name: "Enderezada", price: 45, category: "Carrocería" },
      { name: "Inspección", price: 30, category: "Diagnóstico" },
      { name: "Escáner", price: 20, category: "Diagnóstico" },
      { name: "Aceite", price: 38, category: "Lubricantes" },
      { name: "Filtro", price: 10, category: "Filtros" },
      { name: "Pastillas", price: 35, category: "Frenos" },
      { name: "Discos", price: 65, category: "Frenos" },
      { name: "Líquido", price: 8, category: "Frenos" },
      { name: "Amortiguadores", price: 95, category: "Suspensión" },
      { name: "Bujías", price: 32, category: "Encendido" },
      { name: "Batería", price: 85, category: "Eléctrico" },
      { name: "Refrigerante", price: 15, category: "Fluidos" },
      { name: "Bandeja", price: 45, category: "Suspensión" },
      { name: "Terminal", price: 18, category: "Dirección" },
      { name: "Foco", price: 8, category: "Iluminación" },
      { name: "Alineación", price: 25, category: "Dirección" },
      { name: "Balanceo", price: 18, category: "Dirección" },
      { name: "Lavado", price: 15, category: "Limpieza" },];

    repuestosComunes.forEach((r) => {
      const key = r.name.toLowerCase().trim();
      if (!vistos.has(key)) {
        vistos.add(key);
        lista.push({
          name: r.name,
          price: r.price,
          type: "PART",
          category: r.category,
        });
      }
    });

    return lista;
  }, []);

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
    const existe = etapa4Items.find(
      (i) => i.code === item.code || i.name.toLowerCase() === item.name.toLowerCase()
    );
    let nuevosItems: OrderItem[];
    if (existe) {
      nuevosItems = etapa4Items.map((i) =>
        i.id === existe.id ? { ...i, qty: (i.qty || 1) + 1 } : i
      );
    } else {
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
      nuevosItems = [...etapa4Items, nuevo];
    }
    setEtapa4Items(nuevosItems);
    if (ordenActiva) {
      setOrdenActiva({ ...ordenActiva, items: nuevosItems });
      void sincronizarOrdenEnNeon({ items: nuevosItems });
    }
  };

  const handleCambiarCantidadEtapa4 = (id: string, delta: number) => {
    const nuevosItems = etapa4Items
      .map((it) => (it.id === id ? { ...it, qty: Math.max(0, (it.qty || 1) + delta) } : it))
      .filter((it) => it.qty > 0);
    setEtapa4Items(nuevosItems);
    if (ordenActiva) {
      setOrdenActiva({ ...ordenActiva, items: nuevosItems });
      void sincronizarOrdenEnNeon({ items: nuevosItems });
    }
  };

  const handleCambiarPrecioEtapa4 = (id: string, nuevoPrecio: string) => {
    const val = Math.max(0, parseFloat(nuevoPrecio) || 0);
    const nuevosItems = etapa4Items.map((it) => (it.id === id ? { ...it, price: val } : it));
    setEtapa4Items(nuevosItems);
    if (ordenActiva) {
      setOrdenActiva({ ...ordenActiva, items: nuevosItems });
      void sincronizarOrdenEnNeon({ items: nuevosItems });
    }
  };

  const handleEliminarItemEtapa4 = (id: string) => {
    const nuevosItems = etapa4Items.filter((it) => it.id !== id);
    setEtapa4Items(nuevosItems);
    if (ordenActiva) {
      setOrdenActiva({ ...ordenActiva, items: nuevosItems });
      void sincronizarOrdenEnNeon({ items: nuevosItems });
    }
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
    const nuevosItems = [...etapa4Items, nuevo];
    setEtapa4Items(nuevosItems);
    setEtapa4ManualNombre("");
    setEtapa4ManualPrecio("");
    if (ordenActiva) {
      setOrdenActiva({ ...ordenActiva, items: nuevosItems });
      void sincronizarOrdenEnNeon({ items: nuevosItems });
    }
  };

  const handleCotizarPin = async (
    pin: InspectionFinding,
    nombreItem: string,
    precioItem: number,
    tipoItem: "SERVICE" | "PART"
  ) => {
    if (!ordenActiva || !nombreItem.trim()) return;
    const nuevo: OrderItem = {
      id: `pin-cot-${pin.pinNumber || 1}-${Date.now()}`,
      type: tipoItem,
      category: `Inspección - Pin #${pin.pinNumber || 1} (${pin.vistaLabel || pin.vista})`,
      code: `PIN-${pin.pinNumber || 1}-${Math.floor(100 + Math.random() * 900)}`,
      name: nombreItem.trim(),
      price: Math.max(0, precioItem),
      qty: 1,
      status: "Pendiente",
      empleado_id: empleadoLogueado.id,
      empleado_nombre: empleadoLogueado.nombre,
    };

    const nuevosItems = [...(ordenActiva.items || []), nuevo];
    setOrdenActiva({ ...ordenActiva, items: nuevosItems });
    setEtapa4Items(nuevosItems);
    await sincronizarOrdenEnNeon({ items: nuevosItems });
    setPinCotizandoId(null);
    setCotizarPinNombre("");
    setCotizarPinPrecio("");
    mostrarToast(`✓ "${nombreItem}" añadido a la cotización`);
  };

  const handleAgregarItemPresupuesto = async (item: {
    name: string;
    price: number;
    type: "SERVICE" | "PART";
    category?: string;
    code?: string;
    productId?: string;
  }) => {
    if (!ordenActiva) {
      mostrarToast("Primero selecciona un auto en pista o busca una placa arriba", "err");
      return;
    }
    const nuevo: OrderItem = {
      id: `cot-${item.type === "PART" ? "part" : "srv"}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: item.type,
      category: item.category || (item.type === "PART" ? "Repuestos e Insumos" : "Servicios"),
      code: item.code || `${item.type === "PART" ? "REP" : "SRV"}-${Math.floor(100 + Math.random() * 900)}`,
      name: item.name.trim(),
      price: Math.max(0, Number(item.price) || 0),
      qty: 1,
      status: "Pendiente",
      productId: item.productId,
      empleado_id: empleadoLogueado.id,
      empleado_nombre: empleadoLogueado.nombre,
    };
    const nuevosItems = [...(ordenActiva.items || []), nuevo];
    setEtapa4Items(nuevosItems);
    setOrdenActiva((prevOrd) => (prevOrd ? { ...prevOrd, items: nuevosItems } : prevOrd));
    setAutosEnPista((prev) =>
      prev.map((o) => (o.id === ordenActiva.id ? { ...o, items: nuevosItems } : o))
    );
    await sincronizarOrdenEnNeon({ items: nuevosItems });
    mostrarToast(`✓ "${item.name}" añadido al presupuesto`);
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
        "Estimado(a) Cliente";
      const ordNum = ordenActiva?.orderNumber || "OT-EN-CURSO";
      const vehiculoDesc = ordenActiva?.vehicle || "su vehículo";
      const placa = ordenActiva?.plate || "N/A";
      const pin = customPin || etapa6TrackingPin || ordenActiva?.trackingPin || "4821";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const urlSeguimiento = `${origin}/taller/seguimiento?orden=${encodeURIComponent(
        ordNum
      )}&pin=${encodeURIComponent(pin)}`;
      const nombreTaller = ordenActiva?.workshopName || "AutoG Taller Automotriz";

      const stLower = estadoNombre.toLowerCase();

      // 1. PENDIENTE
      if (stLower.includes("pendiente") || stLower.includes("espera") || stLower.includes("recepc")) {
        return `🚗 *${nombreTaller}*
Hola *${clienteNom}*, su vehículo *${vehiculoDesc}* (Placa: *${placa}*) ingresó al taller.
📋 *Orden:* #${ordNum}
⏳ *Estado:* 🟡 *Pendiente de Revisión*
🔗 *Seguimiento:* ${urlSeguimiento}`;
      }

      // 2. DIAGNÓSTICO
      if (stLower.includes("diagn") || stLower.includes("evalua") || stLower.includes("revis")) {
        return `🚗 *${nombreTaller}*
Hola *${clienteNom}*, actualización de su vehículo *${vehiculoDesc}* (Placa: *${placa}*).
📋 *Orden:* #${ordNum}
🔍 *Estado:* 🔵 *En Diagnóstico Técnico*
🔗 *Seguimiento:* ${urlSeguimiento}`;
      }

      // 3. REPARACIÓN
      if (stLower.includes("repara") || stLower.includes("proceso") || stLower.includes("trabajando")) {
        return `🚗 *${nombreTaller}*
Hola *${clienteNom}*, actualización de su vehículo *${vehiculoDesc}* (Placa: *${placa}*).
📋 *Orden:* #${ordNum}
🛠️ *Estado:* 🔴 *En Reparación Activa*
🔗 *Seguimiento:* ${urlSeguimiento}`;
      }

      // 4. ENTREGA
      if (stLower.includes("listo") || (stLower.includes("entrega") && !stLower.includes("entregad"))) {
        return `🚗 *${nombreTaller}*
¡Hola *${clienteNom}*! Su vehículo *${vehiculoDesc}* (Placa: *${placa}*) está listo para retiro.
📋 *Orden:* #${ordNum}
✅ *Estado:* 🟢 *Listo para Entrega*
🔗 *Detalles:* ${urlSeguimiento}`;
      }

      // 5. ENTREGADO
      if (stLower.includes("entregad")) {
        return `🚗 *${nombreTaller}*
Hola *${clienteNom}*, su orden *#${ordNum}* ha finalizado.
Vehículo *${vehiculoDesc}* (Placa: *${placa}*) entregado a satisfacción.
🤝 *Estado:* 🟣 *Vehículo Entregado*
⭐ ¡Gracias por su preferencia!`;
      }

      // Estado personalizado por defecto
      return `🚗 *${nombreTaller}*
Hola *${clienteNom}*, actualización de su vehículo *${vehiculoDesc}* (Placa: *${placa}*).
📋 *Orden:* #${ordNum}
📌 *Estado:* *${estadoNombre}*
🔗 *Seguimiento:* ${urlSeguimiento}`;
    },
    [
      ordenActiva,
      clienteEncontrado,
      clienteSeleccionadoEtapa1,
      etapa1Nombre,
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

  // Aviso por WhatsApp Web en un clic
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

    let phoneFormatted = digits;
    if (digits.length === 10 && digits.startsWith("0")) {
      phoneFormatted = `593${digits.slice(1)}`;
    } else if (digits.length === 9 && digits.startsWith("9")) {
      phoneFormatted = `593${digits}`;
    }

    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let waUrl = "";
    if (phoneFormatted) {
      waUrl = isMobile
        ? `https://api.whatsapp.com/send?phone=${phoneFormatted}&text=${encodeURIComponent(texto)}`
        : `https://web.whatsapp.com/send?phone=${phoneFormatted}&text=${encodeURIComponent(texto)}`;
    } else {
      waUrl = isMobile
        ? `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`
        : `https://web.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    }

    window.open(waUrl, "_blank");
    mostrarToast("Abriendo WhatsApp Web con el mensaje prediseñado...");
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

  const handleGuardarFirmaActiva = async () => {
    if (!ordenActiva) {
      mostrarToast("No hay orden activa", "err");
      return;
    }
    let firmaActual = etapa7FirmaDataUrl;
    if (!firmaActual && canvasFirmaEtapa7Ref.current && tieneTrazosFirmaEtapa7Ref.current) {
      firmaActual = canvasFirmaEtapa7Ref.current.toDataURL("image/png");
      setEtapa7FirmaDataUrl(firmaActual);
    }
    if (!firmaActual) {
      mostrarToast("Dibuja tu firma en el recuadro primero", "err");
      return;
    }

    try {
      setGuardandoEtapa7(true);
      if (modoFirma === "ACEPTACION") {
        setFirmaAceptacionDataUrl(firmaActual);
        const res = await fetch("/api/taller/operacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "FIRMAR_PRESUPUESTO",
            orderId: ordenActiva.id,
            quoteSignatureUrl: firmaActual,
            quoteSignedBy: ordenActiva.client || "Cliente",
          }),
        });
        const data = await res.json();
        if (data.success && data.activeOrder) {
          setOrdenActiva(data.activeOrder);
          setAutosEnPista((prev) =>
            prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
          );
        }
        mostrarToast("✓ Firma de aceptación guardada");
      } else {
        setFirmaEntregaDataUrl(firmaActual);
        await sincronizarEtapa7EnNeon({
          deliverySignatureUrl: firmaActual,
          deliverySignedBy: ordenActiva.client || "Cliente",
          deliveryStatus: "Firmado y Entregado",
        });
        mostrarToast("✓ Firma de entrega guardada");
      }
    } catch (err) {
      console.error("Error guardando firma:", err);
      mostrarToast("Error al guardar firma", "err");
    } finally {
      setGuardandoEtapa7(false);
    }
  };

  const handlePasarAPosOrdenes = async (esReenvio: boolean = false) => {
    if (!ordenActiva) {
      mostrarToast("No hay orden activa para pasar a POS", "err");
      return;
    }
    const ordenYaEnPos = Boolean(
      ordenActiva.posRequestId ||
      ordenActiva.status === "EN_CAJA" ||
      ordenActiva.status?.toLowerCase().includes("caja")
    );

    if (ordenYaEnPos && !esReenvio) {
      setModalYaPasadaPos(true);
      return;
    }
    try {
      setGuardandoPasarPos(true);
      if (canvasFirmaEtapa7Ref.current && tieneTrazosFirmaEtapa7Ref.current) {
        const dataUrl = canvasFirmaEtapa7Ref.current.toDataURL("image/png");
        if (modoFirma === "ACEPTACION") {
          await fetch("/api/taller/operacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "FIRMAR_PRESUPUESTO",
              orderId: ordenActiva.id,
              quoteSignatureUrl: dataUrl,
              quoteSignedBy: ordenActiva.client || "Cliente",
            }),
          });
        } else {
          await fetch("/api/taller/operacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "GUARDAR_ETAPA_7_ENTREGA_FIRMA",
              orderId: ordenActiva.id,
              deliverySignatureUrl: dataUrl,
              deliverySignedBy: ordenActiva.client || "Cliente",
            }),
          });
        }
      }

      const resPos = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENVIAR_A_POS",
          orderId: ordenActiva.id,
          esReenvio,
        }),
      });
      const dataPos = await resPos.json().catch(() => null);
      if (dataPos?.success && dataPos.activeOrder) {
        setOrdenActiva(dataPos.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === dataPos.activeOrder.id ? dataPos.activeOrder : o))
        );
      }

      // Mostrar flotante de éxito manteniendo al usuario en este mismo panel de Taller
      setModalConfirmPos(dataPos?.activeOrder || ordenActiva);
    } catch (err) {
      console.error("Error al pasar a POS:", err);
      mostrarToast("Error al pasar orden a POS", "err");
    } finally {
      setGuardandoPasarPos(false);
    }
  };

  const handleEnviarWhatsAppAceptacionEtapa7 = async () => {
    if (!ordenActiva) return;
    try {
      setGuardandoEtapa7(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SOLICITAR_FIRMA_REMOTA_PANEL_CLIENTE",
          orderId: ordenActiva.id,
          tipoFirma: modoFirma,
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        setCopiadoLinkFirmaEtapa7(true);
        setTimeout(() => setCopiadoLinkFirmaEtapa7(false), 4000);
      }
    } catch (err) {
      console.error("Error habilitando firma remota en Panel Cliente:", err);
    } finally {
      setGuardandoEtapa7(false);
    }
  };

  // Sincronización en tiempo real en Etapa 4 para reflejar cuando el cliente firme desde su Panel Cliente
  useEffect(() => {
    if (etapaActiva !== 4 || !ordenActiva?.id) return;
    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch("/api/taller/operacion");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.autosEnPista)) {
          const fresh = data.autosEnPista.find((o: UnifiedOrder) => o.id === ordenActiva.id);
          if (
            fresh &&
            (fresh.quoteSignatureUrl !== ordenActiva.quoteSignatureUrl ||
              fresh.deliverySignatureUrl !== ordenActiva.deliverySignatureUrl ||
              fresh.deliveryStatus !== ordenActiva.deliveryStatus ||
              fresh.quoteStatus !== ordenActiva.quoteStatus)
          ) {
            setOrdenActiva(fresh);
            setAutosEnPista(data.autosEnPista);
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(pollTimer);
  }, [
    etapaActiva,
    ordenActiva?.id,
    ordenActiva?.quoteSignatureUrl,
    ordenActiva?.deliverySignatureUrl,
    ordenActiva?.deliveryStatus,
    ordenActiva?.quoteStatus,
  ]);

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
      return;
    }
    const updated = await sincronizarEtapa7EnNeon();
    if (updated) {
      mostrarToast(`Entrega y firma guardadas para #${updated.orderNumber}.`);
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

    if (fotosRecepcion.length >= 5) {
      mostrarToast("Máximo 5 fotos iniciales permitidas (5/5)", "err");
      if (fileInputRecepcionRef.current) fileInputRecepcionRef.current.value = "";
      return;
    }

    const archivosSeleccionados = Array.from(files);
    if (fileInputRecepcionRef.current) fileInputRecepcionRef.current.value = "";

    mostrarToast("Subiendo foto(s) a Cloudflare R2...");

    // Subida asíncrona en segundo plano (non-blocking) sin forzar cambio de paso
    void (async () => {
      try {
        setSubiendoFotoRecepcion(true);
        const nuevosUrls: string[] = [];
        const espacioDisponible = 5 - fotosRecepcion.length;
        const limite = Math.min(archivosSeleccionados.length, espacioDisponible);

        for (let i = 0; i < limite; i++) {
          const url = await subirArchivoACloudflareR2(archivosSeleccionados[i], "taller_recepcion");
          if (url) nuevosUrls.push(url);
        }

        const actualizadas = [...fotosRecepcion, ...nuevosUrls].slice(0, 5);
        setFotosRecepcion(actualizadas);

        if (ordenActiva) {
          await sincronizarOrdenEnNeon({
            receptionPhotos: actualizadas,
            mileage: kmActualInput ? parseInt(kmActualInput, 10) : ordenActiva.mileage,
          });
        }
        mostrarToast(`Fotos iniciales guardadas (${actualizadas.length}/5)`);
      } catch (err: any) {
        mostrarToast(err.message || "Error al subir foto a R2", "err");
      } finally {
        setSubiendoFotoRecepcion(false);
      }
    })();
  };

  const handleEliminarFotoRecepcion = async (indexAEliminar: number) => {
    const actualizadas = fotosRecepcion.filter((_, idx) => idx !== indexAEliminar);
    setFotosRecepcion(actualizadas);
    if (ordenActiva) {
      await sincronizarOrdenEnNeon({
        receptionPhotos: actualizadas,
        mileage: kmActualInput ? parseInt(kmActualInput, 10) : ordenActiva.mileage,
      });
    }
    mostrarToast(`Foto eliminada (${actualizadas.length}/5)`);
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
    receptionInventory?: string[];
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
          receptionInventory: partial.receptionInventory ?? ordenActiva.receptionInventory,
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

    const nuevosItems = ordenActiva.items.map((it) => {
      if (it.id === itemId) {
        const nextStatus = ciclo[it.status] || "En Proceso";
        return {
          ...it,
          status: nextStatus,
          completed: nextStatus === "Listo",
        };
      }
      return it;
    });

    setOrdenActiva({ ...ordenActiva, items: nuevosItems });
    setAutosEnPista((prev) =>
      prev.map((o) => (o.id === ordenActiva.id ? { ...o, items: nuevosItems } : o))
    );
    await sincronizarOrdenEnNeon({ items: nuevosItems });
    mostrarToast("Tarea sincronizada con el portal de seguimiento");
  };

  const handleToggleCompletarItem = async (itemId: string) => {
    if (!ordenActiva) return;
    const nuevosItems = ordenActiva.items.map((it) => {
      if (it.id === itemId) {
        const esListo = it.status === "Listo" || it.completed;
        const nextStatus = esListo ? "Pendiente" : "Listo";
        return {
          ...it,
          status: nextStatus as "Pendiente" | "En Proceso" | "Listo",
          completed: !esListo,
        };
      }
      return it;
    });

    setOrdenActiva({ ...ordenActiva, items: nuevosItems });
    setAutosEnPista((prev) =>
      prev.map((o) => (o.id === ordenActiva.id ? { ...o, items: nuevosItems } : o))
    );
    await sincronizarOrdenEnNeon({ items: nuevosItems });
    mostrarToast("Checklist actualizado y sincronizado en vivo");
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

  // Lista combinada de presets para la tarjeta activa (incluye también los servicios de DB según la categoría)
  const presetsTarjetaActiva = useMemo<ServicePreset[]>(() => {
    if (!tarjetaSeleccionadaObj) return [];
    const base = [...tarjetaSeleccionadaObj.presets];
    const existingCodes = new Set(base.map((b) => b.code));
    serviciosDb.forEach((s) => {
      const matchCat =
        !s.category ||
        s.category.toLowerCase().includes(tarjetaSeleccionadaObj.id) ||
        s.category.toLowerCase().includes(tarjetaSeleccionadaObj.title.toLowerCase());
      if (s.code && !existingCodes.has(s.code) && matchCat) {
        base.push({
          code: s.code,
          name: s.name,
          price: Number(s.price) || 15,
          subCategory: s.category || tarjetaSeleccionadaObj.title,
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-white font-sans pb-28 md:pb-12 selection:bg-blue-500/30">
      <Header />



      <main className="flex-grow p-4 sm:p-6 md:p-8 max-w-[1440px] mx-auto w-full space-y-6">
        {/* ===================================================================
            CABECERA PRINCIPAL: VOLVER + SELECTOR (SOLO ICONO EN MÓVIL) + BOTONES ACCIÓN
            =================================================================== */}
        {/* ===================================================================
            FILA 1: FLECHA VOLVER (←) + DATOS DEL VEHÍCULO ACTIVO
            =================================================================== */}
        <div className="flex flex-col items-stretch gap-2.5 sm:gap-3 py-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {ordenActiva ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
                      <path d="M3.5 11h17v7h-17zM6.5 18v1.5M17.5 18v1.5M3.5 14h2M18.5 14h2" />
                      <circle cx="7" cy="14.5" r=".5" />
                      <circle cx="17" cy="14.5" r=".5" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight text-zinc-900 dark:text-white">
                      Orden de Servicio
                    </span>
                    <span className="block text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                      #{ordenActiva.orderNumber}
                    </span>
                  </span>
                </div>
              </div>
            ) : cargandoInicial ? (
              <div className="flex items-center gap-2.5 animate-pulse">
                <span className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-white/10" />
                <span className="space-y-1.5">
                  <span className="block h-3 w-28 rounded bg-zinc-200 dark:bg-white/10" />
                  <span className="block h-2.5 w-16 rounded bg-zinc-200 dark:bg-white/10" />
                </span>
              </div>
            ) : (
              <span className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-200">
                Taller Mecánico
              </span>
            )}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <Link
                href="/taller/nueva-orden"
                aria-label="Nueva Orden"
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white font-semibold flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-blue-600/25 active:scale-95"
                title="Orden"
              >
                <span className="text-lg font-bold leading-none">+</span>
              </Link>
              <button
                type="button"
                onClick={() => setMostrarModalAutosAtencion(true)}
                className="h-8 px-2 rounded-xl bg-white dark:bg-[#111113] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/15 text-zinc-700 dark:text-white flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Ver autos y órdenes en atención"
              >
                <svg
                  className="w-4 h-4 text-zinc-500 dark:text-zinc-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                {autosEnPista.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/40 text-[11px] font-bold font-mono flex items-center justify-center">
                    {autosEnPista.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {!ordenActiva && cargandoInicial && (
            <div className="w-full min-h-[68px] rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#111113] animate-pulse" />
          )}

          {/* Lado derecho: Estado de Ingreso en rectángulo a juego */}
          {ordenActiva && (
            <div className="w-full min-w-0 flex flex-col items-start gap-2">
              <div
                ref={ordenesCarouselRef}
                className="w-full overflow-x-auto snap-x snap-mandatory flex gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:cursor-grab"
                onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
                  if (event.pointerType !== "mouse" || event.button !== 0) return;
                  const container = event.currentTarget;
                  const startX = event.clientX;
                  const startScroll = container.scrollLeft;
                  let moved = false;
                  container.style.scrollSnapType = "none";
                  const onMove = (moveEvent: PointerEvent) => {
                    const delta = moveEvent.clientX - startX;
                    if (Math.abs(delta) > 5) moved = true;
                    container.scrollLeft = startScroll - delta;
                  };
                  const onUp = () => {
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                    const step = container.clientWidth + 8;
                    const index = Math.round(container.scrollLeft / step);
                    container.scrollTo({ left: index * step, behavior: "smooth" });
                    setTimeout(() => {
                      container.style.scrollSnapType = "";
                    }, 400);
                    if (moved) {
                      const block = (clickEvent: Event) => {
                        clickEvent.stopPropagation();
                        clickEvent.preventDefault();
                      };
                      container.addEventListener("click", block, { capture: true, once: true });
                      setTimeout(() => container.removeEventListener("click", block, true), 0);
                    }
                  };
                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
                onWheel={(event: React.WheelEvent<HTMLDivElement>) => {
                  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                    event.currentTarget.scrollBy({
                      left: event.deltaY,
                      behavior: "smooth",
                    });
                  }
                }}
                onScroll={(event: React.UIEvent<HTMLDivElement>) => {
                  const container = event.currentTarget;
                  if (ordenesCarouselScrollTimeoutRef.current) {
                    clearTimeout(ordenesCarouselScrollTimeoutRef.current);
                  }
                  ordenesCarouselScrollTimeoutRef.current = setTimeout(() => {
                    const center = container.getBoundingClientRect().left + container.clientWidth / 2;
                    const cards = Array.from(
                      container.querySelectorAll<HTMLButtonElement>("[data-order-carousel-card]")
                    );
                    const visibleCard = cards.reduce<HTMLButtonElement | null>((closest, card) => {
                      if (!closest) return card;
                      const distance = Math.abs(card.getBoundingClientRect().left + card.offsetWidth / 2 - center);
                      const closestDistance = Math.abs(
                        closest.getBoundingClientRect().left + closest.offsetWidth / 2 - center
                      );
                      return distance < closestDistance ? card : closest;
                    }, null);
                    const orderId = visibleCard?.dataset.orderId;
                    const visibleOrder =
                      autosEnPista.find((auto) => auto.id === orderId) ||
                      (ordenActiva.id === orderId ? ordenActiva : null);
                    if (visibleOrder && visibleOrder.id !== ordenActiva.id) {
                      handleSeleccionarAutoYVolver(visibleOrder);
                    }
                  }, 120);
                }}
              >
                {(autosEnPista.length > 0 ? autosEnPista : [ordenActiva]).map((auto) => {
                  const esActivo = auto.id === ordenActiva.id;
                  const vehiculoCatalogo = clientesCatalogo
                    .flatMap((cliente) => (Array.isArray(cliente.vehicles) ? cliente.vehicles : []))
                    .find((vehiculo) => vehiculo.id === auto.vehicleId || vehiculo.plate === auto.plate);
                  const anioVehiculo =
                    vehiculoCatalogo?.year ||
                    auto.vehicle.match(/\b(?:19|20)\d{2}\b/)?.[0] ||
                    "";
                  let fotosVehiculo: string[] = [];
                  if (Array.isArray(vehiculoCatalogo?.photos)) {
                    fotosVehiculo = vehiculoCatalogo.photos;
                  } else if (typeof vehiculoCatalogo?.photosJson === "string") {
                    try {
                      const fotosParseadas: unknown = JSON.parse(vehiculoCatalogo.photosJson);
                      if (Array.isArray(fotosParseadas)) {
                        fotosVehiculo = fotosParseadas.filter(
                          (foto): foto is string => typeof foto === "string"
                        );
                      }
                    } catch (error) {
                      console.error("No se pudieron cargar las fotos del vehículo:", error);
                    }
                  }
                  const fotoVehiculo = [...fotosVehiculo, ...(auto.receptionPhotos || [])].find(
                    (foto) => /^(data:image\/|https?:\/\/|\/|blob:)/i.test(foto.trim())
                  );
                  const nombreVehiculo = anioVehiculo
                    ? auto.vehicle.replace(String(anioVehiculo), "").trim()
                    : auto.vehicle;
                  return (
                    <button
                      key={auto.id}
                      data-order-carousel-card
                      data-order-id={auto.id}
                      type="button"
                      onClick={() => {
                        if (autosEnPista.length < 2) return;
                        const index = autosEnPista.findIndex((item) => item.id === auto.id);
                        const nextIndex = (index + 1) % autosEnPista.length;
                        handleSeleccionarAutoYVolver(autosEnPista[nextIndex]);
                        const container = ordenesCarouselRef.current;
                        container?.scrollTo({
                          left: nextIndex * (container.clientWidth + 8),
                          behavior: "smooth",
                        });
                      }}
                      aria-pressed={esActivo}
                      className={`snap-start shrink-0 w-full min-h-[68px] px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        esActivo
                          ? "bg-blue-50/80 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 shadow-sm"
                          : "bg-white dark:bg-[#111113] border-zinc-200 dark:border-white/10"
                      }`}
                    >
                      <span className="relative w-14 h-12 rounded-lg shrink-0 bg-blue-100/60 dark:bg-white/5 text-blue-600 dark:text-zinc-400 flex items-center justify-center overflow-hidden border border-blue-200/50 dark:border-transparent">
                        <svg
                          className="w-7 h-7"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M3.5 11h17v7h-17zM6.5 18v1.5M17.5 18v1.5" />
                        </svg>
                        {fotoVehiculo && (
                          <img
                            src={fotoVehiculo}
                            alt={`Vehículo ${auto.vehicle}`}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                            className="absolute inset-0 w-full h-full rounded-lg object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {nombreVehiculo}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono tracking-wider text-blue-600 dark:text-blue-300 truncate font-semibold">
                            {auto.plate}
                          </span>
                          {anioVehiculo && (
                            <span className="shrink-0 border-l border-zinc-300 dark:border-white/15 pl-2">
                              {anioVehiculo}
                            </span>
                          )}
                        </span>
                      </span>
                      <svg
                        className="w-4 h-4 shrink-0 text-zinc-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-normal ${
                  ordenActiva.status === "Pausada"
                    ? "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                <span className="text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  Ingreso:{" "}
                  <span
                    className="text-zinc-900 dark:text-white font-medium"
                    title={formatearFechaCompleta(ordenActiva.dateIn || ordenActiva.startedAt)}
                  >
                    {formatearFechaIngreso(ordenActiva.dateIn || ordenActiva.startedAt)}
                  </span>
                </span>

                <span className={ordenActiva.status === "Pausada" ? "text-amber-500/60" : "text-emerald-500/60"}>•</span>

                {ordenActiva.status === "Pausada" ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 shrink-0 font-medium" title="En Pausa">
                    <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                    <span>En Pausa</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 shrink-0 font-medium" title="Trabajando">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
                    <span>Trabajando</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            FILA 2: MÁS ABAJO ESOS BOTONES (SELECTOR 4 EN 1 + BOTONES ACCIÓN)
            =================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-1">
          {/* SELECTOR SUPERIOR 4 EN 1: Taller, Lubricentro, Car Wash y Tecnicentro */}
          <div className="w-full sm:w-fit flex items-center p-1 rounded-2xl bg-white/80 dark:bg-[#0d0d0e] border border-zinc-200 dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-xl gap-0.5 sm:gap-1 shrink-0 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setModuloTaller("taller")}
              className={`h-9 min-w-0 flex-1 sm:flex-none px-1 sm:px-3.5 rounded-xl text-[10px] sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                moduloTaller === "taller"
                  ? "bg-blue-600 border border-blue-400/40 text-white shadow-lg shadow-blue-600/30 scale-[1.01]"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
              }`}
              title="Taller Mecánico"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39"
                />
              </svg>
              <span className="whitespace-nowrap">Taller</span>
            </button>

            <button
              type="button"
              onClick={() => setModuloTaller("lubricentro")}
              className={`h-9 min-w-0 flex-1 sm:flex-none px-1 sm:px-3.5 rounded-xl text-[10px] sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                moduloTaller === "lubricentro"
                  ? "bg-amber-600 border border-amber-400/40 text-white shadow-lg shadow-amber-600/30 scale-[1.01]"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
              }`}
              title="Lubricentro Express"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
                />
              </svg>
              <span className="whitespace-nowrap">Lubricentro</span>
            </button>

            <button
              type="button"
              onClick={() => setModuloTaller("carwash")}
              className={`h-9 min-w-0 flex-1 sm:flex-none px-1 sm:px-3.5 rounded-xl text-[10px] sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                moduloTaller === "carwash"
                  ? "bg-cyan-600 border border-cyan-400/40 text-white shadow-lg shadow-cyan-600/30 scale-[1.01]"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
              }`}
              title="Car Wash & Detailing"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
              <span className="whitespace-nowrap">Car Wash</span>
            </button>

            <button
              type="button"
              onClick={() => setModuloTaller("tecnicentro")}
              className={`h-9 min-w-0 flex-1 sm:flex-none px-1 sm:px-3.5 rounded-xl text-[10px] sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                moduloTaller === "tecnicentro"
                  ? "bg-emerald-600 border border-emerald-400/40 text-white shadow-lg shadow-emerald-600/30 scale-[1.01]"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
              }`}
              title="Tecnicentro (Llantas, Alineación, Balanceo y Baterías)"
            >
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 6v6M3 12h6m6 0h6" />
              </svg>
              <span className="whitespace-nowrap">Tecnicentro</span>
            </button>
          </div>

          {/* Lado derecho: Botones Nueva Orden y Lista de Autos */}
          <div className="hidden items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* 1. Botón + Nueva Orden (Página Completa) */}
            <Link
              href="/taller/nueva-orden"
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-600/25 active:scale-95 shrink-0"
              title="Nueva Orden"
            >
              <span className="text-base sm:text-lg font-bold leading-none">+</span>
              <span className="text-xs sm:text-sm hidden sm:inline">Nueva Orden</span>
            </Link>

            {/* 2. Botón Lista de Autos */}
            <button
              type="button"
              onClick={() => setMostrarModalAutosAtencion(true)}
              className="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-white dark:bg-[#111113] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border border-zinc-200 dark:border-white/15 text-zinc-700 dark:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-zinc-300 dark:hover:border-white/25 active:scale-95 shrink-0"
              title="Ver autos y órdenes en atención"
            >
              <svg
                className="w-4 h-4 text-zinc-500 dark:text-zinc-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
              {autosEnPista.length > 0 && (
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/40 text-[11px] sm:text-xs font-bold font-mono flex items-center justify-center">
                  {autosEnPista.length}
                </span>
              )}
            </button>


          </div>
        </div>

        {/* ===================================================================
            CONTENEDOR PRINCIPAL: CABECERA COMÚN (PLACA, VEHÍCULO, CLIENTE, VECES ATENDIDO Y MODO)
            SALE EXACTAMENTE IGUAL PARA TALLER Y LUBRICENTRO
            =================================================================== */}
        <section className="bg-white dark:bg-[#111113]/90 rounded-2xl border border-zinc-200 dark:border-white/[0.08] p-4 sm:p-6 shadow-sm dark:shadow-2xl space-y-5 overflow-hidden">
          {/* Registro sencillo de Notas de Voz vinculadas a la Orden */}
          {ordenActiva && Array.isArray(ordenActiva.voiceNotes) && ordenActiva.voiceNotes.length > 0 && (
            <div className="pb-3 border-b border-zinc-200 dark:border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="text-sm">🎙️</span>
                  <span>Notas de voz del ingreso ({ordenActiva.voiceNotes.length})</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ordenActiva.voiceNotes.map((vn, i) => (
                  <div
                    key={vn.id || i}
                    className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2 text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                        <span>Nota #{i + 1}</span>
                        <span className="font-mono text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {vn.durationSeconds}s
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {vn.createdAt ? new Date(vn.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Ingreso"} • {vn.author || "Técnico"}
                      </span>
                    </div>
                    {vn.text && (
                      <p className="text-[11px] text-zinc-200 italic leading-relaxed bg-white/[0.02] p-2 rounded-lg border border-white/5">
                        "{vn.text}"
                      </p>
                    )}
                    {vn.audioUrl && (
                      <audio
                        src={vn.audioUrl}
                        controls
                        className="w-full h-7 rounded"
                        preload="none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTAS SEGÚN EL SELECTOR: TALLER, LUBRICENTRO, CAR WASH O TECNICENTRO */}
          {moduloTaller !== "taller" ? (
            <LubricentroExpress
              empleadoLogueado={empleadoLogueado}
              mecanicos={mecanicos}
              clientesCatalogo={clientesCatalogo}
              productosCatalogo={productosInventario}
              serviciosCatalogo={serviciosDb}
              mostrarToast={mostrarToast}
              ordenActiva={ordenActiva}
              modoEspecialidad={moduloTaller}
              onOrdenCreada={(orden) => {
                setAutosEnPista((prev) => [orden, ...prev.filter((o) => o.id !== orden.id)]);
                setOrdenActiva(orden);
              }}
              onCambiarATaller={() => setModuloTaller("taller")}
            />
          ) : (
            <>
          {/* ===================================================================
              VISTA DE CADA ETAPA ACTIVA (ALTURA DINÁMICA SIN ESPACIOS VACÍOS)
              =================================================================== */}
          <div className="w-full">
            {/* ETAPA 2: INSPECCIÓN (5 VISTAS + PINES NUMERADOS + R2) */}
            {etapaActiva === 2 && (
              <div className="w-full space-y-4 animate-fade-in">
                <InspeccionVehiculo
                  ordenActiva={ordenActiva}
                  productosCatalogo={productosInventario}
                  serviciosCatalogo={serviciosDb}
                  onUpdateOrden={(updated) => {
                    setOrdenActiva(updated);
                    setAutosEnPista((prev) =>
                      prev.map((o) => (o.id === updated.id ? updated : o))
                    );
                  }}
                  onGenerarPdf={handleGenerarPdfInspeccion}
                  onVolver={() => {}}
                  onContinuar={() => setEtapaActiva(4)}
                  mostrarToast={mostrarToast}
                />
              </div>
            )}

            {/* ETAPA 4: AVISO Y FIRMA + TRASPASO A POS / ÓRDENES */}
            {etapaActiva === 4 && (
              <div className="w-full space-y-4 animate-fade-in">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] space-y-4 shadow-sm dark:shadow-xl">
                  {/* Cabecera */}
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📲</span>
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                        Aviso y Firma
                      </h4>
                    </div>
                    {ordenActiva && (
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {ordenActiva.plate ? `Placa: ${ordenActiva.plate} • ` : ""}Orden #{String(ordenActiva.orderNumber || ordenActiva.id).replace(/^OT-\d{4}-/i, "")}
                      </span>
                    )}
                  </div>

                  {/* Contenido en 2 columnas */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Columna Izquierda: Estado y Notificación */}
                    <div className="lg:col-span-5 space-y-3">
                      {/* Estado */}
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 space-y-2">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                          Estado:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {etapa6EstadosLista.slice(0, 5).map((st, idx) => {
                            const sel =
                              etapa6EstadoSeleccionado.toLowerCase() === st.name.toLowerCase() ||
                              etapa6EstadoSeleccionado.toLowerCase().includes(st.name.toLowerCase().replace(/^\d+\s*/, ""));

                            const coloresActivoPorIndice = [
                              "bg-amber-500/25 text-amber-800 dark:text-amber-200 border-amber-400/60 ring-1 ring-amber-400/40 font-semibold shadow-sm",
                              "bg-blue-500/25 text-blue-800 dark:text-blue-200 border-blue-400/60 ring-1 ring-blue-400/40 font-semibold shadow-sm",
                              "bg-rose-500/25 text-rose-800 dark:text-rose-200 border-rose-400/60 ring-1 ring-rose-400/40 font-semibold shadow-sm",
                              "bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border-emerald-400/60 ring-1 ring-emerald-400/40 font-semibold shadow-sm",
                              "bg-purple-500/25 text-purple-800 dark:text-purple-200 border-purple-400/60 ring-1 ring-purple-400/40 font-semibold shadow-sm",
                            ];
                            const estiloActivo = coloresActivoPorIndice[idx % coloresActivoPorIndice.length];
                            const estiloPlomo = "bg-white dark:bg-white/[0.03] hover:bg-zinc-100 dark:hover:bg-white/[0.07] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200 dark:border-white/10";

                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleSeleccionarEstadoEtapa6(st)}
                                className={`px-2 py-1.5 rounded-lg text-xs border transition-all cursor-pointer text-center active:scale-95 ${
                                  sel ? estiloActivo : estiloPlomo
                                }`}
                              >
                                {st.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Notificación rápida */}
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 space-y-2">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                          Aviso:
                        </span>
                        <button
                          type="button"
                          onClick={handleEnviarWhatsAppAvisoEtapa6}
                          className="w-full h-9 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                          title="Abrir WhatsApp Web con mensaje prediseñado según el estado actual"
                        >
                          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                          </svg>
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Columna Derecha: Doble Firma (Aceptación o Entrega) */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 space-y-3">
                        {/* Selector de Modo de Firma */}
                        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-white/5 pb-2.5">
                          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setModoFirma("ACEPTACION");
                                limpiarCanvasFirmaEtapa7();
                              }}
                              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                modoFirma === "ACEPTACION"
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                              }`}
                            >
                              Presupuesto
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setModoFirma("ENTREGA");
                                limpiarCanvasFirmaEtapa7();
                              }}
                              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                modoFirma === "ENTREGA"
                                  ? "bg-teal-600 text-white shadow-xs"
                                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                              }`}
                            >
                              Entrega
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={limpiarCanvasFirmaEtapa7}
                            className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-white/5 cursor-pointer transition-colors"
                          >
                            Limpiar
                          </button>
                        </div>

                        {/* Lienzo Canvas Minimalista Táctil o Firma recibida desde Panel Cliente */}
                        {(() => {
                          const firmaGuardadaUrl =
                            modoFirma === "ACEPTACION"
                              ? ordenActiva?.quoteSignatureUrl
                              : ordenActiva?.deliverySignatureUrl;
                          const firmaSolicitadaPanel =
                            modoFirma === "ACEPTACION"
                              ? ordenActiva?.quoteStatus === "Pendiente Firma en Panel Cliente"
                              : ordenActiva?.deliveryStatus === "Pendiente Firma en Panel Cliente";

                          return (
                            <>
                              <div className="h-40 rounded-xl bg-[#0a0a0c] border border-white/10 relative overflow-hidden flex items-center justify-center">
                                {firmaGuardadaUrl && !tieneTrazosFirmaEtapa7Ref.current ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-white/95 relative">
                                    <img
                                      src={firmaGuardadaUrl}
                                      alt="Firma del Cliente"
                                      className="max-h-28 max-w-full object-contain"
                                    />
                                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 text-[10px] font-bold">
                                      ✓ Firmado por Cliente
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <canvas
                                      ref={canvasFirmaEtapa7Ref}
                                      width={480}
                                      height={160}
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
                                      <div className="absolute pointer-events-none text-zinc-500 text-xs font-mono text-center px-3">
                                        {firmaSolicitadaPanel
                                          ? "📲 Esperando firma del cliente en su Panel Cliente..."
                                          : modoFirma === "ACEPTACION"
                                          ? "[Firma presupuesto]"
                                          : "[Firma entrega]"}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Acciones de Firma */}
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleGuardarFirmaActiva}
                                  disabled={guardandoEtapa7}
                                  className="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                >
                                  <span>💾 {guardandoEtapa7 ? "Guardando..." : "Guardar"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleEnviarWhatsAppAceptacionEtapa7}
                                  disabled={guardandoEtapa7}
                                  className={`h-9 px-3 rounded-xl border text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                                    copiadoLinkFirmaEtapa7 || firmaSolicitadaPanel
                                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                                      : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300"
                                  }`}
                                  title="Habilita la firma remota directamente en el Panel del Cliente (/cliente/taller)"
                                >
                                  <span>
                                    {copiadoLinkFirmaEtapa7 || firmaSolicitadaPanel
                                      ? "✓ En Panel Cliente"
                                      : "📲 Firma remota"}
                                  </span>
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Pie: Traspaso a POS / Órdenes */}
                  <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-[11px] text-zinc-400 font-normal">
                      <span>Cobro en POS.</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setEtapaActiva(2)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-normal text-zinc-300 cursor-pointer transition-colors"
                      >
                        Anterior
                      </button>

                      <Link
                        href="/presupuestos"
                        className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Abrir panel de Presupuestos & Repuestos"
                      >
                        <span>📋</span>
                        <span>Presupuestos</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handlePasarAPosOrdenes(false)}
                        disabled={guardandoPasarPos}
                        className={`px-4 py-2 rounded-xl text-xs font-normal backdrop-blur-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                          ordenActiva && (ordenActiva.posRequestId || ordenActiva.status === "EN_CAJA" || ordenActiva.status?.toLowerCase().includes("caja"))
                            ? "bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300"
                            : "bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300"
                        }`}
                      >
                        <span>
                          {guardandoPasarPos
                            ? "Procesando..."
                            : ordenActiva && (ordenActiva.posRequestId || ordenActiva.status === "EN_CAJA" || ordenActiva.status?.toLowerCase().includes("caja"))
                            ? "✓ Pasada a POS"
                            : "🚀 Pasar a POS"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
            </>
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
                      : "Selecciona un vehículo"}
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
                      ? "Buscar repuesto..."
                      : `Buscar...`
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
                  placeholder="Otro servicio..."
                  className="flex-1 h-10 px-3 rounded-lg bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-white/25"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-100 text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  + Asignar
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
          MODAL FLOTANTE CONFIRMACIÓN DE ENVÍO A POS (SE MANTIENE EN EL PANEL)
          ===================================================================== */}
      {modalConfirmPos && (
        <div
          onClick={() => setModalConfirmPos(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white">
              Se ha enviado la orden con éxito
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Placa <strong className="text-zinc-200 font-mono">{ordenActiva?.plate}</strong> • Orden{" "}
              <strong className="text-emerald-400 font-mono">
                #{String(ordenActiva?.orderNumber || "").replace(/^OT-\d{4}-/i, "")}
              </strong>{" "}
              transferida a POS.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setModalConfirmPos(null)}
                className="w-full h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      
      

      {/* Modal de Advertencia: Orden Ya Pasada a POS */}
      {modalYaPasadaPos && ordenActiva && (
        <div
          onClick={() => setModalYaPasadaPos(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Esta orden ya se pasó a POS
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Placa <strong className="text-zinc-200 font-mono">{ordenActiva.plate}</strong> • Orden{" "}
                  <strong className="text-amber-400 font-mono">
                    #{String(ordenActiva.orderNumber || "").replace(/^OT-\d{4}-/i, "")}
                  </strong>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs text-zinc-300 leading-relaxed">
              <p>
                La orden ya fue enviada a Oficina / Caja. En POS deben aceptarla para realizar el cobro.
              </p>
              <p className="text-zinc-400">
                Si agregaste o modificaste trabajos o repuestos y deseas mandarla otra vez, se enviará a POS para que en Caja decidan si la vuelven a aceptar.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setModalYaPasadaPos(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setModalYaPasadaPos(false);
                  await handlePasarAPosOrdenes(true);
                }}
                disabled={guardandoPasarPos}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span>🚀 Reenviar a POS</span>
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
                    <div className="text-center w-36">
                      <div className="h-10 border-b border-zinc-400 mb-1 flex items-center justify-center">
                        {etapa7FirmaDataUrl ? (
                          <img src={etapa7FirmaDataUrl} alt="Firma" className="max-h-10" />
                        ) : (
                          <span className="text-[10px] text-zinc-400">Firma registrada</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600 font-semibold">Firma del Cliente</p>
                    </div>

                    <div className="flex items-center gap-2.5 bg-zinc-50 border border-zinc-200 p-2 rounded-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
                          typeof window !== "undefined"
                            ? `${window.location.origin}/taller/seguimiento?orden=${encodeURIComponent(
                                ordenActiva.orderNumber
                              )}&pin=${encodeURIComponent(etapa6TrackingPin || ordenActiva.trackingPin || "4821")}`
                            : ""
                        )}`}
                        alt="QR Seguimiento"
                        className="w-14 h-14 bg-white p-0.5 border rounded"
                      />
                      <div className="text-[9px] text-zinc-600 space-y-0.5">
                        <strong className="block text-zinc-900 font-bold">Seguimiento en Vivo</strong>
                        <span>Escanea para ver avance en línea</span>
                        <span className="block font-mono text-[9px] text-emerald-700 font-bold">
                          PIN: {etapa6TrackingPin || ordenActiva.trackingPin || "4821"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-zinc-400">
                      Documento oficial del Taller
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
                  <div className="text-center pt-2 space-y-1">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                        typeof window !== "undefined"
                          ? `${window.location.origin}/taller/seguimiento?orden=${encodeURIComponent(
                              ordenActiva.orderNumber
                            )}&pin=${encodeURIComponent(etapa6TrackingPin || ordenActiva.trackingPin || "4821")}`
                          : ""
                      )}`}
                      alt="QR Ticket"
                      className="w-20 h-20 mx-auto bg-white p-0.5 border rounded"
                    />
                    <p className="text-[10px] text-zinc-700 font-bold">Escanea para seguir tu orden en vivo</p>
                    <p className="text-[10px] text-zinc-900 font-mono font-bold">PIN: {etapa6TrackingPin || ordenActiva.trackingPin || "4821"}</p>
                    <p className="text-[9px] text-zinc-500">¡Gracias por su preferencia!</p>
                  </div>
                </div>
              )}

              {modalImpresionDoc === "ETIQUETA_QR" && (
                <div className="p-4 border-2 border-dashed border-zinc-400 rounded-xl max-w-sm mx-auto text-center space-y-3">
                  <div className="bg-zinc-900 text-white py-1.5 px-4 rounded-xl font-mono text-2xl font-bold tracking-widest inline-block shadow-sm">
                    {ordenActiva.plate}
                  </div>
                  <div className="space-y-0.5 text-xs text-zinc-700">
                    <p className="font-bold text-sm">ORDEN #{ordenActiva.orderNumber}</p>
                    <p>{ordenActiva.vehicle}</p>
                    <p className="text-[10px] text-zinc-500">Fecha: {new Date().toLocaleDateString("es-EC")}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl inline-block border border-zinc-300 shadow-md">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        typeof window !== "undefined"
                          ? `${window.location.origin}/taller/seguimiento?orden=${encodeURIComponent(
                              ordenActiva.orderNumber
                            )}&pin=${encodeURIComponent(etapa6TrackingPin || ordenActiva.trackingPin || "4821")}`
                          : ""
                      )}`}
                      alt="Código QR de la Orden"
                      className="w-36 h-36 mx-auto object-contain"
                    />
                    <span className="text-xs text-zinc-900 font-mono font-bold block mt-1.5">
                      PIN: {etapa6TrackingPin || ordenActiva.trackingPin || "4821"}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-700">
                    Escanea con la cámara de tu celular para ver fotos y avance en vivo
                  </p>
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

      {/* Modal / Drawer: Clientes y Autos en Atención (Pausar, Cambiar, Continuar) */}
      {mostrarModalAutosAtencion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[88vh] bg-[#141417] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Clientes en Atención ({autosEnPista.length})
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarModalAutosAtencion(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Lista de Autos */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {autosEnPista.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-zinc-500 text-xl">
                    🚗
                  </div>
                  <p className="text-sm text-zinc-400">No hay vehículos en pista en este momento.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalAutosAtencion(false);
                      router.push("/taller/nueva-orden");
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    + Registrar Nueva Orden
                  </button>
                </div>
              ) : (
                autosEnPista.map((auto) => {
                  const esActivo = ordenActiva?.id === auto.id;
                  const estaPausado = auto.status === "Pausada";
                  return (
                    <div
                      key={auto.id}
                      onClick={() => handleSeleccionarAutoYVolver(auto)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                        esActivo
                          ? "bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/30"
                          : estaPausado
                          ? "bg-amber-500/[0.04] border-amber-500/30 hover:bg-amber-500/[0.08]"
                          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-normal text-blue-300">
                            Placa: {auto.plate}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 font-normal">
                            Orden: {auto.orderNumber.startsWith("#") ? auto.orderNumber : `#${auto.orderNumber}`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              auto.branch === "SUCURSAL"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/35"
                                : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                            }`}
                          >
                            {auto.branch === "SUCURSAL" ? "Sucursal" : "Principal"}
                          </span>

                          {estaPausado && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-normal flex items-center gap-1">
                              <span>⏸</span>
                              <span>Pausado</span>
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-normal text-white truncate">
                          {auto.vehicle}
                        </p>
                        <p className="text-sm text-zinc-300 font-normal truncate">
                          Cliente: <span className="text-zinc-100 font-normal">{auto.client}</span>
                          {auto.items?.length > 0 && (
                            <span className="ml-2 text-zinc-400 font-normal">
                              • {auto.items.length} {auto.items.length === 1 ? "servicio" : "servicios"}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto justify-end flex-wrap">
                        {estaPausado ? (
                          <button
                            type="button"
                            onClick={(e) => handleReanudarOrden(auto, e)}
                            className="h-8 px-2.5 sm:px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Reanudar trabajo en este auto"
                          >
                            <span>▶</span>
                            <span>Reanudar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handlePausarOrden(auto, e)}
                            className="h-8 px-2.5 sm:px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Pausar trabajo para seguir con otro"
                          >
                            <span>⏸</span>
                            <span>Pausar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleTransferirOrdenSucursal(auto, e)}
                          className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
                            auto.branch === "SUCURSAL"
                              ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35"
                              : "bg-white/5 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border-white/10 hover:border-amber-500/35"
                          }`}
                          title={auto.branch === "SUCURSAL" ? "Transferir este trabajo a Principal" : "Transferir este trabajo a Sucursal"}
                        >
                          <span>⇄</span>
                          <span>{auto.branch === "SUCURSAL" ? "Principal" : "Sucursal"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSeleccionarAutoYVolver(auto)}
                          className={`h-8 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            esActivo
                              ? "bg-white/10 hover:bg-white/15 text-white"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                          }`}
                        >
                          <span>{esActivo ? "Volver" : "Trabajar"}</span>
                          <span>→</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleFinalizarOrdenAHistorial(auto, e)}
                          className="w-8 h-8 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 flex items-center justify-center transition-all cursor-pointer active:scale-90 text-sm font-bold shadow-sm"
                          title="Marcar como terminado"
                        >
                          <span>✓</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  Total en pista: <strong>{autosEnPista.length}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalAutosAtencion(false);
                  router.push("/taller/nueva-orden");
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/25"
              >
                <span>+</span>
                <span>Nueva Orden</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Flotante de Inicio: Nueva Orden de Trabajo (Cliente + Vehículo + Técnico) */}
      <ModalNuevaOrdenTrabajo
        isOpen={mostrarModalNuevaOrden}
        onClose={() => setMostrarModalNuevaOrden(false)}
        empleadoLogueado={empleadoLogueado}
        mecanicos={mecanicos}
        clientesCatalogo={clientesCatalogo}
        onOrdenCreada={handleOrdenCreadaDesdeModal}
        mostrarToast={mostrarToast}
      />

      <TallerMobileNav />
    </div>
  );
}
