"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import type { UnifiedOrder, InspectionFinding, OrderItem, FindingItemLink } from "@/app/taller/page";
import { DetallePinModerno } from "./DetallePinModerno";
import { comprimirImagenEnNavegador } from "@/lib/storage-client";
import { getBestSupportedAudioMimeType } from "@/lib/transcription";

export interface InspeccionVehiculoProps {
  ordenActiva: UnifiedOrder | null;
  productosCatalogo?: any[];
  serviciosCatalogo?: any[];
  onUpdateOrden?: (updated: UnifiedOrder) => void;
  onGenerarPdf?: () => void;
  onContinuar?: () => void;
  onVolver?: () => void;
  mostrarToast?: (msg: string, tipo?: "ok" | "err") => void;
}

type VistaVehiculoId = "frontal" | "trasera" | "lateral_izq" | "lateral_der" | "superior" | "manual";
type PasoInspeccionGuiada = "sistema" | "subcategoria" | "marcar";

export interface InspectionChecklistItem {
  id: string;
  label: string;
  modo: "semaforo" | "binario" | "cumplimiento" | "puntaje";
}

export interface InspectionTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  items: InspectionChecklistItem[];
}

export type SeccionInspeccionId = "carroceria" | "motor" | "frenos" | "suspension" | "electrico" | "aire" | "personalizado";

export interface SeccionInspeccionConfig {
  id: SeccionInspeccionId;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  items?: InspectionChecklistItem[];
}

export const SISTEMAS_INSPECCION: SeccionInspeccionConfig[] = [
  {
    id: "carroceria",
    name: "Carrocería",
    shortName: "Carrocería",
    icon: "🚗",
    description: "Inspección exterior en 5 planos vectoriales con registro de daños y fotos",
  },
  {
    id: "motor",
    name: "Motor",
    shortName: "Motor",
    icon: "⚙️",
    description: "Fugas de fluidos, refrigeración, correas, soportes y encendido",
    items: [
      { id: "mot_fugas", label: "Fugas de aceite o fluidos de motor", modo: "semaforo" },
      { id: "mot_refrigerante", label: "Nivel, estado y mangueras de refrigerante", modo: "semaforo" },
      { id: "mot_correas", label: "Correas de accesorios y distribución", modo: "semaforo" },
      { id: "mot_ruidos", label: "Ruidos anómalos o vibraciones del motor", modo: "semaforo" },
      { id: "mot_soportes", label: "Soportes / patas de motor y caja", modo: "semaforo" },
      { id: "mot_radiador", label: "Radiador, electroventilador y termostato", modo: "semaforo" },
      { id: "mot_admision", label: "Sistema de admisión, filtro de aire y escape", modo: "semaforo" },
      { id: "mot_bujias", label: "Encendido, bujías y compresión", modo: "semaforo" },
    ],
  },
  {
    id: "frenos",
    name: "Frenos",
    shortName: "Frenos",
    icon: "🛑",
    description: "Pastillas, discos, tambores, cañerías hidráulicas y pedal",
    items: [
      { id: "frn_pastillas_del", label: "Espesor de pastillas de freno delanteras", modo: "semaforo" },
      { id: "frn_pastillas_tras", label: "Espesor de pastillas / balatas traseras", modo: "semaforo" },
      { id: "frn_discos", label: "Discos y tambores de freno (ceja o alabeo)", modo: "semaforo" },
      { id: "frn_liquido", label: "Nivel y punto de ebullición de líquido de frenos", modo: "semaforo" },
      { id: "frn_fugas", label: "Fugas en cañerías hidráulicas, flexibles o calipers", modo: "semaforo" },
      { id: "frn_pedal", label: "Tacto, firmeza y recorrido del pedal", modo: "semaforo" },
      { id: "frn_freno_mano", label: "Freno de estacionamiento / mano (tensión y bloqueo)", modo: "semaforo" },
    ],
  },
  {
    id: "suspension",
    name: "Suspensión",
    shortName: "Suspensión",
    icon: "🔩",
    description: "Amortiguadores, rótulas, bujes, terminales y dirección",
    items: [
      { id: "susp_amort_del", label: "Amortiguadores delanteros (sin fugas ni rebote)", modo: "semaforo" },
      { id: "susp_amort_tras", label: "Amortiguadores y espirales / muelles traseros", modo: "semaforo" },
      { id: "susp_rotulas", label: "Rótulas de suspensión y muñones", modo: "semaforo" },
      { id: "susp_terminales", label: "Terminales de dirección y barras axiales", modo: "semaforo" },
      { id: "susp_bujes", label: "Bujes de tijetas / bandejas y barra estabilizadora", modo: "semaforo" },
      { id: "susp_cremallera", label: "Caja o cremallera de dirección y fuelles", modo: "semaforo" },
      { id: "susp_neumaticos", label: "Alineación, balanceo y desgaste parejo de neumáticos", modo: "semaforo" },
    ],
  },
  {
    id: "electrico",
    name: "Eléctrico",
    shortName: "Eléctrico",
    icon: "⚡",
    description: "Batería, alternador, luces, arranque y testigos de tablero",
    items: [
      { id: "elec_bateria", label: "Batería: voltaje de reposo, bornes y sujeción", modo: "semaforo" },
      { id: "elec_alternador", label: "Alternador: carga y voltaje con accesorios encendidos", modo: "semaforo" },
      { id: "elec_arranque", label: "Motor de arranque y respuesta de encendido", modo: "semaforo" },
      { id: "elec_luces_del", label: "Luces principales (bajas, altas y neblineros)", modo: "semaforo" },
      { id: "elec_luces_tras", label: "Luces de freno, retroceso, placas y direccionales", modo: "semaforo" },
      { id: "elec_tablero", label: "Testigos de advertencia en tablero (Check Engine, ABS)", modo: "semaforo" },
      { id: "elec_clima", label: "Sistema de climatización / A/C y ventilación", modo: "semaforo" },
    ],
  },
  {
    id: "aire",
    name: "Aire Acondicionado",
    shortName: "A/C",
    icon: "❄️",
    description: "Compresor, gas refrigerante, condensador, filtro de cabina y ventilación",
    items: [
      { id: "ac_compresor", label: "Compresor y embrague: funcionamiento y ruidos", modo: "semaforo" },
      { id: "ac_gas", label: "Nivel de gas refrigerante y presiones", modo: "semaforo" },
      { id: "ac_condensador", label: "Condensador y electroventilador: limpieza y estado", modo: "semaforo" },
      { id: "ac_fugas", label: "Fugas en mangueras, cañerías y uniones", modo: "semaforo" },
      { id: "ac_filtro", label: "Filtro de cabina y limpieza del evaporador", modo: "semaforo" },
      { id: "ac_ventilacion", label: "Soplador, salidas de aire y temperatura de salida", modo: "semaforo" },
    ],
  },
];

const inspectionSectionListeners = new Set<() => void>();

function getStoredInspectionSection(): SeccionInspeccionId {
  if (typeof window === "undefined") return "carroceria";

  try {
    const saved = window.localStorage.getItem("taller_seccion_activa");
    return SISTEMAS_INSPECCION.find((system) => system.id === saved)?.id ?? "carroceria";
  } catch (error) {
    console.warn("No se pudo recuperar el sistema de inspección guardado:", error);
    return "carroceria";
  }
}

function getServerInspectionSection(): SeccionInspeccionId {
  return "carroceria";
}

function subscribeToInspectionSection(listener: () => void): () => void {
  inspectionSectionListeners.add(listener);
  window.addEventListener("storage", listener);

  return () => {
    inspectionSectionListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function saveInspectionSection(section: SeccionInspeccionId): void {
  try {
    window.localStorage.setItem("taller_seccion_activa", section);
  } catch (error) {
    console.warn("No se pudo guardar el sistema de inspección:", error);
  }

  inspectionSectionListeners.forEach((listener) => listener());
}

export const PLANTILLAS_INSPECCION: InspectionTemplate[] = SISTEMAS_INSPECCION
  .filter((s): s is SeccionInspeccionConfig & { items: InspectionChecklistItem[] } => Boolean(s.items && s.items.length > 0))
  .map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
    items: s.items,
  }));

const SUBCATEGORIAS_SISTEMA: Record<string, { id: string; icon: string }[]> = {
  motor: [
    { id: "Fugas", icon: "💧" },
    { id: "Refrigeración", icon: "🌡️" },
    { id: "Correas", icon: "⛓️" },
    { id: "Encendido", icon: "⚡" },
    { id: "Escape", icon: "💨" },
    { id: "Soportes", icon: "🔩" },
  ],
  frenos: [
    { id: "Pastillas", icon: "🟫" },
    { id: "Discos", icon: "💿" },
    { id: "Líquido", icon: "💧" },
    { id: "Calipers", icon: "🔧" },
    { id: "Pedal", icon: "🦶" },
    { id: "Mano", icon: "🅿️" },
  ],
  suspension: [
    { id: "Amortiguadores", icon: "🔽" },
    { id: "Resortes", icon: "🌀" },
    { id: "Rótulas", icon: "⚪" },
    { id: "Terminales", icon: "↔️" },
    { id: "Bujes", icon: "🔩" },
    { id: "Dirección", icon: "🛞" },
  ],
  electrico: [
    { id: "Batería", icon: "🔋" },
    { id: "Alternador", icon: "🔄" },
    { id: "Arranque", icon: "🔑" },
    { id: "Luces", icon: "💡" },
    { id: "Tablero", icon: "📟" },
    { id: "Fusibles", icon: "🔌" },
  ],
  aire: [
    { id: "Compresor", icon: "⚙️" },
    { id: "Gas", icon: "🧊" },
    { id: "Condensador", icon: "♨️" },
    { id: "Fugas", icon: "💧" },
    { id: "Filtro", icon: "🌬️" },
    { id: "Ventilación", icon: "❄️" },
  ],
  personalizado: [
    { id: "Manual", icon: "✏️" },
  ],
};

const ZONAS_SUBCATEGORIA: Record<string, Record<string, { x: number; y: number }>> = {
  motor: {
    Fugas: { x: 700, y: 560 },
    Refrigeración: { x: 1150, y: 560 },
    Correas: { x: 880, y: 440 },
    Encendido: { x: 700, y: 250 },
    Escape: { x: 520, y: 390 },
    Soportes: { x: 330, y: 340 },
  },
  frenos: {
    Pastillas: { x: 800, y: 400 },
    Discos: { x: 340, y: 300 },
    Líquido: { x: 1020, y: 100 },
    Calipers: { x: 700, y: 200 },
    Pedal: { x: 1140, y: 170 },
    Mano: { x: 1180, y: 330 },
  },
  suspension: {
    Amortiguadores: { x: 520, y: 180 },
    Resortes: { x: 1000, y: 120 },
    Rótulas: { x: 480, y: 570 },
    Terminales: { x: 730, y: 540 },
    Bujes: { x: 850, y: 590 },
    Dirección: { x: 900, y: 440 },
  },
  electrico: {
    Batería: { x: 640, y: 400 },
    Alternador: { x: 1100, y: 300 },
    Arranque: { x: 800, y: 600 },
    Luces: { x: 180, y: 260 },
    Tablero: { x: 700, y: 110 },
    Fusibles: { x: 380, y: 280 },
  },
  aire: {
    Compresor: { x: 820, y: 470 },
    Gas: { x: 1150, y: 640 },
    Condensador: { x: 1150, y: 700 },
    Fugas: { x: 760, y: 100 },
    Filtro: { x: 1190, y: 290 },
    Ventilación: { x: 900, y: 700 },
  },
};

const CHIPS_HALLAZGO = [
  { id: "Rayón", label: "Rayón", color: "bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40" },
  { id: "Golpe", label: "Golpe", color: "bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40" },
  { id: "Abolladura", label: "Abolladura", color: "bg-orange-50 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/40" },
  { id: "Fisura", label: "Fisura", color: "bg-purple-50 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/40" },
];

const CHIPS_HALLAZGO_MECANICO = [
  { id: "Fuga", label: "Fuga", color: "bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40" },
  { id: "Roto", label: "Roto", color: "bg-red-50 dark:bg-red-500/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-500/40" },
  { id: "Desgaste", label: "Desgaste", color: "bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40" },
  { id: "Ruido", label: "Ruido", color: "bg-orange-50 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/40" },
  { id: "Suelto", label: "Suelto", color: "bg-yellow-50 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-500/40" },
  { id: "Sensor/Falla", label: "Sensor/Falla", color: "bg-purple-50 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/40" },
];

const VISTAS_CARROCERIA: { id: VistaVehiculoId; label: string; icon: React.ReactNode }[] = [
  {
    id: "frontal",
    label: "1. Frontal",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.25l2.25-6.75h12l2.25 6.75M3.75 14.25h16.5M3.75 14.25v4.5h16.5v-4.5" />
        <circle cx="7.5" cy="16.5" r="1.5" />
        <circle cx="16.5" cy="16.5" r="1.5" />
      </svg>
    ),
  },
  {
    id: "trasera",
    label: "2. Trasera",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l1.5-6h13.5l1.5 6M3.75 13.5h16.5M3.75 13.5v5.25h16.5V13.5" />
        <rect x="7" y="15" width="10" height="2" rx="1" />
      </svg>
    ),
  },
  {
    id: "lateral_izq",
    label: "3. Lat. Izq",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l2.25-4.5h10.5l4.5 4.5v3h-18v-3Z" />
        <circle cx="6" cy="18.75" r="2.25" />
        <circle cx="16" cy="18.75" r="2.25" />
      </svg>
    ),
  },
  {
    id: "lateral_der",
    label: "4. Lat. Der",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 15.75l-2.25-4.5H9l-4.5 4.5v3h18v-3Z" />
        <circle cx="8" cy="18.75" r="2.25" />
        <circle cx="18" cy="18.75" r="2.25" />
      </svg>
    ),
  },
  {
    id: "superior",
    label: "5. Superior",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <rect x="6" y="3" width="12" height="18" rx="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="6" y1="8" x2="18" y2="8" strokeLinecap="round" />
        <line x1="6" y1="16" x2="18" y2="16" strokeLinecap="round" />
      </svg>
    ),
  },
];

const SECUENCIA_VISTAS: { id: VistaVehiculoId; label: string; short: string; icon: React.ReactNode }[] = [
  {
    id: "frontal",
    label: "Frontal",
    short: "Frontal",
    icon: (
      <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.25l2.25-6.75h12l2.25 6.75M3.75 14.25h16.5M3.75 14.25v4.5h16.5v-4.5" />
        <circle cx="7.5" cy="16.5" r="1.5" />
        <circle cx="16.5" cy="16.5" r="1.5" />
      </svg>
    ),
  },
  {
    id: "lateral_der",
    label: "Lateral Derecho",
    short: "Lat. Der",
    icon: (
      <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 15.75l-2.25-4.5H9l-4.5 4.5v3h18v-3Z" />
        <circle cx="8" cy="18.75" r="2.25" />
        <circle cx="18" cy="18.75" r="2.25" />
      </svg>
    ),
  },
  {
    id: "trasera",
    label: "Trasera",
    short: "Trasera",
    icon: (
      <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l1.5-6h13.5l1.5 6M3.75 13.5h16.5M3.75 13.5v5.25h16.5V13.5" />
        <rect x="7" y="15" width="10" height="2" rx="1" />
      </svg>
    ),
  },
  {
    id: "lateral_izq",
    label: "Lateral Izquierdo",
    short: "Lat. Izq",
    icon: (
      <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l2.25-4.5h10.5l4.5 4.5v3h-18v-3Z" />
        <circle cx="6" cy="18.75" r="2.25" />
        <circle cx="16" cy="18.75" r="2.25" />
      </svg>
    ),
  },
  {
    id: "superior",
    label: "Superior",
    short: "Superior",
    icon: (
      <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <rect x="6" y="3" width="12" height="18" rx="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="6" y1="8" x2="18" y2="8" strokeLinecap="round" />
        <line x1="6" y1="16" x2="18" y2="16" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function InspeccionVehiculo({
  ordenActiva,
  productosCatalogo = [],
  serviciosCatalogo = [],
  onUpdateOrden,
  onGenerarPdf,
  onContinuar,
  onVolver,
  mostrarToast = (msg) => console.log(msg),
}: InspeccionVehiculoProps) {
  const [vistaActiva, setVistaActiva] = useState<VistaVehiculoId>("frontal");

  const [subCategoriaPorSistema, setSubCategoriaPorSistema] = useState<Record<string, string>>({
    motor: SUBCATEGORIAS_SISTEMA.motor[0].id,
    frenos: SUBCATEGORIAS_SISTEMA.frenos[0].id,
    suspension: SUBCATEGORIAS_SISTEMA.suspension[0].id,
    electrico: SUBCATEGORIAS_SISTEMA.electrico[0].id,
    aire: SUBCATEGORIAS_SISTEMA.aire[0].id,
    personalizado: "Manual",
  });
  // Estados para inputs manuales / personalizados
  const [nombreManualCategoria, setNombreManualCategoria] = useState<string>("");
  const [nombreManualSubcategoria, setNombreManualSubcategoria] = useState<string>("");
  const [subcategoriaManualCarroceria, setSubcategoriaManualCarroceria] = useState<string>("");
  const [subcategoriaManualPorSistema, setSubcategoriaManualPorSistema] = useState<Record<string, string>>({
    motor: "",
    frenos: "",
    suspension: "",
    electrico: "",
    aire: "",
    personalizado: "",
  });
  const vistaCarouselRef = useRef<HTMLDivElement | null>(null);
  const ultimoToquePinRef = useRef(0);
  const imagenVehiculoRef = useRef<HTMLImageElement | null>(null);
  const imagenMecanicaRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640 && vistaCarouselRef.current) {
      const container = vistaCarouselRef.current;
      const el = document.getElementById(`vista-tab-${vistaActiva}`);
      if (el) {
        const targetLeft = el.offsetLeft - container.offsetLeft - (container.clientWidth / 2 - el.clientWidth / 2);
        container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
      }
    }
  }, [vistaActiva]);
  const [hallazgos, setHallazgos] = useState<InspectionFinding[]>(() => {
    if (Array.isArray(ordenActiva?.inspectionFindings) && ordenActiva.inspectionFindings.length > 0) {
      return ordenActiva.inspectionFindings;
    }
    return [];
  });
  const [pinSeleccionadoId, setPinSeleccionadoId] = useState<string | null>(null);
  // Estados para colocación controlada de pines (evitar toques accidentales en móvil)
  const [modoColocandoPin, setModoColocandoPin] = useState<boolean>(false);
  const [pinReubicandoId, setPinReubicandoId] = useState<string | null>(null);

  // Estados para popover y detalle multimedia del pin activo
  const [popoverAbierto, setPopoverAbierto] = useState(false);
  const [menuVistasAbierto, setMenuVistasAbierto] = useState<boolean>(false);
  const menuVistasRef = useRef<HTMLDivElement | null>(null);

  const cambiarVista = useCallback((nuevaVista: VistaVehiculoId) => {
    setVistaActiva(nuevaVista);
    setPinSeleccionadoId(null);
    setPopoverAbierto(false);
    setMenuVistasAbierto(false);
  }, []);

  const navegarVista = useCallback(
    (direccion: 1 | -1) => {
      const indexActual = SECUENCIA_VISTAS.findIndex((v) => v.id === vistaActiva);
      const total = SECUENCIA_VISTAS.length;
      const nuevoIndex = (indexActual + direccion + total) % total;
      cambiarVista(SECUENCIA_VISTAS[nuevoIndex].id);
    },
    [vistaActiva, cambiarVista]
  );

  useEffect(() => {
    if (!menuVistasAbierto) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuVistasRef.current && !menuVistasRef.current.contains(e.target as Node)) {
        setMenuVistasAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuVistasAbierto]);

  const [tipoSeleccionado, setTipoSeleccionado] = useState("");
  const [observacionTexto, setObservacionTexto] = useState("");
  const [subiendoFotoPin, setSubiendoFotoPin] = useState(false);
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [reproduciendoAudio, setReproduciendoAudio] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const dictandoActivoRef = useRef(false);
  const textoBaseRef = useRef("");
  const observacionTextoRef = useRef(observacionTexto);

  // Mantener observacionTextoRef sincronizado en todo momento
  useEffect(() => {
    observacionTextoRef.current = observacionTexto;
  }, [observacionTexto]);

  // Mantener hallazgosRef sincronizado para evitar side-effects dentro de state updaters
  const hallazgosRef = useRef(hallazgos);
  useEffect(() => {
    hallazgosRef.current = hallazgos;
  }, [hallazgos]);

  // Cleanup de audio Text-to-Speech y grabación de voz
  useEffect(() => {
    return () => {
      dictandoActivoRef.current = false;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (audioStreamRef.current) {
        try {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
      }
    };
  }, []);

  // Estados para Sistemas de Inspección Total del Vehículo
  const seccionActiva = useSyncExternalStore(
    subscribeToInspectionSection,
    getStoredInspectionSection,
    getServerInspectionSection
  );
  const [pasoInspeccion, setPasoInspeccion] = useState<PasoInspeccionGuiada>("sistema");
  const [desplazamientoSistemaCandidato, setDesplazamientoSistemaCandidato] = useState(0);
  const indiceBaseSistema = Math.max(
    0,
    SISTEMAS_INSPECCION.findIndex((sistema) => sistema.id === seccionActiva)
  );
  const indiceSistemaCandidato =
    (indiceBaseSistema + desplazamientoSistemaCandidato) % SISTEMAS_INSPECCION.length;

  const cambiarSeccionActiva = (sec: SeccionInspeccionId) => {
    saveInspectionSection(sec);
    setDesplazamientoSistemaCandidato(0);
  };

  const moverCandidatoSistema = (direccion: 1 | -1) => {
    setDesplazamientoSistemaCandidato((offset) => {
      const total = SISTEMAS_INSPECCION.length;
      return (offset + direccion + total) % total;
    });
  };

  const sistemaCandidato = SISTEMAS_INSPECCION[indiceSistemaCandidato];
  const contarHallazgosSistema = (sistemaId: SeccionInspeccionId) => hallazgos.filter((hallazgo) =>
    sistemaId === "carroceria"
      ? ["frontal", "trasera", "lateral_izq", "lateral_der", "superior", "manual"].includes(hallazgo.vista)
      : hallazgo.vista === sistemaId
  ).length;
  const subcategoriasActivas = SUBCATEGORIAS_SISTEMA[seccionActiva] || [];
  const subcategoriaActiva = subcategoriasActivas.find((sub) => sub.id === subCategoriaPorSistema[seccionActiva])
    || subcategoriasActivas[0];

  const [menuSubcategoriasAbierto, setMenuSubcategoriasAbierto] = useState<boolean>(false);
  const menuSubcategoriasRef = useRef<HTMLDivElement | null>(null);

  const cambiarSubcategoria = useCallback(
    (nuevaSub: string) => {
      setSubCategoriaPorSistema((prev) => ({ ...prev, [seccionActiva]: nuevaSub }));
      setPinSeleccionadoId(null);
      setPopoverAbierto(false);
      setMenuSubcategoriasAbierto(false);
    },
    [seccionActiva]
  );

  const navegarSubcategoria = useCallback(
    (direccion: 1 | -1) => {
      const lista = SUBCATEGORIAS_SISTEMA[seccionActiva] || [];
      if (lista.length === 0) return;
      const subActual = subCategoriaPorSistema[seccionActiva] || lista[0].id;
      const indexActual = lista.findIndex((s) => s.id === subActual);
      const total = lista.length;
      const nuevoIndex = (indexActual + direccion + total) % total;
      cambiarSubcategoria(lista[nuevoIndex].id);
    },
    [seccionActiva, subCategoriaPorSistema, cambiarSubcategoria]
  );

  useEffect(() => {
    if (!menuSubcategoriasAbierto) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuSubcategoriasRef.current && !menuSubcategoriasRef.current.contains(e.target as Node)) {
        setMenuSubcategoriasAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuSubcategoriasAbierto]);

  const [evaluacionesPlantilla, setEvaluacionesPlantilla] = useState<Record<string, any>>({});

  // Modal de PDF y Envío WhatsApp de Inspección
  const [modalPdfAbierto, setModalPdfAbierto] = useState(false);

  const [firmaRecepcionUrl, setFirmaRecepcionUrl] = useState<string | null>(
    ordenActiva?.receptionSignatureUrl || null
  );

  // Estados de carga y error para la imagen 3D del vehículo (compatibilidad móvil)
  const [imagenCargando, setImagenCargando] = useState<boolean>(false);
  const [imagenError, setImagenError] = useState<boolean>(false);

  // Precarga inmediata en memoria de todos los esquemas 3D para cambio instantáneo en móvil
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urls = [
      "/images/inspeccion/auto_3d_frontal.jpg",
      "/images/inspeccion/auto_3d_trasera.jpg",
      "/images/inspeccion/auto_3d_superior.jpg",
      "/images/inspeccion/auto_3d_motor.jpg",
      "/images/inspeccion/auto_3d_frenos.jpg",
      "/images/inspeccion/auto_3d_suspension.jpg",
      "/images/inspeccion/auto_3d_electrico.jpg",
      "/images/inspeccion/auto_3d_frontal_cad.png",
      "/images/inspeccion/auto_3d_trasera_cad.png",
      "/images/inspeccion/auto_3d_superior_cad.png",
      "/images/inspeccion/auto_3d_motor_cad.png",
      "/images/inspeccion/auto_3d_frenos_cad.png",
      "/images/inspeccion/auto_3d_suspension_cad.png",
      "/images/inspeccion/auto_3d_electrico_cad.png",
    ];
    urls.forEach((src) => {
      const img = new window.Image();
      img.decoding = "sync";
      img.src = src;
    });
  }, []);

  // Detección reactiva de modo claro/oscuro para renderizado de esquemas 3D
  const [isDark, setIsDark] = useState<boolean>(true);
  const [modoVisualLienzo, setModoVisualLienzo] = useState<"auto" | "claro" | "oscuro">("auto");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkTheme = () => {
      const darkActive = document.documentElement.classList.contains("dark");
      setIsDark(darkActive);
    };
    checkTheme();
    const observer = new MutationObserver(() => {
      checkTheme();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Determina si el lienzo se dibuja en modo oscuro o claro
  const lienzoOscuro = modoVisualLienzo === "auto" ? isDark : modoVisualLienzo === "oscuro";

  useEffect(() => {
    setImagenCargando(false);
    setImagenError(false);
  }, [vistaActiva, seccionActiva, subCategoriaPorSistema]);

  const prevOrderIdRef = useRef<string | undefined>(ordenActiva?.id);
  const prevFindingsJsonRef = useRef<string>(JSON.stringify(ordenActiva?.inspectionFindings || []));
  const syncRequestIdRef = useRef<number>(0);
  const lastLocalMutationRef = useRef<number>(0);
  const autoTranscribedUrlsRef = useRef<Set<string>>(new Set());

  const fusionarHallazgosRemotosYLocales = useCallback(
    (incomingFindings: InspectionFinding[], prevLocal: InspectionFinding[]): InspectionFinding[] => {
      if (incomingFindings.length === 0 && prevLocal.length > 0) {
        return prevLocal;
      }
      const byId = new Map<string, InspectionFinding>();
      for (const loc of prevLocal) {
        if (loc && loc.id) byId.set(loc.id, loc);
      }
      for (const inc of incomingFindings) {
        if (!inc || !inc.id) continue;
        const loc = byId.get(inc.id);
        if (!loc) {
          byId.set(inc.id, inc);
          continue;
        }
        const incAudios = (inc.audioUrls || (inc.audioUrl ? [inc.audioUrl] : [])).filter(
          (u) => u && !u.startsWith("blob:")
        );
        const locAudios = loc.audioUrls || (loc.audioUrl ? [loc.audioUrl] : []);
        const mergedAudios = [...incAudios];
        for (const la of locAudios) {
          if (la && !la.startsWith("blob:") && !mergedAudios.includes(la)) {
            mergedAudios.push(la);
          }
        }

        const incPhotos = (inc.photoUrls || (inc.photoUrl ? [inc.photoUrl] : [])).filter(
          (u) => u && !u.startsWith("blob:")
        );
        const locPhotos = loc.photoUrls || (loc.photoUrl ? [loc.photoUrl] : []);
        const mergedPhotos = [...incPhotos];
        for (const lp of locPhotos) {
          if (lp && !lp.startsWith("blob:") && !mergedPhotos.includes(lp)) {
            mergedPhotos.push(lp);
          }
        }

        const incKanban = Array.isArray((inc as any).kanbanNotes) ? (inc as any).kanbanNotes : [];
        const locKanban = Array.isArray((loc as any).kanbanNotes) ? (loc as any).kanbanNotes : [];
        const kanbanMap = new Map<string, any>();
        const esNotaTemporal = (txt?: string) =>
          !txt || txt.includes("Convirtiendo audio") || txt.includes("(escribe o edita aquí el detalle)");

        for (const kn of locKanban) {
          if (!kn) continue;
          const kKey = typeof kn.audioIndex === "number" ? `aud_${kn.audioIndex}` : String(kn.id);
          kanbanMap.set(kKey, kn);
        }
        for (const kn of incKanban) {
          if (!kn) continue;
          const kKey = typeof kn.audioIndex === "number" ? `aud_${kn.audioIndex}` : String(kn.id);
          const prevKn = kanbanMap.get(kKey);
          if (!prevKn || !esNotaTemporal(kn.text) || esNotaTemporal(prevKn.text)) {
            kanbanMap.set(kKey, kn);
          }
        }
        const mergedKanban = Array.from(kanbanMap.values());

        const incAudioNotes = Array.isArray((inc as any).audioNotes) ? (inc as any).audioNotes : [];
        const locAudioNotes = Array.isArray((loc as any).audioNotes) ? (loc as any).audioNotes : [];
        const maxLen = Math.max(incAudioNotes.length, locAudioNotes.length, mergedAudios.length);
        const mergedAudioNotes: string[] = [];
        for (let i = 0; i < maxLen; i++) {
          mergedAudioNotes[i] = incAudioNotes[i] || locAudioNotes[i] || "";
        }

        byId.set(inc.id, {
          ...loc,
          ...inc,
          photoUrl: mergedPhotos[0] || undefined,
          photoUrls: mergedPhotos,
          audioUrl: mergedAudios[0] || undefined,
          audioUrls: mergedAudios,
          audioNotes: mergedAudioNotes,
          kanbanNotes: mergedKanban,
        } as InspectionFinding);
      }
      return Array.from(byId.values());
    },
    []
  );

  // Sincronizar hallazgos locales cuando cambie la orden seleccionada o cuando lleguen datos del backend
  useEffect(() => {
    const orderId = ordenActiva?.id;
    const incomingFindings = ordenActiva?.inspectionFindings;
    const incomingJson = JSON.stringify(incomingFindings || []);

    const orderChanged = orderId !== prevOrderIdRef.current;
    const findingsChanged = incomingJson !== prevFindingsJsonRef.current;

    prevOrderIdRef.current = orderId;

    if (orderChanged) {
      prevFindingsJsonRef.current = incomingJson;
      if (Array.isArray(incomingFindings) && incomingFindings.length > 0) {
        hallazgosRef.current = incomingFindings;
        setHallazgos(incomingFindings);
      } else {
        hallazgosRef.current = [];
        setHallazgos([]);
      }
    } else if (findingsChanged) {
      if (dictandoActivoRef.current || Date.now() - lastLocalMutationRef.current < 3000) {
        return;
      }
      prevFindingsJsonRef.current = incomingJson;
      if (Array.isArray(incomingFindings)) {
        setHallazgos((prevLocal) => {
          const merged = fusionarHallazgosRemotosYLocales(incomingFindings, prevLocal);
          hallazgosRef.current = merged;
          return merged;
        });
      }
    }

    if (ordenActiva?.receptionSignatureUrl) {
      setFirmaRecepcionUrl(ordenActiva.receptionSignatureUrl);
    }
    if ((ordenActiva as any)?.inspectionChecklist) {
      setEvaluacionesPlantilla((ordenActiva as any).inspectionChecklist);
    }
  }, [
    ordenActiva?.id,
    ordenActiva?.inspectionFindings,
    ordenActiva?.receptionSignatureUrl,
    (ordenActiva as any)?.inspectionChecklist,
    fusionarHallazgosRemotosYLocales,
  ]);

  // Sincronización en tiempo real Móvil <-> PC (cada 2.5s y al enfocar la ventana)
  useEffect(() => {
    const orderId = ordenActiva?.id;
    if (!orderId) return;

    let cancelado = false;
    const pullDesdeNeon = async () => {
      if (cancelado || dictandoActivoRef.current || Date.now() - lastLocalMutationRef.current < 2500) {
        return;
      }
      try {
        const res = await fetch(`/api/taller/operacion?quoteToken=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const remoteOrder = data?.order;
        if (!remoteOrder || cancelado) return;

        const remoteFindings: InspectionFinding[] = Array.isArray(remoteOrder.inspectionFindings)
          ? remoteOrder.inspectionFindings
          : [];
        const remoteJson = JSON.stringify(remoteFindings);
        if (remoteJson !== prevFindingsJsonRef.current && Date.now() - lastLocalMutationRef.current >= 2500) {
          prevFindingsJsonRef.current = remoteJson;
          setHallazgos((prevLocal) => {
            const merged = fusionarHallazgosRemotosYLocales(remoteFindings, prevLocal);
            hallazgosRef.current = merged;
            return merged;
          });
          if (onUpdateOrden) {
            onUpdateOrden(remoteOrder);
          }
        }
      } catch {}
    };

    // Ejecutar inmediatamente al montar/cambiar orden para traer lo grabado en móvil
    pullDesdeNeon();
    const timer = setInterval(pullDesdeNeon, 2500);
    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        pullDesdeNeon();
      }
    };
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      cancelado = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [ordenActiva?.id, fusionarHallazgosRemotosYLocales, onUpdateOrden]);

  // Persistir hallazgos y evaluaciones en Neon DB con actualización optimista inmediata
  const sincronizarHallazgosNeon = useCallback(
    async (
      nuevosHallazgos: InspectionFinding[],
      firmaUrl?: string | null,
      evals?: Record<string, any>,
      seccionId?: string
    ) => {
      if (!ordenActiva) return;

      lastLocalMutationRef.current = Date.now();
      const currentReqId = ++syncRequestIdRef.current;

      // 1. Inmediato y Optimista: actualizar la orden en memoria y persistir en Neon PostgreSQL
      prevFindingsJsonRef.current = JSON.stringify(nuevosHallazgos);

      if (onUpdateOrden) {
        const payloadOrden = {
          ...ordenActiva,
          inspectionFindings: nuevosHallazgos,
          ...(firmaUrl !== undefined ? { receptionSignatureUrl: firmaUrl } : {}),
          ...(evals !== undefined ? { inspectionChecklist: evals } : {}),
        };
        // Ejecutar en el siguiente tick para evitar 'Cannot update a component while rendering a different component'
        setTimeout(() => {
          if (onUpdateOrden) {
            onUpdateOrden(payloadOrden);
          }
        }, 0);
      }

      // 2. Persistir en Neon DB
      try {
        const payload: any = {
          action: "GUARDAR_ETAPA_3_INSPECCION",
          orderId: ordenActiva.id,
          findings: nuevosHallazgos,
        };
        if (firmaUrl !== undefined) {
          payload.receptionSignatureUrl = firmaUrl;
        }
        if (evals !== undefined) {
          payload.inspectionChecklist = evals;
          payload.inspectionTemplateId = seccionId || seccionActiva;
        }

        const res = await fetch("/api/taller/operacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (currentReqId === syncRequestIdRef.current && data.success && data.activeOrder && onUpdateOrden) {
          prevFindingsJsonRef.current = JSON.stringify(data.activeOrder.inspectionFindings || []);
          onUpdateOrden(data.activeOrder);
        }
      } catch (err) {
        console.warn("Aviso de sincronización de inspección:", err);
      }
    },
    [ordenActiva, onUpdateOrden, seccionActiva]
  );

  // 1. ESQUEMA INTERACTIVO: DETECCIÓN DE TOQUE EN COORDENADAS PORCENTUALES Y PINES NUMERADOS (RATÓN Y TÁCTIL MÓVIL)
  const handleTocarLienzo = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    // Solo permitir colocar o reubicar un pin cuando se haya presionado previamente "+ Generar" o "Reubicar"
    if (!modoColocandoPin && !pinReubicandoId) {
      return;
    }
    const ahora = Date.now();
    if (ahora - ultimoToquePinRef.current < 600) return;
    ultimoToquePinRef.current = ahora;

    const rect = e.currentTarget.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ("touches" in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("changedTouches" in e && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    // VALIDACIÓN: Solo permitir marcar números directamente SOBRE el vehículo.
    // Ignorar toques en el contorno exterior del lienzo, esquinas, controles y fondo vacío.
    const imgRefActivo = seccionActiva === "carroceria" ? imagenVehiculoRef : imagenMecanicaRef;
    if (imgRefActivo.current) {
      const imgRect = imgRefActivo.current.getBoundingClientRect();
      const margenX = imgRect.width * 0.03;
      const margenY = imgRect.height * 0.04;
      const minX = imgRect.left + margenX;
      const maxX = imgRect.right - margenX;
      const minY = imgRect.top + margenY;
      const maxY = imgRect.bottom - margenY;

      const estaDentroDelVehiculo =
        clientX >= minX &&
        clientX <= maxX &&
        clientY >= minY &&
        clientY <= maxY;

      if (!estaDentroDelVehiculo) {
        return;
      }
    }

    const xPct = Math.max(5, Math.min(95, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(5, Math.min(95, Math.round(((clientY - rect.top) / rect.height) * 100)));

    if (pinReubicandoId) {
      const pinObj = hallazgos.find((h) => h.id === pinReubicandoId);
      if (pinObj) {
        const mismoNumero = pinObj.pinNumber || 1;
        const actualizados = hallazgos.map((h) => {
          if ((h.pinNumber || 1) === mismoNumero && h.vista === pinObj.vista) {
            return { ...h, x: xPct, y: yPct };
          }
          return h;
        });
        setHallazgos(actualizados);
        sincronizarHallazgosNeon(actualizados);
        setPinReubicandoId(null);
        mostrarToast(`✓ Pin #${mismoNumero} reubicado en nueva posición.`);
      }
      return;
    }

    // Modo colocación de nuevo Pin
    const maxNum = hallazgos.reduce((max, h) => Math.max(max, h.pinNumber || 0), 0);
    const nuevoPinNumero = maxNum + 1;

    const esCarroceria = seccionActiva === "carroceria";
    const esPersonalizado = seccionActiva === "personalizado";
    const vistaDestino = esCarroceria ? vistaActiva : (seccionActiva as any);

    let vistaLabel = "";
    if (esPersonalizado) {
      vistaLabel = nombreManualCategoria.trim() || "Manual";
    } else if (esCarroceria) {
      if (vistaActiva === "manual") {
        vistaLabel = subcategoriaManualCarroceria.trim()
          ? `Carrocería · ${subcategoriaManualCarroceria.trim()}`
          : "Carrocería · Manual";
      } else {
        vistaLabel =
          vistaActiva === "frontal"
            ? "Frontal"
            : vistaActiva === "trasera"
            ? "Trasera"
            : vistaActiva === "lateral_izq"
            ? "Lateral Izq"
            : vistaActiva === "lateral_der"
            ? "Lateral Der"
            : "Superior";
      }
    } else {
      vistaLabel =
        seccionActiva === "motor"
          ? "Motor"
          : seccionActiva === "frenos"
          ? "Frenos"
          : seccionActiva === "suspension"
          ? "Suspensión"
          : seccionActiva === "aire"
          ? "Aire Acondicionado"
          : "Eléctrico";
    }

    let zonaCalculada = vistaLabel;
    if (esPersonalizado) {
      const sub = nombreManualSubcategoria.trim() || "Manual";
      zonaCalculada = `${vistaLabel} · ${sub}`;
    } else if (esCarroceria) {
      if (vistaActiva === "manual" && subcategoriaManualCarroceria.trim()) {
        zonaCalculada = `Carrocería · ${subcategoriaManualCarroceria.trim()}`;
      } else {
        zonaCalculada = vistaLabel;
      }
    } else {
      const subActual = subCategoriaPorSistema[seccionActiva];
      if (subActual === "Manual") {
        const subManual = subcategoriaManualPorSistema[seccionActiva]?.trim() || "Manual";
        zonaCalculada = `${vistaLabel} · ${subManual}`;
      } else if (subActual) {
        zonaCalculada = `${vistaLabel} · ${subActual}`;
      }
    }

    const tipoDefault = "";

    const nuevoHallazgo: InspectionFinding = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vista: vistaDestino,
      vistaLabel: vistaLabel,
      x: xPct,
      y: yPct,
      zona: zonaCalculada,
      tipo: tipoDefault,
      descripcion: "",
      pinNumber: nuevoPinNumero,
    };

    const actualizados = [...hallazgos, nuevoHallazgo];
    setHallazgos(actualizados);
    setPinSeleccionadoId(nuevoHallazgo.id);
    setTipoSeleccionado("");
    setObservacionTexto("");
    setPopoverAbierto(true);
    setModoColocandoPin(false);

    sincronizarHallazgosNeon(actualizados);
    mostrarToast(`✓ Pin #${nuevoPinNumero} ubicado en ${vistaLabel}.`);
  };

  const pinActual = hallazgos.find((h) => h.id === pinSeleccionadoId) || null;
  const debounceSyncPinRef = useRef<NodeJS.Timeout | null>(null);

  const handleGuardarDetallePin = (tipo: string, obs?: string, explicitPinId?: string) => {
    const idTarget = explicitPinId || pinSeleccionadoId;
    if (!idTarget) return;
    lastLocalMutationRef.current = Date.now();
    const prev = hallazgosRef.current;
    const actualizados = prev.map((h) => {
      if (h.id === idTarget) {
        return {
          ...h,
          tipo: tipo !== undefined ? tipo : h.tipo,
          descripcion: obs !== undefined ? obs : h.descripcion,
        };
      }
      return h;
    });
    hallazgosRef.current = actualizados;
    prevFindingsJsonRef.current = JSON.stringify(actualizados);
    setHallazgos(actualizados);
    if (debounceSyncPinRef.current) clearTimeout(debounceSyncPinRef.current);
    debounceSyncPinRef.current = setTimeout(() => {
      sincronizarHallazgosNeon(hallazgosRef.current);
    }, 300);
  };

  const handleEliminarPin = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const pinAEliminar = hallazgos.find((h) => h.id === id);
    if (!pinAEliminar) return;

    const mismoNumero = pinAEliminar.pinNumber || 1;
    // Eliminar todos los hallazgos que correspondan a este mismo pin y vista
    const pinsAEliminar = hallazgos.filter(
      (h) => (h.pinNumber || 1) === mismoNumero && h.vista === pinAEliminar.vista
    );
    const actualizados = hallazgos.filter(
      (h) => !((h.pinNumber || 1) === mismoNumero && h.vista === pinAEliminar.vista)
    );

    setHallazgos(actualizados);
    setPinSeleccionadoId(null);
    setPopoverAbierto(false);
    sincronizarHallazgosNeon(actualizados);

    // Si los hallazgos tenían ítems vinculados, removerlos de ordenActiva.items para mantener sincronía
    if (ordenActiva && onUpdateOrden) {
      const linkedIds = new Set(pinsAEliminar.flatMap((p) => (p.linkedItems || []).map((it) => it.id)));
      const categoriaPrefix = `Inspección - Pin #${mismoNumero}`;

      const itemsRestantes = (ordenActiva.items || []).filter(
        (it) => !linkedIds.has(it.id) && !it.category?.startsWith(categoriaPrefix)
      );

      if (itemsRestantes.length !== (ordenActiva.items || []).length) {
        const nuevoTotalCost = itemsRestantes.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.qty) || 1)), 0);
        const ordenActualizada: UnifiedOrder = {
          ...ordenActiva,
          inspectionFindings: actualizados,
          items: itemsRestantes,
          totalCost: nuevoTotalCost,
        };
        onUpdateOrden(ordenActualizada);

        try {
          await fetch("/api/taller/operacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "GUARDAR_ETAPA_4_PRESUPUESTO",
              orderId: ordenActiva.id,
              items: itemsRestantes,
              totalCost: nuevoTotalCost,
            }),
          });
        } catch (err) {
          console.error("Error al sincronizar presupuesto al eliminar pin:", err);
        }
      }
    }

    mostrarToast(`Pin #${mismoNumero} eliminado.`);
  };

  const handleEliminarHallazgoEspecifico = (hallazgoId: string) => {
    const pinAEliminar = hallazgos.find((h) => h.id === hallazgoId);
    if (!pinAEliminar) return;

    const actualizados = hallazgos.filter((h) => h.id !== hallazgoId);
    setHallazgos(actualizados);
    sincronizarHallazgosNeon(actualizados);

    if (pinSeleccionadoId === hallazgoId) {
      const hermano = actualizados.find(
        (h) => (h.pinNumber || 1) === (pinAEliminar.pinNumber || 1) && h.vista === pinAEliminar.vista
      );
      if (hermano) {
        setPinSeleccionadoId(hermano.id);
        setTipoSeleccionado(hermano.tipo);
        setObservacionTexto(hermano.descripcion || "");
      } else {
        setPinSeleccionadoId(null);
        setPopoverAbierto(false);
      }
    }

    mostrarToast("Daño removido de este pin.");
  };

  // REPRODUCIR AUDIO (TEXTO A VOZ / TTS)
  const handleReproducirAudioTexto = (texto: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      mostrarToast("Tu navegador no soporta síntesis de voz.", "err");
      return;
    }

    if (reproduciendoAudio) {
      window.speechSynthesis.cancel();
      setReproduciendoAudio(false);
      return;
    }

    const textoLimpio = texto?.trim();
    if (!textoLimpio) {
      mostrarToast("No hay texto para reproducir en este pin.", "err");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang = "es-EC";
    utterance.rate = 1.0;
    utterance.onstart = () => setReproduciendoAudio(true);
    utterance.onend = () => setReproduciendoAudio(false);
    utterance.onerror = () => setReproduciendoAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  // VINCULAR SERVICIO O PRODUCTO AL PIN Y PROPUESTA DETALLADA (PRESUPUESTO)
  const handleAgregarItemPin = async (
    targetPinId: string,
    itemData: {
      id: string;
      name: string;
      code?: string;
      category?: string;
      type: "SERVICE" | "PART";
      productId?: string;
      price?: number;
      imageUrl?: string | null;
      qty?: number;
    },
    deltaQty: number = 1
  ) => {
    if (!ordenActiva || !onUpdateOrden) {
      mostrarToast("No está disponible una orden activa para enviar elementos a la propuesta.", "err");
      return;
    }

    const pin = hallazgos.find((h) => h.id === targetPinId);
    if (!pin) return;

    const itemsActuales = pin.linkedItems ? [...pin.linkedItems] : [];
    const itemIndex = itemsActuales.findIndex(
      (it) =>
        it.id === itemData.id ||
        (itemData.code && it.code === itemData.code) ||
        (it.name && it.name.toLowerCase() === itemData.name.toLowerCase())
    );

    let actualizadosPin: FindingItemLink[];
    let itemLinkId = "";

    if (itemIndex >= 0) {
      const itExistente = itemsActuales[itemIndex];
      itemLinkId = itExistente.id;
      const nuevaCant = (Number(itExistente.qty) || 1) + deltaQty;
      if (nuevaCant <= 0) {
        // Eliminar si la cantidad llega a cero o menos
        actualizadosPin = itemsActuales.filter((_, idx) => idx !== itemIndex);
      } else {
        actualizadosPin = [...itemsActuales];
        actualizadosPin[itemIndex] = {
          ...itExistente,
          qty: nuevaCant,
          price: Number(itemData.price !== undefined ? itemData.price : itExistente.price) || 0,
        };
      }
    } else {
      if (deltaQty <= 0) return;
      itemLinkId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const itemLink: FindingItemLink = {
        id: itemLinkId,
        name: itemData.name,
        price: Number(itemData.price) || 0,
        type: itemData.type,
        qty: Math.max(1, deltaQty),
        code: itemData.code,
        category: itemData.category,
        productId: itemData.type === "PART" ? (itemData.productId || itemData.id) : undefined,
        imageUrl: itemData.imageUrl || null,
      };
      actualizadosPin = [...itemsActuales, itemLink];
    }

    const nuevosHallazgos = hallazgos.map((h) => {
      if (h.id === targetPinId) {
        return { ...h, linkedItems: actualizadosPin };
      }
      return h;
    });
    setHallazgos(nuevosHallazgos);
    sincronizarHallazgosNeon(nuevosHallazgos);

    // 2. Sincronizar hacia ordenActiva.items (Presupuesto)
    if (onUpdateOrden) {
      let itemsOrden = ordenActiva.items ? [...ordenActiva.items] : [];
      const itemExistenteIndex = itemsOrden.findIndex(
        (it) =>
          it.id === itemLinkId ||
          (itemData.code && it.code === itemData.code) ||
          (it.name && it.name.toLowerCase() === itemData.name.toLowerCase())
      );

      const itemPinActualizado = actualizadosPin.find(
        (it) => it.id === itemLinkId || (itemData.code && it.code === itemData.code)
      );

      if (!itemPinActualizado) {
        // Fue removido
        itemsOrden = itemsOrden.filter((it, idx) => idx !== itemExistenteIndex);
      } else {
        const nuevoOrderItem: OrderItem = {
          id: itemPinActualizado.id,
          code:
            itemPinActualizado.code ||
            `PIN-${pin.pinNumber || 1}-${Date.now().toString(36).slice(-4)}`,
          type: itemPinActualizado.type,
          name: itemPinActualizado.name,
          category: `Inspección - Pin #${pin.pinNumber || 1} (${pin.vistaLabel || pin.vista})`,
          qty: itemPinActualizado.qty,
          price: Number(itemPinActualizado.price) || 0,
          productId: itemPinActualizado.productId,
          imageUrl: itemPinActualizado.imageUrl || null,
          status: "Pendiente",
        };

        if (itemExistenteIndex >= 0) {
          itemsOrden[itemExistenteIndex] = nuevoOrderItem;
        } else {
          itemsOrden.push(nuevoOrderItem);
        }
      }

      const nuevoTotalCost = itemsOrden.reduce(
        (sum, it) => sum + ((Number(it.price) || 0) * (Number(it.qty) || 1)),
        0
      );
      const ordenActualizada: UnifiedOrder = {
        ...ordenActiva,
        inspectionFindings: nuevosHallazgos,
        items: itemsOrden,
        totalCost: nuevoTotalCost,
      };

      onUpdateOrden(ordenActualizada);

      // Persistir presupuesto en Neon DB
      try {
        await fetch("/api/taller/operacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "GUARDAR_ETAPA_4_PRESUPUESTO",
            orderId: ordenActiva.id,
            items: itemsOrden,
            totalCost: nuevoTotalCost,
          }),
        });
      } catch (err) {
        console.error("Error al persistir ítem en presupuesto:", err);
      }
    }

    if (deltaQty > 0) {
      mostrarToast(`✓ "${itemData.name}" añadido (${deltaQty > 1 ? `+${deltaQty}` : "+1"}).`);
    } else {
      mostrarToast(`Removido/Actualizado: "${itemData.name}"`, "ok");
    }
  };

  const handleEliminarItemPin = async (targetPinId: string, itemId: string) => {
    const pin = hallazgos.find((h) => h.id === targetPinId);
    if (!pin) return;

    const itemsActuales = pin.linkedItems || [];
    const actualizadosPin = itemsActuales.filter((it) => it.id !== itemId);
    const nuevosHallazgos = hallazgos.map((h) => {
      if (h.id === targetPinId) {
        return { ...h, linkedItems: actualizadosPin };
      }
      return h;
    });
    setHallazgos(nuevosHallazgos);
    sincronizarHallazgosNeon(nuevosHallazgos);

    // Sincronizar remoción en ordenActiva.items
    if (ordenActiva && onUpdateOrden) {
      const itemsOrden = (ordenActiva.items || []).filter((it) => it.id !== itemId);
      const nuevoTotalCost = itemsOrden.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.qty) || 1)), 0);
      const ordenActualizada: UnifiedOrder = {
        ...ordenActiva,
        inspectionFindings: nuevosHallazgos,
        items: itemsOrden,
        totalCost: nuevoTotalCost,
      };
      onUpdateOrden(ordenActualizada);

      try {
        await fetch("/api/taller/operacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "GUARDAR_ETAPA_4_PRESUPUESTO",
            orderId: ordenActiva.id,
            items: itemsOrden,
            totalCost: nuevoTotalCost,
          }),
        });
      } catch (err) {
        console.error("Error al eliminar ítem de presupuesto:", err);
      }
    }

    mostrarToast("Ítem removido de la propuesta.");
  };

  // 2. FOTOS Y VIDEOS COMO EVIDENCIA EN CLOUDFLARE R2 (HASTA 5 EVIDENCIAS POR PIN)
  const handleSubirFotosPinR2 = async (e: React.ChangeEvent<HTMLInputElement>, targetPinId: string) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const pinExistente = hallazgos.find((h) => h.id === targetPinId);
    const fotosActuales = pinExistente?.photoUrls || (pinExistente?.photoUrl ? [pinExistente.photoUrl] : []);

    if (fotosActuales.length >= 5) {
      mostrarToast("Ya alcanzaste el límite de 5 evidencias para este punto.", "err");
      e.target.value = "";
      return;
    }

    const archivosSubir = files.slice(0, 5 - fotosActuales.length);

    try {
      setPinAccionActivaId(targetPinId);
      setSubiendoFotoPin(true);
      const contieneVideo = archivosSubir.some((f) => f.type.startsWith("video/"));
      const labelMedio = contieneVideo ? "evidencias" : archivosSubir.length === 1 ? "foto" : "fotos";
      mostrarToast(`Subiendo ${archivosSubir.length} ${labelMedio} a Cloudflare R2...`, "ok");

      const nuevasUrls: string[] = [];

      for (const file of archivosSubir) {
        const esVideo = file.type.startsWith("video/");
        const folder = esVideo ? "taller_videos" : "taller_inspeccion_evidencia";
        const tipo = esVideo ? "video" : "image";

        let archivoFinal: File | Blob = file;
        if (!esVideo) {
          try {
            const { file: optimizada } = await comprimirImagenEnNavegador(file);
            archivoFinal = optimizada;
          } catch {
            archivoFinal = file;
          }
        }

        const formData = new FormData();
        formData.append("file", archivoFinal, file.name || "foto_evidencia.jpg");
        formData.append("folder", folder);
        formData.append("tipo", tipo);
        if (ordenActiva?.id) formData.append("orderId", ordenActiva.id);
        if (ordenActiva?.orderNumber) formData.append("orderNumber", ordenActiva.orderNumber);
        if (ordenActiva?.plate) formData.append("plate", ordenActiva.plate);
        formData.append("uploadedBy", ordenActiva?.mechanic || "Taller Mecánico");

        const res = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          nuevasUrls.push(data.url);
        } else if (!data.success && data.error) {
          mostrarToast(`Error: ${data.error}`, "err");
        }
      }

      if (nuevasUrls.length > 0) {
        const ahora = new Date();
        const timestampExacto = ahora.toLocaleString("es-EC", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const fotosFinales = [...fotosActuales, ...nuevasUrls].slice(0, 5);

        const actualizados = hallazgos.map((h) => {
          if (h.id === targetPinId) {
            return {
              ...h,
              photoUrl: fotosFinales[0],
              photoUrls: fotosFinales,
              capturedAt: timestampExacto,
            };
          }
          return h;
        });

        setHallazgos(actualizados);
        sincronizarHallazgosNeon(actualizados);
        mostrarToast(`✓ ${nuevasUrls.length} ${nuevasUrls.length === 1 ? "evidencia guardada" : "evidencias guardadas"} en R2 (${fotosFinales.length}/5)`);
      } else {
        mostrarToast("No se pudo completar la subida a Cloudflare R2", "err");
      }
    } catch {
      mostrarToast("Error de conexión al subir evidencia a Cloudflare R2", "err");
    } finally {
      setSubiendoFotoPin(false);
      e.target.value = "";
    }
  };

  const handleEliminarFotoPin = (targetPinId: string, indexAEliminar: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actualizados = hallazgos.map((h) => {
      if (h.id === targetPinId) {
        const fotosActuales = h.photoUrls || (h.photoUrl ? [h.photoUrl] : []);
        const nuevasFotos = fotosActuales.filter((_, idx) => idx !== indexAEliminar);
        return {
          ...h,
          photoUrl: nuevasFotos[0] || undefined,
          photoUrls: nuevasFotos,
        };
      }
      return h;
    });
    setHallazgos(actualizados);
    sincronizarHallazgosNeon(actualizados);
    mostrarToast("Foto eliminada.");
  };

  const [transcribiendoVoz, setTranscribiendoVoz] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      obtenerPipelineWhisper().catch((error) => {
        console.warn("No se pudo precargar el motor de transcripción:", error);
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, []);
  const [segundosGrabandoAudio, setSegundosGrabandoAudio] = useState(0);
  const [pinAccionActivaId, setPinAccionActivaId] = useState<string | null>(null);
  const grabacionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechReconocioTextoRef = useRef(false);
  const textoNotaInicialAudioRef = useRef("");
  const whisperPipelineRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioMonitorCtxRef = useRef<AudioContext | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const pcmSampleRateRef = useRef<number>(16000);

  const obtenerPipelineWhisper = async () => {
    if (whisperPipelineRef.current) return whisperPipelineRef.current;
    const win = window as any;
    if (win.__autogWhisperInstance) {
      whisperPipelineRef.current = win.__autogWhisperInstance;
      return whisperPipelineRef.current;
    }
    if (!win.__autogWhisperPipelinePromise) {
      win.__autogWhisperPipelinePromise = (async () => {
        const dynamicImport = new Function("url", "return import(url)");
        const mod = await dynamicImport(
          "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js"
        );
        const { pipeline, env } = mod;
        if (env) {
          env.allowLocalModels = false;
          env.useBrowserCache = true;
          if (env.backends?.onnx?.wasm) {
            const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2;
            const supportsWasmThreads =
              typeof SharedArrayBuffer !== "undefined" && window.crossOriginIsolated;
            env.backends.onnx.wasm.numThreads = supportsWasmThreads
              ? Math.min(4, Math.max(1, cores))
              : 1;
            env.backends.onnx.wasm.proxy = false;
            env.backends.onnx.wasm.wasmPaths =
              "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/";
          }
        }
        const pipe = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
          quantized: true,
        });
        win.__autogWhisperInstance = pipe;
        return pipe;
      })().catch((err: any) => {
        win.__autogWhisperPipelinePromise = null;
        throw err;
      });
    }
    whisperPipelineRef.current = await win.__autogWhisperPipelinePromise;
    return whisperPipelineRef.current;
  };

  const resamplearPcmA16kHz = (samples: Float32Array, inputSampleRate: number): Float32Array => {
    if (!samples.length || inputSampleRate === 16000) return samples;
    const ratio = inputSampleRate / 16000;
    const newLength = Math.max(1, Math.round(samples.length / ratio));
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const s0 = samples[idx] ?? 0;
      const s1 = samples[idx + 1] ?? s0;
      result[i] = s0 + frac * (s1 - s0);
    }
    return result;
  };

  const recortarSilencioPcm = (samples: Float32Array, threshold = 0.008): Float32Array => {
    const len = samples.length;
    if (len < 3200) return samples;
    let start = 0;
    let end = len - 1;
    while (start < len && Math.abs(samples[start]) < threshold) start++;
    while (end > start && Math.abs(samples[end]) < threshold) end--;
    const pad = 1600; // 100ms padding at 16kHz
    start = Math.max(0, start - pad);
    end = Math.min(len - 1, end + pad);
    return samples.subarray(start, end + 1);
  };

  const normalizarAudioPcm = (samples: Float32Array): Float32Array => {
    let maxAbs = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > maxAbs) maxAbs = abs;
    }
    if (maxAbs < 0.003) return samples;
    const gain = Math.min(25, 0.85 / maxAbs);
    const out = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      out[i] = Math.max(-1, Math.min(1, samples[i] * gain));
    }
    return out;
  };

  const crearWavBlobDesdePcm = (chunks: Float32Array[], sampleRate: number): Blob | null => {
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLength === 0) return null;
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    const pcm16k = resamplearPcmA16kHz(merged, sampleRate || 48000);
    const norm = normalizarAudioPcm(pcm16k);
    const sr = 16000;
    const buffer = new ArrayBuffer(44 + norm.length * 2);
    const view = new DataView(buffer);
    const writeStr = (pos: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos + i, str.charCodeAt(i));
      }
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + norm.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, norm.length * 2, true);
    let idx = 44;
    for (let i = 0; i < norm.length; i++, idx += 2) {
      const s = Math.max(-1, Math.min(1, norm[i]));
      view.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  const blobABase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || "");
        const idx = res.indexOf(",");
        resolve(idx >= 0 ? res.slice(idx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const transcribirAudioATexto = async (
    audioBlob?: Blob | null,
    usarCapturaPcm = true
  ): Promise<string> => {
    try {
      let float32Data: Float32Array | null = null;

      if (usarCapturaPcm && pcmChunksRef.current.length > 0) {
        const totalLength = pcmChunksRef.current.reduce((acc, c) => acc + c.length, 0);
        if (totalLength > 1600) {
          const merged = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of pcmChunksRef.current) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          float32Data = resamplearPcmA16kHz(merged, pcmSampleRateRef.current || 48000);
        }
      }

      if ((!float32Data || float32Data.length < 1600) && audioBlob && audioBlob.size > 400) {
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const raw = audioBuffer.getChannelData(0);
          float32Data = resamplearPcmA16kHz(raw, audioBuffer.sampleRate);
          await audioCtx.close().catch(() => {});
        } catch {}
      }

      if (!float32Data || float32Data.length < 1600) {
        return "";
      }

      // Normalizar ganancia y recortar silencios antes de enviar para respuesta en ~250ms
      const audioRecortado = recortarSilencioPcm(normalizarAudioPcm(float32Data));

      // 1. Motor residente ultra-rápido Windows System.Speech en servidor (~250ms)
      let daemonResponded = false;
      try {
        const wav16k = crearWavBlobDesdePcm([audioRecortado], 16000);
        if (wav16k) {
          const base64Wav = await blobABase64(wav16k);
          const resSrv = await fetch("/api/taller/pc-mic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "transcribe", audioBase64: base64Wav }),
          });
          if (resSrv.ok) {
            const dataSrv = await resSrv.json();
            if (dataSrv?.engine === "native_daemon") {
              daemonResponded = true;
            }
            const srvText = String(dataSrv?.text || "").trim();
            if (srvText) {
              return srvText;
            }
          }
        }
      } catch {}

      // Si el motor residente nativo ya procesó el audio en servidor, no bloquear el navegador con Whisper
      if (daemonResponded) {
        return "";
      }

      // 2. Respaldo con Whisper únicamente si el servidor nativo no está disponible
      const pipe = await obtenerPipelineWhisper();
      const output = await pipe(audioRecortado, {
        language: "spanish",
        task: "transcribe",
        chunk_length_s: 15,
        stride_length_s: 3,
      });

      const rawText = String(output?.text || "")
        .replace(/\[.*?\]|\(.*?\)/g, "")
        .trim();
      return rawText;
    } catch (error) {
      console.error("Error en transcripción de voz a texto:", error);
      return "";
    }
  };

  // SUBIR ARCHIVO DE AUDIO DIRECTO DESDE PC O MÓVIL COMO RESPALDO
  const handleSubirArchivoAudioPinR2 = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetPinId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const localPreviewUrl = URL.createObjectURL(file);
    let idxNuevoAudio = 0;
    lastLocalMutationRef.current = Date.now();
    const hallazgosActualizados = hallazgosRef.current.map((h) => {
      if (h.id === targetPinId) {
        const prevAudios = h.audioUrls || (h.audioUrl ? [h.audioUrl] : []);
        idxNuevoAudio = prevAudios.length;
        const nuevosAudios = [...prevAudios, localPreviewUrl];
        const prevKanban = Array.isArray((h as any).kanbanNotes)
          ? [...(h as any).kanbanNotes]
          : [];
        prevKanban.push({
          id: `kn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          text: "⏳ Transcribiendo audio a nota...",
          createdAt: new Date().toISOString(),
          source: "audio",
          audioIndex: idxNuevoAudio,
        });
        return {
          ...h,
          audioUrl: nuevosAudios[0],
          audioUrls: nuevosAudios,
          kanbanNotes: prevKanban,
        } as InspectionFinding;
      }
      return h;
    });
    hallazgosRef.current = hallazgosActualizados;
    prevFindingsJsonRef.current = JSON.stringify(hallazgosActualizados);
    setHallazgos(hallazgosActualizados);
    sincronizarHallazgosNeon(hallazgosActualizados);

    try {
      setTranscribiendoVoz(true);
      const textoTranscrito = await transcribirAudioATexto(file, false);
      setTranscribiendoVoz(false);
      agregarNotaKanbanEnPin(
        targetPinId,
        textoTranscrito || `Nota de voz #${idxNuevoAudio + 1} (edita el detalle aquí)`,
        idxNuevoAudio
      );

      const formData = new FormData();
      formData.append("file", file, file.name || `audio_${targetPinId}_${Date.now()}.webm`);
      formData.append("folder", "taller_notas_voz");
      formData.append("tipo", "audio");
      if (ordenActiva?.id) formData.append("orderId", ordenActiva.id);
      if (ordenActiva?.orderNumber) formData.append("orderNumber", ordenActiva.orderNumber);
      if (ordenActiva?.plate) formData.append("plate", ordenActiva.plate);
      formData.append("uploadedBy", ordenActiva?.mechanic || "Taller Mecánico");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        lastLocalMutationRef.current = Date.now();
        const prev = hallazgosRef.current;
        const actualizados = prev.map((h) => {
          if (h.id === targetPinId) {
            const prevAudios = h.audioUrls || (h.audioUrl ? [h.audioUrl] : []);
            const nuevosAudios = prevAudios.map((u) => (u === localPreviewUrl ? data.url : u));
            if (!nuevosAudios.includes(data.url)) {
              nuevosAudios.push(data.url);
            }
            return {
              ...h,
              audioUrl: nuevosAudios[0],
              audioUrls: nuevosAudios,
            };
          }
          return h;
        });
        hallazgosRef.current = actualizados;
        prevFindingsJsonRef.current = JSON.stringify(actualizados);
        setHallazgos(actualizados);
        sincronizarHallazgosNeon(actualizados);
      }
    } catch (error) {
      setTranscribiendoVoz(false);
      console.error("Error al guardar o transcribir el audio:", error);
    }
  };

  const agregarNotaKanbanEnPin = (
    targetPinId: string,
    textoNota: string,
    audioIndex?: number,
    persistirInmediato: boolean = true
  ) => {
    const limpio = textoNota.trim();
    if (!limpio) return;

    lastLocalMutationRef.current = Date.now();
    const prev = hallazgosRef.current;
    const actualizados = prev.map((h) => {
      if (h.id === targetPinId) {
        const prevAudios = h.audioUrls || (h.audioUrl ? [h.audioUrl] : []);
        const idxAudio =
          typeof audioIndex === "number" ? audioIndex : Math.max(0, prevAudios.length - 1);
        const prevKanban = Array.isArray((h as any).kanbanNotes)
          ? [...(h as any).kanbanNotes]
          : [];
        const prevAudioNotes = Array.isArray((h as any).audioNotes)
          ? [...(h as any).audioNotes]
          : [];

        const existingIdx =
          typeof audioIndex === "number"
            ? prevKanban.findIndex((n: any) => n.audioIndex === audioIndex)
            : -1;

        if (existingIdx >= 0) {
          prevKanban[existingIdx] = {
            ...prevKanban[existingIdx],
            text: limpio,
          };
        } else {
          prevKanban.push({
            id: `kn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: limpio,
            createdAt: new Date().toISOString(),
            source: "audio",
            audioIndex: idxAudio,
          });
        }
        prevAudioNotes[idxAudio] = limpio;

        return {
          ...h,
          audioNotes: prevAudioNotes,
          kanbanNotes: prevKanban,
        } as InspectionFinding;
      }
      return h;
    });

    hallazgosRef.current = actualizados;
    prevFindingsJsonRef.current = JSON.stringify(actualizados);
    setHallazgos(actualizados);
    if (persistirInmediato) {
      sincronizarHallazgosNeon(actualizados);
    } else {
      if (debounceSyncPinRef.current) clearTimeout(debounceSyncPinRef.current);
      debounceSyncPinRef.current = setTimeout(() => {
        sincronizarHallazgosNeon(hallazgosRef.current);
      }, 250);
    }
  };

  const handleEditarNotaKanbanPin = (
    targetPinId: string,
    noteIndex: number,
    nuevoTexto: string
  ) => {
    lastLocalMutationRef.current = Date.now();
    const prev = hallazgosRef.current;
    const actualizados = prev.map((h) => {
      if (h.id === targetPinId) {
        const prevKanban = Array.isArray((h as any).kanbanNotes)
          ? [...(h as any).kanbanNotes]
          : [];
        const prevAudioNotes = Array.isArray((h as any).audioNotes)
          ? [...(h as any).audioNotes]
          : [];
        if (prevKanban[noteIndex]) {
          prevKanban[noteIndex] = { ...prevKanban[noteIndex], text: nuevoTexto };
          const aIdx = prevKanban[noteIndex].audioIndex;
          if (typeof aIdx === "number") {
            prevAudioNotes[aIdx] = nuevoTexto;
          }
        }
        return {
          ...h,
          audioNotes: prevAudioNotes,
          kanbanNotes: prevKanban,
        } as InspectionFinding;
      }
      return h;
    });
    hallazgosRef.current = actualizados;
    prevFindingsJsonRef.current = JSON.stringify(actualizados);
    setHallazgos(actualizados);
    if (debounceSyncPinRef.current) clearTimeout(debounceSyncPinRef.current);
    debounceSyncPinRef.current = setTimeout(() => {
      sincronizarHallazgosNeon(hallazgosRef.current);
    }, 250);
  };

  const handleEliminarNotaKanbanPin = (targetPinId: string, noteIndex: number) => {
    lastLocalMutationRef.current = Date.now();
    const prev = hallazgosRef.current;
    const actualizados = prev.map((h) => {
      if (h.id === targetPinId) {
        const prevKanban = Array.isArray((h as any).kanbanNotes)
          ? [...(h as any).kanbanNotes]
          : [];
        const prevAudioNotes = Array.isArray((h as any).audioNotes)
          ? [...(h as any).audioNotes]
          : [];
        const eliminada = prevKanban[noteIndex];
        if (eliminada && typeof eliminada.audioIndex === "number") {
          prevAudioNotes[eliminada.audioIndex] = "";
        }
        const filtradas = prevKanban.filter((_: any, idx: number) => idx !== noteIndex);
        return {
          ...h,
          audioNotes: prevAudioNotes,
          kanbanNotes: filtradas,
        } as InspectionFinding;
      }
      return h;
    });
    hallazgosRef.current = actualizados;
    prevFindingsJsonRef.current = JSON.stringify(actualizados);
    setHallazgos(actualizados);
    sincronizarHallazgosNeon(actualizados);
    mostrarToast("Nota Kanban eliminada.");
  };

  const handleTranscribirAudioExistente = async (audioUrl: string, targetPinId: string) => {
    setPinAccionActivaId(targetPinId);
    setTranscribiendoVoz(true);

    const hallazgoInicial = hallazgosRef.current.find((h) => h.id === targetPinId);
    const listaAudiosInicial =
      hallazgoInicial?.audioUrls || (hallazgoInicial?.audioUrl ? [hallazgoInicial.audioUrl] : []);
    const audioIdx = Math.max(0, listaAudiosInicial.indexOf(audioUrl));

    // 1. Crear la tarjeta Kanban ENSEGUIDA (0ms) para que quede visible y guardada al instante
    agregarNotaKanbanEnPin(targetPinId, "⏳ Convirtiendo audio en nota...", audioIdx, true);

    try {
      let audioBlob: Blob | null = null;
      if (audioUrl.startsWith("data:")) {
        const commaIdx = audioUrl.indexOf(",");
        const binStr = atob(commaIdx >= 0 ? audioUrl.slice(commaIdx + 1) : audioUrl);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: "audio/wav" });
      } else {
        const audioLocation = new URL(audioUrl, window.location.origin);
        if (audioLocation.pathname === "/api/storage/download" && audioLocation.searchParams.has("key")) {
          audioLocation.searchParams.set("inline", "1");
        }

        const response = await fetch(audioLocation.toString());
        if (!response.ok) {
          throw new Error(`No se pudo descargar el audio (${response.status}).`);
        }

        audioBlob = await response.blob();
      }

      const textoTranscrito = await transcribirAudioATexto(audioBlob, false);
      const textoFinal =
        textoTranscrito.trim() || `Nota #${audioIdx + 1}`;

      agregarNotaKanbanEnPin(targetPinId, textoFinal, audioIdx, true);
      mostrarToast("✓ Audio transformado en tarjeta de nota Kanban.");
    } catch (error) {
      console.error("Error al transcribir audio guardado:", error);
      agregarNotaKanbanEnPin(
        targetPinId,
        `Nota #${audioIdx + 1}`,
        audioIdx,
        true
      );
    } finally {
      setTranscribiendoVoz(false);
      setPinAccionActivaId(null);
    }
  };

  // Auto-transcribir en PC cualquier audio que aún no tenga su tarjeta Kanban de texto
  useEffect(() => {
    if (escuchandoVoz || transcribiendoVoz) return;
    for (const h of hallazgos) {
      const audios = h.audioUrls || (h.audioUrl ? [h.audioUrl] : []);
      const kanban = Array.isArray((h as any).kanbanNotes) ? (h as any).kanbanNotes : [];

      for (let aIdx = 0; aIdx < audios.length; aIdx++) {
        const url = audios[aIdx];
        if (!url) continue;

        const existingKanban = kanban.find((n: any) => n.audioIndex === aIdx);
        const existingText = (existingKanban?.text || "").trim();
        const esPlaceholder =
          !existingText ||
          existingText.includes("Convirtiendo audio") ||
          existingText.includes("(escribe o edita aquí el detalle)");

        const key = `${h.id}::${aIdx}::${url}`;
        if (esPlaceholder && !autoTranscribedUrlsRef.current.has(key)) {
          autoTranscribedUrlsRef.current.add(key);
          handleTranscribirAudioExistente(url, h.id);
          return;
        }
      }
    }
  }, [hallazgos, escuchandoVoz, transcribiendoVoz]);

  // DICTADO POR VOZ (AUDIO A TEXTO) Y GRABACIÓN DE AUDIO REAL EN CLOUDFLARE R2 + MICRÓFONO NATIVO PC
  const pcMicSessionRef = useRef<{ sessionId: string; targetPinId: string } | null>(null);
  const textoReconocidoAudioRef = useRef<string>("");
  const activeAudioNoteIndexRef = useRef<number>(0);

  const guardarAudioBlobEnPin = async (
    targetPinId: string,
    audioBlob: Blob,
    mimeFinal: string,
    fallbackDataUri?: string,
    textoNotaKanban?: string,
    explicitAudioIdx?: number
  ): Promise<number> => {
    const localPreviewUrl = fallbackDataUri || URL.createObjectURL(audioBlob);
    const limpioNota = (textoNotaKanban || "").trim();
    let idxAudioAsignado = typeof explicitAudioIdx === "number" ? explicitAudioIdx : 0;

    lastLocalMutationRef.current = Date.now();
    const prevInit = hallazgosRef.current;
    const actualizadosInit = prevInit.map((h) => {
      if (h.id === targetPinId) {
        const prevAudios = h.audioUrls || (h.audioUrl ? [h.audioUrl] : []);
        const idxAudio =
          typeof explicitAudioIdx === "number" ? explicitAudioIdx : prevAudios.length;
        idxAudioAsignado = idxAudio;
        const nuevosAudios = [...prevAudios];
        if (idxAudio < nuevosAudios.length) {
          nuevosAudios[idxAudio] = localPreviewUrl;
        } else {
          nuevosAudios.push(localPreviewUrl);
        }

        const prevKanban = Array.isArray((h as any).kanbanNotes)
          ? [...(h as any).kanbanNotes]
          : [];
        const prevAudioNotes = Array.isArray((h as any).audioNotes)
          ? [...(h as any).audioNotes]
          : [];

        if (limpioNota) {
          const existingKanbanIdx = prevKanban.findIndex((n: any) => n.audioIndex === idxAudio);
          if (existingKanbanIdx >= 0) {
            prevKanban[existingKanbanIdx] = {
              ...prevKanban[existingKanbanIdx],
              text: limpioNota,
            };
          } else {
            prevKanban.push({
              id: `kn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              text: limpioNota,
              createdAt: new Date().toISOString(),
              source: "audio",
              audioIndex: idxAudio,
            });
          }
          prevAudioNotes[idxAudio] = limpioNota;
        }

        return {
          ...h,
          audioUrl: nuevosAudios[0],
          audioUrls: nuevosAudios,
          audioNotes: prevAudioNotes,
          kanbanNotes: prevKanban,
        } as InspectionFinding;
      }
      return h;
    });
    hallazgosRef.current = actualizadosInit;
    prevFindingsJsonRef.current = JSON.stringify(actualizadosInit);
    setHallazgos(actualizadosInit);
    sincronizarHallazgosNeon(actualizadosInit);

    // Subir archivo de audio a Cloudflare R2 en segundo plano sin bloquear la nota Kanban
    void (async () => {
      try {
        const formData = new FormData();
        const ext = mimeFinal.includes("wav")
          ? "wav"
          : mimeFinal.includes("mp4")
          ? "mp4"
          : mimeFinal.includes("aac")
          ? "aac"
          : "webm";
        formData.append("file", audioBlob, `audio_${targetPinId}_${Date.now()}.${ext}`);
        formData.append("folder", "taller_notas_voz");
        formData.append("tipo", "audio");
        if (ordenActiva?.id) formData.append("orderId", ordenActiva.id);
        if (ordenActiva?.orderNumber) formData.append("orderNumber", ordenActiva.orderNumber);
        if (ordenActiva?.plate) formData.append("plate", ordenActiva.plate);
        formData.append("uploadedBy", ordenActiva?.mechanic || "Taller Mecánico");

        const res = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          lastLocalMutationRef.current = Date.now();
          const prev = hallazgosRef.current;
          const actualizados = prev.map((h) => {
            if (h.id === targetPinId) {
              const prevAudios = h.audioUrls || (h.audioUrl ? [h.audioUrl] : []);
              const nuevosAudios = prevAudios.map((u) => (u === localPreviewUrl ? data.url : u));
              if (!nuevosAudios.includes(data.url)) {
                nuevosAudios.push(data.url);
              }
              return {
                ...h,
                audioUrl: nuevosAudios[0],
                audioUrls: nuevosAudios,
              };
            }
            return h;
          });
          hallazgosRef.current = actualizados;
          prevFindingsJsonRef.current = JSON.stringify(actualizados);
          setHallazgos(actualizados);
          sincronizarHallazgosNeon(actualizados);
        }
      } catch {
        // Conservar vista previa local
      }
    })();

    return idxAudioAsignado;
  };

  const iniciarReconocimientoEnVivo = (
    tipoPin: string,
    targetPinId: string,
    autoStopOnSilence: boolean,
    onFatalError?: () => void,
    soloCapturarParaNotaKanban: boolean = false
  ): boolean => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) return false;

    try {
      const recognition = new SpeechRecognition();
      const navLang = typeof navigator !== "undefined" ? navigator.language : "es-EC";
      recognition.lang = navLang && navLang.startsWith("es") ? navLang : "es-EC";
      const esAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
      recognition.continuous = !esAndroid;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let falloRed = false;

      const resetSilenceAutoStop = () => {
        if (!autoStopOnSilence) return;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (dictandoActivoRef.current && speechReconocioTextoRef.current) {
            dictandoActivoRef.current = false;
            setEscuchandoVoz(false);
            if (grabacionTimerRef.current) {
              clearInterval(grabacionTimerRef.current);
              grabacionTimerRef.current = null;
            }
            setSegundosGrabandoAudio(0);
            try {
              recognition.stop();
            } catch {}
            recognitionRef.current = null;
            if (!soloCapturarParaNotaKanban) {
              handleGuardarDetallePin(tipoPin, observacionTextoRef.current, targetPinId);
            }
          }
        }, 1100);
      };

      recognition.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";
        let hasFinalNow = false;

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          const chunk = String(item[0]?.transcript || "").trim();
          if (!chunk) continue;
          if (item.isFinal) {
            hasFinalNow = true;
            if (!finalStr.toLowerCase().endsWith(chunk.toLowerCase())) {
              finalStr = finalStr ? `${finalStr} ${chunk}` : chunk;
            }
          } else {
            if (!interimStr.toLowerCase().endsWith(chunk.toLowerCase())) {
              interimStr = interimStr ? `${interimStr} ${chunk}` : chunk;
            }
          }
        }

        const dictadoLimpio = [finalStr, interimStr].filter(Boolean).join(" ").trim();
        if (dictadoLimpio) {
          speechReconocioTextoRef.current = true;
          if (soloCapturarParaNotaKanban) {
            const baseKanban = textoNotaInicialAudioRef.current.trim();
            const textoActualizado = baseKanban
              ? `${baseKanban} ${dictadoLimpio}`
              : dictadoLimpio;
            textoReconocidoAudioRef.current = textoActualizado;
            // Actualizar la tarjeta Kanban EN VIVO y guardarla enseguida
            agregarNotaKanbanEnPin(
              targetPinId,
              textoActualizado,
              activeAudioNoteIndexRef.current,
              hasFinalNow
            );
          } else {
            const base = textoBaseRef.current.trim();
            const nuevoTexto = base ? `${base} ${dictadoLimpio}` : dictadoLimpio;
            observacionTextoRef.current = nuevoTexto;
            setObservacionTexto(nuevoTexto);
            if (hasFinalNow) {
              handleGuardarDetallePin(tipoPin, nuevoTexto, targetPinId);
            }
          }
          resetSilenceAutoStop();
        }
      };

      recognition.onerror = (event: any) => {
        const errCode = event?.error || "";
        if (errCode === "no-speech" || errCode === "aborted") return;
        if (
          errCode === "network" ||
          errCode === "service-not-allowed" ||
          errCode === "audio-capture" ||
          errCode === "language-not-supported"
        ) {
          falloRed = true;
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          try {
            recognition.stop();
          } catch {}
          recognitionRef.current = null;
          if (onFatalError) onFatalError();
        }
      };

      recognition.onend = () => {
        if (soloCapturarParaNotaKanban) {
          textoNotaInicialAudioRef.current = textoReconocidoAudioRef.current;
          if (textoReconocidoAudioRef.current.trim()) {
            agregarNotaKanbanEnPin(
              targetPinId,
              textoReconocidoAudioRef.current.trim(),
              activeAudioNoteIndexRef.current,
              true
            );
          }
        } else {
          textoBaseRef.current = observacionTextoRef.current;
          if (speechReconocioTextoRef.current) {
            handleGuardarDetallePin(tipoPin, observacionTextoRef.current, targetPinId);
          }
        }
        if (dictandoActivoRef.current && !falloRed) {
          try {
            recognition.start();
          } catch {
            if (autoStopOnSilence) {
              dictandoActivoRef.current = false;
              setEscuchandoVoz(false);
              if (grabacionTimerRef.current) {
                clearInterval(grabacionTimerRef.current);
                grabacionTimerRef.current = null;
              }
              setSegundosGrabandoAudio(0);
            }
          }
        } else if (autoStopOnSilence && !falloRed) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setEscuchandoVoz(false);
          if (grabacionTimerRef.current) {
            clearInterval(grabacionTimerRef.current);
            grabacionTimerRef.current = null;
          }
          setSegundosGrabandoAudio(0);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch {
      return false;
    }
  };

  const handleToggleVozPin = async (
    targetPinId: string,
    textoActualDirecto?: string,
    modo: "dictado" | "audio" = "dictado"
  ) => {
    const pinObjetivo = hallazgos.find((h) => h.id === targetPinId);
    const tipoPin = pinObjetivo?.tipo || tipoSeleccionado;

    if (escuchandoVoz) {
      dictandoActivoRef.current = false;
      if (grabacionTimerRef.current) {
        clearInterval(grabacionTimerRef.current);
        grabacionTimerRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }

      const activePcSession = pcMicSessionRef.current;
      pcMicSessionRef.current = null;

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      } else if (audioStreamRef.current) {
        try {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        audioStreamRef.current = null;
      }

      setEscuchandoVoz(false);
      setSegundosGrabandoAudio(0);

      // Si estaba grabando con el micrófono nativo de Windows PC, obtener el WAV, asociarlo y crear nota Kanban enseguida
      if (activePcSession) {
        try {
          const res = await fetch("/api/taller/pc-mic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "stop",
              sessionId: activePcSession.sessionId,
            }),
          });
          const data = await res.json();
          if (data?.success && data?.audioBase64) {
            const binStr = atob(data.audioBase64);
            const bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) {
              bytes[i] = binStr.charCodeAt(i);
            }
            const wavBlob = new Blob([bytes], { type: "audio/wav" });
            const dataUri = `data:audio/wav;base64,${data.audioBase64}`;

            const textoInmediato =
              String(data?.text || "").trim() || textoReconocidoAudioRef.current.trim();

            // Guardar audio y crear la tarjeta Kanban ENSEGUIDA (0ms)
            const idxAudio = await guardarAudioBlobEnPin(
              activePcSession.targetPinId,
              wavBlob,
              "audio/wav",
              dataUri,
              textoInmediato || "⏳ Convirtiendo audio en nota...",
              activeAudioNoteIndexRef.current
            );

            if (!textoInmediato && wavBlob.size > 400) {
              setTranscribiendoVoz(true);
              try {
                const textoTranscrito = await transcribirAudioATexto(wavBlob, false);
                const finalTxt =
                  textoTranscrito.trim() ||
                  textoReconocidoAudioRef.current.trim() ||
                  `Nota de Voz #${idxAudio + 1}`;
                agregarNotaKanbanEnPin(activePcSession.targetPinId, finalTxt, idxAudio, true);
              } finally {
                setTranscribiendoVoz(false);
              }
            }
          }
        } catch (error) {
          setTranscribiendoVoz(false);
          console.error("Error al recuperar o transcribir el audio grabado:", error);
        }
      }
      return;
    }

    const textoPrevio = (
      typeof textoActualDirecto === "string"
        ? textoActualDirecto
        : observacionTextoRef.current || observacionTexto || pinObjetivo?.descripcion || ""
    ).trim();

    const audiosExistentesPin =
      pinObjetivo?.audioUrls || (pinObjetivo?.audioUrl ? [pinObjetivo.audioUrl] : []);
    activeAudioNoteIndexRef.current = audiosExistentesPin.length;

    textoBaseRef.current = textoPrevio;
    textoNotaInicialAudioRef.current = "";
    textoReconocidoAudioRef.current = "";
    observacionTextoRef.current = textoPrevio;
    speechReconocioTextoRef.current = false;
    pcmChunksRef.current = [];
    setPinAccionActivaId(targetPinId);

    const esMovil =
      typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const iniciarGrabadoraRespaldo = async (): Promise<boolean> => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        return true;
      }
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }
      try {
        fetch("/api/taller/pc-mic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "warmup" }),
        }).catch(() => {});
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        audioStreamRef.current = stream;
        const mimeType = getBestSupportedAudioMimeType();
        const options: MediaRecorderOptions = {};
        if (mimeType) options.mimeType = mimeType;
        const recorder = new MediaRecorder(stream, options);
        audioChunksRef.current = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = async () => {
          if (grabacionTimerRef.current) {
            clearInterval(grabacionTimerRef.current);
            grabacionTimerRef.current = null;
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          if (audioMonitorCtxRef.current) {
            await audioMonitorCtxRef.current.close().catch(() => {});
            audioMonitorCtxRef.current = null;
          }
          stream.getTracks().forEach((track) => track.stop());
          if (audioStreamRef.current === stream) {
            audioStreamRef.current = null;
          }

          const mime = recorder.mimeType || mimeType || "audio/webm";
          const rawBlob = new Blob(audioChunksRef.current, { type: mime });
          const wavRespaldo =
            pcmChunksRef.current.length > 0
              ? crearWavBlobDesdePcm(pcmChunksRef.current, pcmSampleRateRef.current || 48000)
              : null;
          const audioBlob = rawBlob.size > 200 ? rawBlob : wavRespaldo || rawBlob;
          const mimeFinal = audioBlob === wavRespaldo ? "audio/wav" : mime;

          // Si es GRABACIÓN DE NOTA DE AUDIO (botón de micrófono en evidencia):
          // 1. Guardar el audio y crear la tarjeta Kanban ENSEGUIDA (0ms, sin esperar a Whisper)
          if (modo === "audio") {
            if (audioBlob.size < 50 && !wavRespaldo) {
              return;
            }
            const textoEnVivo = textoReconocidoAudioRef.current.trim();
            const idxAudio = await guardarAudioBlobEnPin(
              targetPinId,
              audioBlob,
              mimeFinal,
              undefined,
              textoEnVivo || "⏳ Convirtiendo audio en nota...",
              activeAudioNoteIndexRef.current
            );

            // 2. Si el reconocimiento en vivo aún no entregó texto, transcribir con servidor Windows / Whisper y actualizar la tarjeta
            if (!textoEnVivo && (pcmChunksRef.current.length > 0 || audioBlob.size > 400)) {
              setTranscribiendoVoz(true);
              try {
                const textoTranscrito = await transcribirAudioATexto(audioBlob, true);
                const textoFinal =
                  textoTranscrito.trim() ||
                  textoReconocidoAudioRef.current.trim() ||
                  `Nota de Voz #${idxAudio + 1}`;
                agregarNotaKanbanEnPin(targetPinId, textoFinal, idxAudio, true);
              } catch {
                const fallbackTxt =
                  textoReconocidoAudioRef.current.trim() ||
                  `Nota de Voz #${idxAudio + 1}`;
                agregarNotaKanbanEnPin(targetPinId, fallbackTxt, idxAudio, true);
              } finally {
                setTranscribiendoVoz(false);
              }
            }
            return;
          }

          // Modo dictado directo a Descripción
          if (
            !speechReconocioTextoRef.current &&
            (pcmChunksRef.current.length > 0 || audioBlob.size > 400)
          ) {
            setTranscribiendoVoz(true);
            try {
              const textoTranscrito = await transcribirAudioATexto(audioBlob, true);
              if (textoTranscrito) {
                const base = textoPrevio;
                const nuevoTexto = base ? `${base} ${textoTranscrito}` : textoTranscrito;
                textoBaseRef.current = nuevoTexto;
                observacionTextoRef.current = nuevoTexto;
                setObservacionTexto(nuevoTexto);
                handleGuardarDetallePin(tipoPin, nuevoTexto, targetPinId);
              }
            } catch (error) {
              console.error("No se pudo transcribir la grabación de voz:", error);
            } finally {
              setTranscribiendoVoz(false);
            }
          }
        };

        mediaRecorderRef.current = recorder;
        dictandoActivoRef.current = true;
        recorder.start(200);
        setEscuchandoVoz(true);
        setSegundosGrabandoAudio(0);
        if (grabacionTimerRef.current) clearInterval(grabacionTimerRef.current);
        grabacionTimerRef.current = setInterval(() => {
          setSegundosGrabandoAudio((s) => s + 1);
        }, 1000);

        // Capturar muestras PCM para que la transcripción sea inmediata y sin errores de códec en PC y móvil
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const actx = new AudioCtx();
          if (actx.state === "suspended") {
            await actx.resume().catch(() => {});
          }
          audioMonitorCtxRef.current = actx;
          pcmSampleRateRef.current = actx.sampleRate || 48000;

          const source = actx.createMediaStreamSource(stream);
          const processor = actx.createScriptProcessor(4096, 1, 1);
          source.connect(processor);
          processor.connect(actx.destination);

          let hablo = false;
          let ultimoSonidoMs = Date.now();

          processor.onaudioprocess = (e) => {
            if (!dictandoActivoRef.current) return;
            const input = e.inputBuffer.getChannelData(0);
            pcmChunksRef.current.push(new Float32Array(input));

            if (modo === "dictado") {
              let sumSq = 0;
              for (let i = 0; i < input.length; i++) {
                sumSq += input[i] * input[i];
              }
              const rms = Math.sqrt(sumSq / input.length);
              if (rms > 0.012) {
                hablo = true;
                ultimoSonidoMs = Date.now();
              } else if (
                hablo &&
                !speechReconocioTextoRef.current &&
                Date.now() - ultimoSonidoMs > 850
              ) {
                dictandoActivoRef.current = false;
                setEscuchandoVoz(false);
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.stop();
                  } catch {}
                  recognitionRef.current = null;
                }
                if (recorder.state !== "inactive") {
                  try {
                    recorder.stop();
                  } catch {}
                }
              }
            }
          };
        } catch {}

        return true;
      } catch {
        return false;
      }
    };

    // =========================================================================
    // MODO 1: BOTÓN DE AUDIO (NARANJA) — Graba nota de audio Y la transforma en tarjeta de nota Kanban (sin tocar Descripción)
    // =========================================================================
    if (modo === "audio") {
      // Iniciar reconocimiento en vivo en PC y Móvil para crear y actualizar la tarjeta Kanban al instante mientras habla
      dictandoActivoRef.current = true;
      iniciarReconocimientoEnVivo(tipoPin, targetPinId, false, undefined, true);

      const okBrowserMic = await iniciarGrabadoraRespaldo();
      if (okBrowserMic) {
        mostrarToast("🎙️ Grabando audio para nota Kanban... pulsa Detener al terminar.");
        return;
      }

      // Respaldo nativo Windows PC si el navegador no permitió getUserMedia
      if (!esMovil) {
        const sessionId = `pc_${targetPinId}_${Date.now()}`;
        pcMicSessionRef.current = { sessionId, targetPinId };
        try {
          const res = await fetch("/api/taller/pc-mic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start", sessionId }),
          });
          const data = await res.json();
          if (res.ok && data?.success) {
            setEscuchandoVoz(true);
            setSegundosGrabandoAudio(0);
            if (grabacionTimerRef.current) clearInterval(grabacionTimerRef.current);
            grabacionTimerRef.current = setInterval(() => {
              setSegundosGrabandoAudio((s) => s + 1);
            }, 1000);
            mostrarToast("🎙️ Grabando nota de audio en PC... habla y pulsa Detener al terminar.");
            return;
          }
          pcMicSessionRef.current = null;
        } catch {
          pcMicSessionRef.current = null;
        }
      }

      dictandoActivoRef.current = false;
      setEscuchandoVoz(false);
      mostrarToast("Permiso de micrófono no disponible. Habilítalo en tu navegador.", "err");
      return;
    }

    // =========================================================================
    // MODO 2: DICTADO RÁPIDO A DESCRIPCIÓN (PC y Móvil)
    // =========================================================================
    dictandoActivoRef.current = true;
    const inicioSpeechOk = iniciarReconocimientoEnVivo(tipoPin, targetPinId, true, () => {
      if (!speechReconocioTextoRef.current && dictandoActivoRef.current) {
        iniciarGrabadoraRespaldo();
      }
    });

    if (inicioSpeechOk) {
      setEscuchandoVoz(true);
      setSegundosGrabandoAudio(0);
      if (grabacionTimerRef.current) clearInterval(grabacionTimerRef.current);
      grabacionTimerRef.current = setInterval(() => {
        setSegundosGrabandoAudio((s) => s + 1);
      }, 1000);
      // En PC podemos capturar audio de respaldo simultáneamente sin bloquear el micrófono;
      // en móvil dejamos el micrófono 100% libre para SpeechRecognition (0ms latencia).
      if (!esMovil) {
        iniciarGrabadoraRespaldo().catch(() => {});
      }
      mostrarToast("🎙️ Habla ahora... escribiendo al instante.");
      return;
    }

    // Si el navegador no soporta Web Speech API, usar grabadora + Whisper optimizado
    const okRespaldo = await iniciarGrabadoraRespaldo();
    if (!okRespaldo) {
      dictandoActivoRef.current = false;
      setEscuchandoVoz(false);
      mostrarToast("No se pudo iniciar el micrófono.", "err");
    }
  };

  const handleEliminarAudioPin = (targetPinId: string, indexAEliminar?: number) => {
    const actualizados = hallazgos.map((h) => {
      if (h.id === targetPinId) {
        const prevAudios = h.audioUrls || (h.audioUrl ? [h.audioUrl] : []);
        if (typeof indexAEliminar === "number") {
          const filtrados = prevAudios.filter((_, idx) => idx !== indexAEliminar);
          return {
            ...h,
            audioUrl: filtrados[0] || undefined,
            audioUrls: filtrados,
          };
        }
        return {
          ...h,
          audioUrl: undefined,
          audioUrls: [],
        };
      }
      return h;
    });
    setHallazgos(actualizados);
    sincronizarHallazgosNeon(actualizados);
    mostrarToast("Audio eliminado.");
  };

  // COMBINAR O CAMBIAR MÚLTIPLES TIPOS DE PROBLEMA EN EL MISMO PIN
  const handleToggleTipoPin = (targetPinId: string, tipoId: string) => {
    const pin = hallazgos.find((h) => h.id === targetPinId);
    if (!pin) return;
    const tipos = (pin.tipo || "").split(", ").map((t) => t.trim()).filter(Boolean);
    let nuevosTipos: string[];
    if (tipos.includes(tipoId)) {
      nuevosTipos = tipos.filter((t) => t !== tipoId);
      if (nuevosTipos.length === 0) nuevosTipos = [tipoId]; // mínimo 1
    } else {
      nuevosTipos = [...tipos, tipoId];
    }
    const nuevoTipoStr = nuevosTipos.join(", ");
    setTipoSeleccionado(nuevoTipoStr);
    handleGuardarDetallePin(nuevoTipoStr, observacionTexto !== "" ? observacionTexto : pin.descripcion);
  };

  // CAMBIO DIRECTO MANUAL DEL TIPO/DAÑO DE UN PIN
  const handleCambiarTipoPinDirecto = (targetPinId: string, nuevoTipo: string) => {
    const pin = hallazgos.find((h) => h.id === targetPinId);
    if (!pin) return;
    setTipoSeleccionado(nuevoTipo);
    handleGuardarDetallePin(nuevoTipo, observacionTexto !== "" ? observacionTexto : pin.descripcion);
  };

  // GENERAR OTRO HALLAZGO EN EL MISMO PIN (MISMO NÚMERO, NO INCREMENTA)
  const handleDuplicarPin = (pinOriginal: InspectionFinding) => {
    const mismoPinNumero = pinOriginal.pinNumber || 1;
    const nuevoHallazgo: InspectionFinding = {
      ...pinOriginal,
      id: `pin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pinNumber: mismoPinNumero,
      x: pinOriginal.x,
      y: pinOriginal.y,
      tipo: "",
      descripcion: "",
      photoUrl: undefined,
      photoUrls: [],
      audioUrl: undefined,
      audioUrls: [],
      linkedItems: [],
    };
    const actualizados = [...hallazgos, nuevoHallazgo];
    setHallazgos(actualizados);
    setPinSeleccionadoId(nuevoHallazgo.id);
    setTipoSeleccionado(nuevoHallazgo.tipo);
    setObservacionTexto("");
    sincronizarHallazgosNeon(actualizados);
    mostrarToast(`✓ Nuevo bloque de evidencia creado en Pin #${mismoPinNumero}.`);
  };

  // 3. SELECCIÓN DE SISTEMAS Y EVALUACIÓN
  const maxPinNumero = useMemo(() => {
    return hallazgos.reduce((max, h) => Math.max(max, h.pinNumber || 0), 0);
  }, [hallazgos]);
  const proximoPinNumero = maxPinNumero + 1;

  const pinsCarroceriaVista = useMemo(() => {
    const hallazgosVista = hallazgos.filter((h) => h.vista === vistaActiva);
    const mapa = new Map<number, InspectionFinding[]>();
    hallazgosVista.forEach((h) => {
      const num = h.pinNumber || 1;
      if (!mapa.has(num)) mapa.set(num, []);
      mapa.get(num)!.push(h);
    });
    return Array.from(mapa.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, items]) => ({ num, items }));
  }, [hallazgos, vistaActiva]);

  const pinsSistemaActivo = useMemo(() => {
    const hallazgosSis = hallazgos.filter((h) => h.vista === seccionActiva);
    const mapa = new Map<number, InspectionFinding[]>();
    hallazgosSis.forEach((h) => {
      const num = h.pinNumber || 1;
      if (!mapa.has(num)) mapa.set(num, []);
      mapa.get(num)!.push(h);
    });
    return Array.from(mapa.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, items]) => ({ num, items }));
  }, [hallazgos, seccionActiva]);

  const plantillaSeleccionada = useMemo(() => {
    return (
      PLANTILLAS_INSPECCION.find((s) => s.id === seccionActiva) ||
      PLANTILLAS_INSPECCION[0]
    );
  }, [seccionActiva]);

  const porcentajeProgresoPlantilla = useMemo(() => {
    if (!plantillaSeleccionada.items || plantillaSeleccionada.items.length === 0) return 0;
    const evaluados = plantillaSeleccionada.items.filter(
      (it: InspectionChecklistItem) => evaluacionesPlantilla[it.id] !== undefined
    ).length;
    return Math.round((evaluados / plantillaSeleccionada.items.length) * 100);
  }, [plantillaSeleccionada, evaluacionesPlantilla]);

  const handleEvaluarItem = (itemId: string, valor: any) => {
    const nuevo = { ...evaluacionesPlantilla, [itemId]: valor };
    setEvaluacionesPlantilla(nuevo);
    sincronizarHallazgosNeon(hallazgos, firmaRecepcionUrl, nuevo, seccionActiva);
    mostrarToast("Evaluación guardada automáticamente.");
  };

  const handleMarcarTodosBueno = (items: InspectionChecklistItem[]) => {
    const nuevo = { ...evaluacionesPlantilla };
    items.forEach((it) => {
      nuevo[it.id] = "BUENO";
    });
    setEvaluacionesPlantilla(nuevo);
    sincronizarHallazgosNeon(hallazgos, firmaRecepcionUrl, nuevo, seccionActiva);
    mostrarToast("Todos los ítems de esta sección marcados como BUENO.");
  };



  // 5. ENVÍO DEL REPORTE POR WHATSAPP EN UN CLIC
  const handleEnviarReporteWhatsApp = () => {
    if (!ordenActiva) return;
    const tel = (ordenActiva.clientPhone || "").replace(/[^0-9]/g, "");
    const hallazgosTxt =
      hallazgos.length > 0
        ? hallazgos.map((h) => `#${h.pinNumber || 1} [${h.vistaLabel}] ${h.tipo}: ${h.descripcion || "Sin nota"}`).join("\n")
        : "Sin daños de carrocería reportados.";

    const urlSeguimiento = `${typeof window !== "undefined" ? window.location.origin : ""}/taller/seguimiento?orden=${ordenActiva.orderNumber}&pin=${ordenActiva.trackingPin || "4821"}`;

    const sistemasTxt = SISTEMAS_INSPECCION
      .filter((s) => s.items && s.items.length > 0)
      .map((s) => {
        const evals = s.items!
          .map((it) => {
            const val = evaluacionesPlantilla[it.id];
            const nota = evaluacionesPlantilla[`${it.id}_nota`];
            if (!val) return null;
            return `  • ${it.label}: ${val}${nota ? ` (${nota})` : ""}`;
          })
          .filter(Boolean);
        if (evals.length === 0) return null;
        return `*${s.icon} ${s.name}:*\n${evals.join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");

    const msg = `🚗 *INFORME DE INSPECCIÓN TOTAL VEHICULAR - TALLER AUTOG*
--------------------------------------------------
*Orden:* #${ordenActiva.orderNumber}
*Vehículo:* ${ordenActiva.vehicle} (${ordenActiva.plate})
*Cliente:* ${ordenActiva.client}

📌 *Daños de Carrocería (${hallazgos.length} pines):*
${hallazgosTxt}

⚙️ *Sistemas Mecánicos y Eléctricos:*
${sistemasTxt || "Sin evaluaciones adicionales registradas."}

Consulte el informe completo con fotos y firma aquí:
${urlSeguimiento}`;

    const targetUrl = tel
      ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    if (typeof window !== "undefined") {
      window.open(targetUrl, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2 w-full">
          {pasoInspeccion === "sistema" ? (
            <>
              <button
                type="button"
                onClick={() => moverCandidatoSistema(-1)}
                aria-label="Sistema anterior"
                className="h-10 w-10 shrink-0 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 text-xl font-bold"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  cambiarSeccionActiva(sistemaCandidato.id);
                  setModoColocandoPin(false);
                  setPasoInspeccion("subcategoria");
                }}
                className="min-w-0 flex-1 h-12 px-3 rounded-xl border border-blue-400 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-200 flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98]"
              >
                <span className="text-lg">{sistemaCandidato.icon}</span>
                <span className="truncate">{sistemaCandidato.shortName}</span>
                {contarHallazgosSistema(sistemaCandidato.id) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                    {contarHallazgosSistema(sistemaCandidato.id)}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => moverCandidatoSistema(1)}
                aria-label="Sistema siguiente"
                className="h-10 w-10 shrink-0 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 text-xl font-bold"
              >
                ›
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDesplazamientoSistemaCandidato(0);
                setPasoInspeccion("sistema");
                setModoColocandoPin(false);
              }}
              aria-label="Volver a selección de sistema"
              className="min-w-0 flex-1 h-11 px-3 rounded-xl border border-blue-400 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-200 flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98]"
            >
              <span className="text-lg">{SISTEMAS_INSPECCION.find((sistema) => sistema.id === seccionActiva)?.icon}</span>
              <span className="truncate">{SISTEMAS_INSPECCION.find((sistema) => sistema.id === seccionActiva)?.shortName}</span>
              {contarHallazgosSistema(seccionActiva) > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                  {contarHallazgosSistema(seccionActiva)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================
          CONTENIDO DINÁMICO SEGÚN EL SISTEMA ACTIVO
          =================================================================== */}
      {seccionActiva === "carroceria" ? (
        <div className="space-y-3 animate-fade-in">
          {pasoInspeccion !== "sistema" && (() => {
            const vistaActual = VISTAS_CARROCERIA.find((vista) => vista.id === vistaActiva) || VISTAS_CARROCERIA[0];
            const indiceVista = VISTAS_CARROCERIA.findIndex((vista) => vista.id === vistaActiva);
            const cantidadHallazgos = hallazgos.filter((hallazgo) => hallazgo.vista === vistaActual.id).length;
            const moverVista = (direccion: 1 | -1) => {
              const total = VISTAS_CARROCERIA.length;
              cambiarVista(VISTAS_CARROCERIA[(indiceVista + direccion + total) % total].id);
            };

            return (
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-cyan-300 dark:border-cyan-500/30 bg-cyan-50/70 dark:bg-cyan-500/[0.06]">
                {pasoInspeccion === "subcategoria" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => moverVista(-1)}
                      aria-label="Vista anterior"
                      className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 text-xl font-bold"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasoInspeccion("marcar")}
                      className="min-w-0 flex-1 h-10 px-2 rounded-lg text-cyan-800 dark:text-cyan-200 flex items-center justify-center gap-2 font-bold"
                    >
                      {vistaActual.icon}
                      <span className="truncate">{vistaActual.label}</span>
                      {cantidadHallazgos > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                          {cantidadHallazgos}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => moverVista(1)}
                      aria-label="Vista siguiente"
                      className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 text-xl font-bold"
                    >
                      ›
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1 flex sm:hidden items-center justify-center gap-2 text-sm font-bold text-cyan-800 dark:text-cyan-200">
                      {vistaActual.icon}
                      <span className="truncate">{vistaActual.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPasoInspeccion("subcategoria");
                        setModoColocandoPin(false);
                      }}
                      aria-label="Volver a selección de vista"
                      className="hidden sm:flex min-w-0 flex-1 items-center justify-center gap-2 text-sm font-bold text-cyan-800 dark:text-cyan-200"
                    >
                      {vistaActual.icon}
                      <span className="truncate">{vistaActual.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasoInspeccion("subcategoria");
                        setModoColocandoPin(false);
                      }}
                      className="h-9 px-3 rounded-lg border border-cyan-300 dark:border-cyan-500/40 bg-white dark:bg-white/[0.04] text-xs font-bold text-cyan-800 dark:text-cyan-200 sm:hidden"
                    >
                      Cambiar vista
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          {/* LIENZO DEL VEHÍCULO CON PINES NUMERADOS */}
          <div className="relative rounded-2xl bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-white/10 p-1 sm:p-5 overflow-hidden select-none shadow-sm dark:shadow-none w-full">


        <div
          onClick={handleTocarLienzo}
          onTouchEnd={handleTocarLienzo}
          style={{ touchAction: "manipulation" }}
          className={`relative w-full aspect-[16/10] sm:aspect-auto sm:h-96 min-h-[240px] rounded-xl border flex items-center justify-center overflow-hidden group transition-all ${
            lienzoOscuro
              ? "bg-slate-950 border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]"
              : "bg-slate-50 border-slate-300/80 shadow-[inset_0_2px_12px_rgba(0,0,0,0.03)] bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] [background-size:22px_22px]"
          } ${
            modoColocandoPin || pinReubicandoId
              ? "ring-2 ring-cyan-500/40 cursor-crosshair !border-cyan-500"
              : "cursor-default"
          }`}
        >
          {/* Selector de modo visual para el lienzo 3D (Plano CAD / Neón 3D) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setModoVisualLienzo(lienzoOscuro ? "claro" : "oscuro");
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title="Alternar fondo: Plano Técnico CAD (Claro) / Neón 3D (Oscuro)"
            className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30 h-7 sm:h-8 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer backdrop-blur-md shadow-md ${
              lienzoOscuro
                ? "bg-slate-900/85 hover:bg-slate-800 border-cyan-500/40 text-cyan-300"
                : "bg-white/95 hover:bg-zinc-100 border-zinc-300 text-zinc-800 shadow-sm"
            }`}
          >
            <span>{lienzoOscuro ? "🌙 Neón 3D" : "☀️ Plano CAD"}</span>
          </button>



          {/* Banner de modo colocación de nuevo Pin */}
          {modoColocandoPin && (
            <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-700/95 dark:bg-cyan-950/95 border border-cyan-400 text-white dark:text-cyan-200 text-xs shadow-xl backdrop-blur-md animate-pulse">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                  #{proximoPinNumero}
                </span>
                <span className="font-semibold text-xs truncate">Ubicar Pin #{proximoPinNumero}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setModoColocandoPin(false);
                }}
                className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer shrink-0"
              >
                ✕ Cancelar
              </button>
            </div>
          )}

          {/* Banner de reubicación de Pin existente */}
          {pinReubicandoId && (
            <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-600/95 dark:bg-amber-950/95 border border-amber-400 text-white dark:text-amber-200 text-xs shadow-xl backdrop-blur-md animate-pulse">
              <span className="font-semibold text-xs truncate">📍 Reubicar Pin</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinReubicandoId(null);
                }}
                className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer shrink-0"
              >
                ✕ Cancelar
              </button>
            </div>
          )}

          {/* Indicador de carga si la imagen está descargando en móvil */}
          {imagenCargando && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-black/60 z-10 pointer-events-none gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
              <span className="text-[11px] text-cyan-700 dark:text-cyan-300 font-mono font-semibold">Cargando vista 3D...</span>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-0 sm:p-3">
            <img
              ref={imagenVehiculoRef}
              src={
                vistaActiva === "trasera" || vistaActiva === "lateral_der"
                  ? (lienzoOscuro ? "/images/inspeccion/auto_3d_trasera.jpg" : "/images/inspeccion/auto_3d_trasera_cad.png")
                  : vistaActiva === "superior"
                  ? (lienzoOscuro ? "/images/inspeccion/auto_3d_superior.jpg" : "/images/inspeccion/auto_3d_superior_cad.png")
                  : (lienzoOscuro ? "/images/inspeccion/auto_3d_frontal.jpg" : "/images/inspeccion/auto_3d_frontal_cad.png")
              }
              alt={`Vehículo 3D ${vistaActiva}`}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              onLoad={() => {
                setImagenCargando(false);
                setImagenError(false);
              }}
              onError={() => {
                setImagenCargando(false);
                setImagenError(true);
              }}
              style={{
                filter: "none",
                mixBlendMode: "normal",
              }}
              className="w-full h-full object-contain select-none inspeccion-wireframe-img drop-shadow-sm"
            />
          </div>

          {/* Fallback de respaldo en caso de que el navegador móvil bloquee o falle al cargar la imagen */}
          {imagenError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 p-4 text-center space-y-2 pointer-events-auto">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl">
                🚗
              </div>
              <p className="text-xs text-zinc-300 font-medium">Vista 3D: {vistaActiva}</p>
              <p className="text-[11px] text-zinc-500 max-w-xs">Puedes marcar los daños tocando en cualquier punto de este recuadro.</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImagenCargando(true);
                  setImagenError(false);
                }}
                className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer"
              >
                Reintentar carga
              </button>
            </div>
          )}

          {/* PINES CIRCULARES ROJOS NUMERADOS (AGRUPADOS POR NÚMERO PARA NO DUPLICAR PINES ENCIMADOS) */}
          {(() => {
            const hallazgosVista = hallazgos.filter((h) => h.vista === vistaActiva);
            const mapaPines = new Map<number, InspectionFinding[]>();
            hallazgosVista.forEach((h) => {
              const num = h.pinNumber || 1;
              if (!mapaPines.has(num)) mapaPines.set(num, []);
              mapaPines.get(num)!.push(h);
            });

            return Array.from(mapaPines.entries()).map(([pNum, items]) => {
              const primerItem = items[0];
              const esActivo = items.some((it) => it.id === pinSeleccionadoId);
              const cantDanos = items.length;

              return (
                <div
                  key={`pin-carroceria-${pNum}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const itemSeleccionar = items.find((it) => it.id === pinSeleccionadoId) || primerItem;
                    setPinSeleccionadoId(itemSeleccionar.id);
                    setTipoSeleccionado(itemSeleccionar.tipo || "");
                    setObservacionTexto(itemSeleccionar.descripcion || "");
                    setPopoverAbierto(true);
                  }}
                  style={{ left: `${primerItem.x}%`, top: `${primerItem.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white shadow-xl border-2 transition-all cursor-pointer z-20 ${
                    esActivo
                      ? "bg-rose-500 border-white ring-4 ring-rose-500/50 scale-125 animate-pulse"
                      : "bg-rose-600 hover:bg-rose-500 border-white/90 ring-2 ring-rose-500/30 hover:scale-110"
                  }`}
                  title={`Pin #${pNum} (${cantDanos} ${cantDanos === 1 ? "daño" : "daños"})`}
                >
                  <span>{pNum}</span>
                  {cantDanos > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-400 text-black text-[9px] font-black flex items-center justify-center shadow-md border border-black/30">
                      {cantDanos}
                    </span>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* BARRA INFERIOR DE CONTROL DE PINES: LISTA DE PINES EN ESTA VISTA + GENERAR SIGUIENTE */}
        <div className="mt-2.5 flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            {pinsCarroceriaVista.map((p) => {
              const activo = p.items.some((it) => it.id === pinSeleccionadoId);
              return (
                <button
                  key={`pin-pill-carroceria-${p.num}`}
                  type="button"
                  onClick={() => {
                    const item = p.items.find((it) => it.id === pinSeleccionadoId) || p.items[0];
                    setPinSeleccionadoId(item.id);
                    setTipoSeleccionado(item.tipo || "");
                    setObservacionTexto(item.descripcion || "");
                    setPopoverAbierto(true);
                    setModoColocandoPin(false);
                    setPinReubicandoId(null);
                  }}
                  className={`h-8 px-3 rounded-lg border font-mono text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 ${
                    activo
                      ? "bg-rose-500 text-white border-rose-400 shadow-sm ring-1 ring-white/30"
                      : "bg-white dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <span>#{p.num}</span>
                  <span className="font-sans">Daño</span>
                  {p.items.length > 1 && (
                    <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 text-black text-[9px] font-black flex items-center justify-center">
                      {p.items.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {pasoInspeccion === "marcar" && <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              setPinReubicandoId(null);
              setModoColocandoPin(true);
              mostrarToast(`Toca en el vehículo para ubicar el Pin #${proximoPinNumero}`);
            }}
            className={`h-7 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 ${
              modoColocandoPin
                ? "bg-cyan-500 text-black border-cyan-400 animate-pulse font-black shadow-md shadow-cyan-500/30"
                : "bg-cyan-50 dark:bg-cyan-500/15 hover:bg-cyan-100 dark:hover:bg-cyan-500/25 border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-sm"
            }`}
          >
            <span className="text-sm font-black">+</span>
            <span suppressHydrationWarning translate="no">{modoColocandoPin ? "Toca la imagen" : "Marcar"}</span>
          </button>}
        </div>

        {/* DETALLE MODERNO DEL PIN ACTIVO (Audio voz bidireccional, fotos R2 y cotización de servicios/productos) */}
        {popoverAbierto && pinActual && (
          <DetallePinModerno
            pin={pinActual}
            chipsTipos={CHIPS_HALLAZGO}
            tipoSeleccionado={tipoSeleccionado}
            onToggleTipo={(tipoId) => handleToggleTipoPin(pinActual.id, tipoId)}
            onChangeTipo={(nuevoTipo) => handleCambiarTipoPinDirecto(pinActual.id, nuevoTipo)}
            observacionTexto={observacionTexto}
            onChangeObservacion={(texto, targetId) => {
              const idUso = targetId || pinActual.id;
              if (idUso === pinActual.id) setObservacionTexto(texto);
              const targetObj = hallazgos.find((h) => h.id === idUso) || pinActual;
              handleGuardarDetallePin(targetObj.tipo, texto, idUso);
            }}
            escuchandoVoz={escuchandoVoz}
            transcribiendoVoz={transcribiendoVoz}
            segundosGrabandoAudio={segundosGrabandoAudio}
            pinAccionActivaId={pinAccionActivaId}
            onToggleVoz={(textoActualDirecto, modo, targetId) => handleToggleVozPin(targetId || pinActual.id, textoActualDirecto, modo)}
            onSubirAudio={(e, targetId) => handleSubirArchivoAudioPinR2(e, targetId || pinActual.id)}
            onTranscribirAudio={handleTranscribirAudioExistente}
            onEditarNotaKanban={(noteIdx, texto, targetId) => handleEditarNotaKanbanPin(targetId || pinActual.id, noteIdx, texto)}
            onEliminarNotaKanban={(noteIdx, targetId) => handleEliminarNotaKanbanPin(targetId || pinActual.id, noteIdx)}
            onAgregarNotaKanban={(texto, targetId) => agregarNotaKanbanEnPin(targetId || pinActual.id, texto)}
            reproduciendoAudio={reproduciendoAudio}
            onReproducirAudio={handleReproducirAudioTexto}
            onEliminarAudio={(index, targetId) => handleEliminarAudioPin(targetId || pinActual.id, index)}
            subiendoFotos={subiendoFotoPin}
            onSubirFotos={(e, targetId) => handleSubirFotosPinR2(e, targetId || pinActual.id)}
            onEliminarFoto={(idx, e, targetId) => handleEliminarFotoPin(targetId || pinActual.id, idx, e)}
            productosCatalogo={productosCatalogo}
            serviciosCatalogo={serviciosCatalogo}
            onAgregarItemPin={(item, targetId) => handleAgregarItemPin(targetId || pinActual.id, item)}
            onEliminarItemPin={(itemId, targetId) => handleEliminarItemPin(targetId || pinActual.id, itemId)}
            onDuplicarPin={() => handleDuplicarPin(pinActual)}
            onEliminarPin={() => handleEliminarPin(pinActual.id)}
            onReubicarPin={() => {
              setPinReubicandoId(pinActual.id);
              mostrarToast(`Toca en el vehículo para cambiar la posición del Pin #${pinActual.pinNumber || 1}`);
            }}
            onCerrar={() => setPopoverAbierto(false)}
            hallazgosDelMismoPin={hallazgos}
            onSeleccionarHallazgoPin={(hId) => {
              const hObj = hallazgos.find((h) => h.id === hId);
              if (hObj) {
                setPinSeleccionadoId(hObj.id);
                setTipoSeleccionado(hObj.tipo);
                setObservacionTexto(hObj.descripcion || "");
              }
            }}
            onEliminarHallazgoEspecifico={handleEliminarHallazgoEspecifico}
          />
        )}
      </div>
    </div>
  ) : (
    /* SISTEMAS MECÁNICOS Y ELÉCTRICOS (Motor, Frenos, Suspensión, Eléctrico) */
    <div className="p-1 sm:p-5 rounded-2xl bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-white/10 space-y-3 animate-fade-in shadow-sm dark:shadow-none w-full">
      {(() => {
        const sistemaActual = SISTEMAS_INSPECCION.find((s) => s.id === seccionActiva);
        if (!sistemaActual) return null;

        return (
          <>
            {seccionActiva === "personalizado" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">📁</span>
                    <label className="text-xs sm:text-sm font-normal text-zinc-500 dark:text-zinc-400">
                      Categoría:
                    </label>
                  </div>
                  <input
                    type="text"
                    value={nombreManualCategoria}
                    onChange={(e) => setNombreManualCategoria(e.target.value)}
                    placeholder="Ej: Transmisión"
                    className="w-full h-11 sm:h-12 px-4 text-sm font-medium rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">✏️</span>
                    <label className="text-xs sm:text-sm font-normal text-zinc-500 dark:text-zinc-400">
                      Subcategoría:
                    </label>
                  </div>
                  <input
                    type="text"
                    value={nombreManualSubcategoria}
                    onChange={(e) => setNombreManualSubcategoria(e.target.value)}
                    placeholder="Ej: Embrague"
                    className="w-full h-11 sm:h-12 px-4 text-sm font-medium rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                  />
                </div>
              </div>
            ) : (
              subCategoriaPorSistema[seccionActiva] === "Manual" && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 animate-fade-in">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm">✏️</span>
                    <label className="text-xs sm:text-sm font-normal text-zinc-500 dark:text-zinc-400">
                      Subcategoría:
                    </label>
                  </div>
                  <input
                    type="text"
                    value={subcategoriaManualPorSistema[seccionActiva] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubcategoriaManualPorSistema((prev) => ({ ...prev, [seccionActiva]: val }));
                    }}
                    placeholder="Ej: Inyectores"
                    className="flex-1 h-11 sm:h-12 px-4 text-sm font-medium rounded-xl bg-white dark:bg-black/40 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                  />
                </div>
              )
            )}
            {pasoInspeccion !== "sistema" && subcategoriaActiva && (() => {
              const cantidadHallazgos = hallazgos.filter(
                (hallazgo) =>
                  hallazgo.vista === seccionActiva &&
                  (subcategoriaActiva.id === "Manual"
                    ? (hallazgo.zona || "").includes("·") &&
                      !subcategoriasActivas.some(
                        (sub) => sub.id !== "Manual" && (hallazgo.zona || "").endsWith(`· ${sub.id}`)
                      )
                    : (hallazgo.zona || "").endsWith(`· ${subcategoriaActiva.id}`))
              ).length;

              return (
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-cyan-300 dark:border-cyan-500/30 bg-cyan-50/70 dark:bg-cyan-500/[0.06]">
                  {pasoInspeccion === "subcategoria" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navegarSubcategoria(-1)}
                        aria-label="Subcategoría anterior"
                        className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 text-xl font-bold"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setPasoInspeccion("marcar")}
                        className="min-w-0 flex-1 h-10 px-2 rounded-lg text-cyan-800 dark:text-cyan-200 flex items-center justify-center gap-2 font-bold"
                      >
                        <span>{subcategoriaActiva.icon}</span>
                        <span className="truncate">{subcategoriaActiva.id}</span>
                        {cantidadHallazgos > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                            {cantidadHallazgos}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => navegarSubcategoria(1)}
                        aria-label="Subcategoría siguiente"
                        className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 text-xl font-bold"
                      >
                        ›
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPasoInspeccion("subcategoria");
                        setModoColocandoPin(false);
                      }}
                      aria-label="Volver a selección de subcategoría"
                      className="min-w-0 flex-1 flex items-center justify-center gap-2 text-sm font-bold text-cyan-800 dark:text-cyan-200"
                    >
                      <span>
                        {subcategoriaActiva.icon}
                      </span>
                      <span className="truncate">{subcategoriaActiva.id}</span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* LIENZO 3D INTERACTIVO DEL SISTEMA (Tocar para marcar pines) */}
            <div
              onClick={handleTocarLienzo}
              onTouchEnd={handleTocarLienzo}
              style={{ touchAction: "manipulation" }}
              className={`relative w-full aspect-[16/10] sm:aspect-auto sm:h-96 min-h-[240px] rounded-xl border flex items-center justify-center overflow-hidden group transition-all ${
                lienzoOscuro
                  ? "bg-slate-950 border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]"
                  : "bg-slate-50 border-slate-300/80 shadow-[inset_0_2px_12px_rgba(0,0,0,0.03)] bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] [background-size:22px_22px]"
              } ${
                modoColocandoPin || pinReubicandoId
                  ? "ring-2 ring-cyan-500/40 cursor-crosshair !border-cyan-500"
                  : "cursor-default"
              }`}
            >
              {/* Selector de modo visual para el esquema 3D (Plano CAD / Neón 3D) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setModoVisualLienzo(lienzoOscuro ? "claro" : "oscuro");
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Alternar fondo: Plano Técnico CAD (Claro) / Neón 3D (Oscuro)"
                className={`absolute top-3 right-3 z-30 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-md ${
                  lienzoOscuro
                    ? "bg-slate-900/85 hover:bg-slate-800 border-cyan-500/40 text-cyan-300"
                    : "bg-white/95 hover:bg-zinc-100 border-zinc-300 text-zinc-800 shadow-sm"
                }`}
              >
                <span>{lienzoOscuro ? "🌙 Neón 3D" : "☀️ Plano CAD"}</span>
              </button>



              {/* Banner de modo colocación de nuevo Pin */}
              {modoColocandoPin && (
                <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-700/95 dark:bg-cyan-950/95 border border-cyan-400 text-white dark:text-cyan-200 text-xs shadow-xl backdrop-blur-md animate-pulse">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                      #{proximoPinNumero}
                    </span>
                    <span className="font-semibold text-xs truncate">Ubicar Pin #{proximoPinNumero}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModoColocandoPin(false);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    ✕ Cancelar
                  </button>
                </div>
              )}

              {/* Banner de reubicación de Pin existente */}
              {pinReubicandoId && (
                <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-600/95 dark:bg-amber-950/95 border border-amber-400 text-white dark:text-amber-200 text-xs shadow-xl backdrop-blur-md animate-pulse">
                  <span className="font-semibold text-xs truncate">📍 Reubicar Pin</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinReubicandoId(null);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    ✕ Cancelar
                  </button>
                </div>
              )}

              {/* Indicador de carga si la imagen está descargando en móvil */}
              {imagenCargando && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-black/60 z-10 pointer-events-none gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
                  <span className="text-[11px] text-cyan-700 dark:text-cyan-300 font-mono font-semibold">Cargando esquema {sistemaActual.name}...</span>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-0 sm:p-3">
                <img
                  ref={imagenMecanicaRef}
                  src={
                    seccionActiva === "frenos"
                      ? (lienzoOscuro ? "/images/inspeccion/auto_3d_frenos.jpg" : "/images/inspeccion/auto_3d_frenos_cad.png")
                      : seccionActiva === "suspension"
                      ? (lienzoOscuro ? "/images/inspeccion/auto_3d_suspension.jpg" : "/images/inspeccion/auto_3d_suspension_cad.png")
                      : seccionActiva === "electrico"
                      ? (lienzoOscuro ? "/images/inspeccion/auto_3d_electrico.jpg" : "/images/inspeccion/auto_3d_electrico_cad.png")
                      : seccionActiva === "personalizado"
                      ? (lienzoOscuro ? "/images/inspeccion/auto_3d_superior.jpg" : "/images/inspeccion/auto_3d_superior_cad.png")
                      : (lienzoOscuro ? "/images/inspeccion/auto_3d_motor.jpg" : "/images/inspeccion/auto_3d_motor_cad.png")
                  }
                  alt={`${sistemaActual.name} 3D`}
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  onLoad={() => {
                    setImagenCargando(false);
                    setImagenError(false);
                  }}
                  onError={() => {
                    setImagenCargando(false);
                    setImagenError(true);
                  }}
                  style={{
                    filter: "none",
                    mixBlendMode: "normal",
                  }}
                  className="max-w-full max-h-full w-auto h-auto object-contain select-none inspeccion-wireframe-img drop-shadow-sm"
                />
              </div>

              {(() => {
                const subActual = subCategoriaPorSistema[seccionActiva];
                const zona = ZONAS_SUBCATEGORIA[seccionActiva]?.[subActual];
                if (!zona) return null;
                const labelX = Math.min(Math.max(zona.x, 130), 1246);
                const labelY = zona.y < 130 ? zona.y + 85 : zona.y - 62;
                return (
                  <div className="absolute inset-0 p-2 sm:p-4 pointer-events-none z-10">
                    <svg viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
                      <circle cx={zona.x} cy={zona.y} r="58" fill="#f43f5e" fillOpacity="0.25" className="animate-pulse" />
                      <circle cx={zona.x} cy={zona.y} r="46" fill="none" stroke="#f43f5e" strokeWidth="10" />
                      <circle cx={zona.x} cy={zona.y} r="64" fill="none" stroke="#f43f5e" strokeWidth="5" strokeDasharray="10 10" />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        fontSize="36"
                        fontWeight="500"
                        fill="#fff"
                        stroke="#000"
                        strokeWidth="3"
                        paintOrder="stroke"
                      >
                        {subActual}
                      </text>
                    </svg>
                  </div>
                );
              })()}

              {/* Fallback de respaldo en caso de que el navegador móvil bloquee o falle al cargar la imagen */}
              {imagenError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 p-4 text-center space-y-2 pointer-events-auto">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl">
                    ⚙️
                  </div>
                  <p className="text-xs text-zinc-300 font-medium">Esquema 3D: {sistemaActual.name}</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs">Puedes marcar los hallazgos tocando en cualquier punto de este recuadro.</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagenCargando(true);
                      setImagenError(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer"
                  >
                    Reintentar carga
                  </button>
                </div>
              )}

              {/* PINES CIRCULARES NUMERADOS EN EL SISTEMA MECÁNICO (AGRUPADOS POR NÚMERO) */}
              {(() => {
                const hallazgosMecanicos = hallazgos.filter((h) => h.vista === seccionActiva);
                const mapaPinesMec = new Map<number, InspectionFinding[]>();
                hallazgosMecanicos.forEach((h) => {
                  const num = h.pinNumber || 1;
                  if (!mapaPinesMec.has(num)) mapaPinesMec.set(num, []);
                  mapaPinesMec.get(num)!.push(h);
                });

                return Array.from(mapaPinesMec.entries()).map(([pNum, items]) => {
                  const primerItem = items[0];
                  const esActivo = items.some((it) => it.id === pinSeleccionadoId);
                  const cantDanos = items.length;

                  return (
                    <div
                      key={`pin-mecanico-${pNum}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const itemSeleccionar = items.find((it) => it.id === pinSeleccionadoId) || primerItem;
                        setPinSeleccionadoId(itemSeleccionar.id);
                        setTipoSeleccionado(itemSeleccionar.tipo || "");
                        setObservacionTexto(itemSeleccionar.descripcion || "");
                        setPopoverAbierto(true);
                      }}
                      style={{ left: `${primerItem.x}%`, top: `${primerItem.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white shadow-xl border-2 transition-all cursor-pointer z-20 ${
                        esActivo
                          ? "bg-rose-500 border-white ring-4 ring-rose-500/50 scale-125 animate-pulse"
                          : "bg-rose-600 hover:bg-rose-500 border-white/90 ring-2 ring-rose-500/30 hover:scale-110"
                      }`}
                      title={`Pin #${pNum} (${cantDanos} ${cantDanos === 1 ? "daño" : "daños"})`}
                    >
                      <span>{pNum}</span>
                      {cantDanos > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-400 text-black text-[9px] font-black flex items-center justify-center shadow-md border border-black/30">
                          {cantDanos}
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* BARRA INFERIOR DE CONTROL DE PINES: LISTA DE PINES EN ESTE SISTEMA + GENERAR SIGUIENTE */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
                {pinsSistemaActivo.map((p) => {
                  const activo = p.items.some((it) => it.id === pinSeleccionadoId);
                  return (
                    <button
                      key={`pin-pill-sistema-${p.num}`}
                      type="button"
                      onClick={() => {
                        const item = p.items.find((it) => it.id === pinSeleccionadoId) || p.items[0];
                        setPinSeleccionadoId(item.id);
                        setTipoSeleccionado(item.tipo || "");
                        setObservacionTexto(item.descripcion || "");
                        setPopoverAbierto(true);
                        setModoColocandoPin(false);
                        setPinReubicandoId(null);
                      }}
                      className={`h-8 px-3 rounded-lg border font-mono text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 ${
                        activo
                          ? "bg-rose-500 text-white border-rose-400 shadow-sm ring-1 ring-white/30"
                          : "bg-white dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>#{p.num}</span>
                      <span className="font-sans">Daño</span>
                      {p.items.length > 1 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 text-black text-[9px] font-black flex items-center justify-center">
                          {p.items.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {pasoInspeccion === "marcar" && <button
                type="button"
                suppressHydrationWarning
                onClick={() => {
                  setPinReubicandoId(null);
                  setModoColocandoPin(true);
                  mostrarToast(`Toca en el esquema para ubicar el Pin #${proximoPinNumero}`);
                }}
                className={`h-7 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 ${
                  modoColocandoPin
                    ? "bg-cyan-500 text-black border-cyan-400 animate-pulse font-black shadow-md shadow-cyan-500/30"
                    : "bg-cyan-50 dark:bg-cyan-500/15 hover:bg-cyan-100 dark:hover:bg-cyan-500/25 border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-sm"
                }`}
              >
                <span className="text-sm font-black">+</span>
                <span suppressHydrationWarning translate="no">{modoColocandoPin ? "Toca la imagen" : "Marcar"}</span>
              </button>}
            </div>

            {/* DETALLE MODERNO PARA PINES DEL SISTEMA MECÁNICO O PERSONALIZADO */}
            {popoverAbierto && pinActual && pinActual.vista === seccionActiva && (
              <DetallePinModerno
                pin={pinActual}
                chipsTipos={seccionActiva === "personalizado" ? [...CHIPS_HALLAZGO_MECANICO, ...CHIPS_HALLAZGO] : CHIPS_HALLAZGO_MECANICO}
                tipoSeleccionado={tipoSeleccionado}
                onToggleTipo={(tipoId) => handleToggleTipoPin(pinActual.id, tipoId)}
                onChangeTipo={(nuevoTipo) => handleCambiarTipoPinDirecto(pinActual.id, nuevoTipo)}
                observacionTexto={observacionTexto}
                onChangeObservacion={(texto, targetId) => {
                  const idUso = targetId || pinActual.id;
                  if (idUso === pinActual.id) setObservacionTexto(texto);
                  const targetObj = hallazgos.find((h) => h.id === idUso) || pinActual;
                  handleGuardarDetallePin(targetObj.tipo, texto, idUso);
                }}
                escuchandoVoz={escuchandoVoz}
                transcribiendoVoz={transcribiendoVoz}
                segundosGrabandoAudio={segundosGrabandoAudio}
                pinAccionActivaId={pinAccionActivaId}
                onToggleVoz={(textoActualDirecto, modo, targetId) => handleToggleVozPin(targetId || pinActual.id, textoActualDirecto, modo)}
                onSubirAudio={(e, targetId) => handleSubirArchivoAudioPinR2(e, targetId || pinActual.id)}
                onTranscribirAudio={handleTranscribirAudioExistente}
                onEditarNotaKanban={(noteIdx, texto, targetId) => handleEditarNotaKanbanPin(targetId || pinActual.id, noteIdx, texto)}
                onEliminarNotaKanban={(noteIdx, targetId) => handleEliminarNotaKanbanPin(targetId || pinActual.id, noteIdx)}
                onAgregarNotaKanban={(texto, targetId) => agregarNotaKanbanEnPin(targetId || pinActual.id, texto)}
                reproduciendoAudio={reproduciendoAudio}
                onReproducirAudio={handleReproducirAudioTexto}
                onEliminarAudio={(index, targetId) => handleEliminarAudioPin(targetId || pinActual.id, index)}
                subiendoFotos={subiendoFotoPin}
                onSubirFotos={(e, targetId) => handleSubirFotosPinR2(e, targetId || pinActual.id)}
                onEliminarFoto={(idx, e, targetId) => handleEliminarFotoPin(targetId || pinActual.id, idx, e)}
                productosCatalogo={productosCatalogo}
                serviciosCatalogo={serviciosCatalogo}
                onAgregarItemPin={(item, targetId) => handleAgregarItemPin(targetId || pinActual.id, item)}
                onEliminarItemPin={(itemId, targetId) => handleEliminarItemPin(targetId || pinActual.id, itemId)}
                onDuplicarPin={() => handleDuplicarPin(pinActual)}
                onEliminarPin={() => handleEliminarPin(pinActual.id)}
                onReubicarPin={() => {
                  setPinReubicandoId(pinActual.id);
                  mostrarToast(`Toca en el esquema para cambiar la posición del Pin #${pinActual.pinNumber || 1}`);
                }}
                onCerrar={() => setPopoverAbierto(false)}
                hallazgosDelMismoPin={hallazgos}
                onSeleccionarHallazgoPin={(hId) => {
                  const hObj = hallazgos.find((h) => h.id === hId);
                  if (hObj) {
                    setPinSeleccionadoId(hObj.id);
                    setTipoSeleccionado(hObj.tipo);
                    setObservacionTexto(hObj.descripcion || "");
                  }
                }}
                onEliminarHallazgoEspecifico={handleEliminarHallazgoEspecifico}
              />
            )}


          </>
        );
      })()}
    </div>
  )}


      {/* ===================================================================
          MODAL DE PDF DE INSPECCIÓN (IMPRIMIR O ENVIAR POR WHATSAPP)
          =================================================================== */}
      {modalPdfAbierto && (
        <div
          onClick={() => setModalPdfAbierto(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-2xl w-[95%] sm:w-full max-w-3xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 [WebkitOverflowScrolling:touch]"
          >
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Reporte Oficial de Inspección Vehicular
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPdfAbierto(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 cursor-pointer text-xs"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Contenido Imprimible de Alta Resolución */}
            <div id="inspeccion-imprimible" className="p-6 rounded-xl bg-white text-black font-sans shadow-inner space-y-5">
              {/* Encabezado Corporativo con Logo */}
              <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Auto / G</h1>
                  <p className="text-xs text-zinc-600 font-medium">Inspección de Entrada & Registro Inicial de Daños</p>
                  <p className="text-[11px] text-zinc-500 mt-1">Av. Central 1234 • Soporte y Garaje Oficial</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-base font-bold text-zinc-900 block">
                    #{ordenActiva?.orderNumber || "OT-0000"}
                  </span>
                  <span className="text-xs text-zinc-600 block">
                    {new Date().toLocaleDateString("es-EC", { dateStyle: "long" })}
                  </span>
                  <span className="text-[11px] text-purple-700 font-bold block mt-1">
                    PIN: {ordenActiva?.trackingPin || "4821"}
                  </span>
                </div>
              </div>

              {/* Datos del Cliente y Vehículo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
                <div>
                  <p><strong>Cliente:</strong> {ordenActiva?.client || "Cliente general"}</p>
                  <p><strong>Teléfono:</strong> {ordenActiva?.clientPhone || "N/A"}</p>
                  <p><strong>Correo:</strong> {ordenActiva?.clientEmail || "N/A"}</p>
                </div>
                <div>
                  <p><strong>Vehículo:</strong> {ordenActiva?.vehicle || "Auto"}</p>
                  <p><strong>Placa:</strong> {ordenActiva?.plate || "---"} | <strong>Km:</strong> {ordenActiva?.mileage || "N/D"}</p>
                  <p><strong>Combustible:</strong> {ordenActiva?.fuelLevel || "1/2"}</p>
                </div>
              </div>

              {/* Listado de Hallazgos con Pines Numerados */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 mb-2 border-b pb-1">
                  Pines de Daños y Hallazgos Registrados ({hallazgos.length}):
                </h4>
                {hallazgos.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-2">
                    Sin daños visibles reportados al ingreso del vehículo.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden text-xs">
                    {hallazgos.map((h) => (
                      <div key={h.id} className="p-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {h.pinNumber || 1}
                          </span>
                          <div>
                            <span className="font-bold text-zinc-900">{h.tipo}</span>
                            <span className="text-zinc-500 text-[11px] block">
                              Vista {h.vistaLabel} ({h.x}%, {h.y}%) • {h.descripcion || "Sin nota adicional"}
                            </span>
                          </div>
                        </div>

                        {(() => {
                          const fotos = h.photoUrls || (h.photoUrl ? [h.photoUrl] : []);
                          if (fotos.length === 0) return null;
                          return (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {h.capturedAt && (
                                <span className="text-[10px] font-mono text-zinc-500 mr-1 hidden sm:inline">
                                  ⏱ {h.capturedAt}
                                </span>
                              )}
                              {fotos.map((fUrl, fIdx) => (
                                <img
                                  key={fIdx}
                                  src={fUrl}
                                  alt={`Evidencia #${fIdx + 1}`}
                                  className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded border border-zinc-300 shadow-sm"
                                />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resultados de la Inspección de Sistemas (Motor, Frenos, Suspensión, Eléctrico) */}
              {/* Resultados de la Inspección de Sistemas Mecánicos y Eléctricos (si hay evaluaciones) */}
              {SISTEMAS_INSPECCION.some((sis) =>
                sis.items?.some((item) => evaluacionesPlantilla[item.id] !== undefined)
              ) && (
                <div>
                  <div className="flex items-center justify-between mb-2 border-b pb-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                      Inspección de Sistemas Mecánicos y Eléctricos
                    </h4>
                    <span className="text-xs font-mono font-bold text-zinc-700">
                      Diagnóstico Total
                    </span>
                  </div>

                  <div className="space-y-3">
                    {SISTEMAS_INSPECCION.filter((s) => s.items && s.items.length > 0).map((sis) => {
                      const evals = sis.items!.filter((it) => evaluacionesPlantilla[it.id] !== undefined);
                      if (evals.length === 0) return null;

                      return (
                        <div key={sis.id} className="space-y-1">
                          <span className="text-[11px] font-bold text-zinc-800 uppercase flex items-center gap-1.5">
                            <span>{sis.icon}</span> {sis.name}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                            {sis.items!.map((it) => {
                              const res = evaluacionesPlantilla[it.id];
                              const nota = evaluacionesPlantilla[`${it.id}_nota`];
                              if (!res) return null;

                              return (
                                <div
                                  key={it.id}
                                  className={`p-2 rounded border flex items-center justify-between ${
                                    res === "MALO"
                                      ? "bg-rose-50 border-rose-300 text-rose-900"
                                      : res === "REGULAR"
                                      ? "bg-amber-50 border-amber-300 text-amber-900"
                                      : "bg-zinc-50 border-zinc-200 text-zinc-700"
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <span className="block truncate">{it.label}</span>
                                    {nota && <span className="block text-[10px] text-zinc-500 italic truncate">Nota: {nota}</span>}
                                  </div>
                                  <span className="font-bold shrink-0 font-mono text-[11px]">
                                    {res}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Conformidad y Firma del Cliente */}
              <div className="pt-4 border-t-2 border-zinc-900 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-3">
                <div className="w-56 text-center">
                  <div className="h-16 border-b border-zinc-400 mb-1 flex items-center justify-center">
                    {firmaRecepcionUrl ? (
                      <img src={firmaRecepcionUrl} alt="Firma Recepción" className="max-h-14 object-contain" />
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Firma del cliente</span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-zinc-800">Firma de Recepción del Cliente</p>
                  <p className="text-[10px] text-zinc-500">{ordenActiva?.client}</p>
                </div>

                <div className="text-center sm:text-right text-[10px] text-zinc-500 font-mono">
                  <p>Documento generado por Sistema AutoG Taller</p>
                  <p>Trazabilidad de archivos en Cloudflare R2</p>
                </div>
              </div>
            </div>

            {/* Pie del Modal con Botones de Acción */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalPdfAbierto(false)}
                className="h-10 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 transition-all cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleEnviarReporteWhatsApp}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:border dark:border-emerald-500/40 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm"
              >
                <span>💬 WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white dark:bg-purple-500 dark:hover:bg-purple-400 dark:text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95"
              >
                <span>🖨️ PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
