"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { UnifiedOrder, InspectionFinding, OrderItem, FindingItemLink } from "@/app/taller/page";
import { DetallePinModerno } from "./DetallePinModerno";

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

type VistaVehiculoId = "frontal" | "trasera" | "lateral_izq" | "lateral_der" | "superior";

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

export type SeccionInspeccionId = "carroceria" | "motor" | "frenos" | "suspension" | "electrico";

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
];

export const PLANTILLAS_INSPECCION: InspectionTemplate[] = SISTEMAS_INSPECCION
  .filter((s): s is SeccionInspeccionConfig & { items: InspectionChecklistItem[] } => Boolean(s.items && s.items.length > 0))
  .map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
    items: s.items,
  }));

const CHIPS_HALLAZGO = [
  { id: "Rayón", label: "Rayón", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { id: "Golpe", label: "Golpe", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  { id: "Abolladura", label: "Abolladura", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { id: "Fisura", label: "Fisura", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
];

const CHIPS_HALLAZGO_MECANICO = [
  { id: "Fuga", label: "Fuga", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  { id: "Roto", label: "Roto", color: "bg-red-500/20 text-red-300 border-red-500/40" },
  { id: "Desgaste", label: "Desgaste", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { id: "Ruido", label: "Ruido", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { id: "Suelto", label: "Suelto", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  { id: "Sensor/Falla", label: "Sensor/Falla", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
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
  const vistaCarouselRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutVistaRef = useRef<NodeJS.Timeout | null>(null);

  const handleVistaScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) return;
    const container = e.currentTarget;
    if (scrollTimeoutVistaRef.current) clearTimeout(scrollTimeoutVistaRef.current);
    scrollTimeoutVistaRef.current = setTimeout(() => {
      const width = container.clientWidth;
      if (width > 0) {
        const pageIndex = Math.round(container.scrollLeft / width);
        const targetVista = VISTAS_CARROCERIA[pageIndex];
        if (targetVista && targetVista.id !== vistaActiva) {
          setVistaActiva(targetVista.id);
          setPinSeleccionadoId(null);
          setPopoverAbierto(false);
        }
      }
    }, 80);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640 && vistaCarouselRef.current) {
      const container = vistaCarouselRef.current;
      const el = document.getElementById(`vista-tab-${vistaActiva}`);
      if (el) {
        const targetLeft = el.offsetLeft - container.offsetLeft;
        container.scrollTo({ left: targetLeft, behavior: "smooth" });
      }
    }
  }, [vistaActiva]);
  const [hallazgos, setHallazgos] = useState<InspectionFinding[]>(
    ordenActiva?.inspectionFindings || []
  );
  const [pinSeleccionadoId, setPinSeleccionadoId] = useState<string | null>(null);
  // Estados para colocación controlada de pines (evitar toques accidentales en móvil)
  const [modoColocandoPin, setModoColocandoPin] = useState<boolean>(false);
  const [pinReubicandoId, setPinReubicandoId] = useState<string | null>(null);

  // Estados para popover y detalle multimedia del pin activo
  const [popoverAbierto, setPopoverAbierto] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("Rayón");
  const [observacionTexto, setObservacionTexto] = useState("");
  const [subiendoFotoPin, setSubiendoFotoPin] = useState(false);
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [reproduciendoAudio, setReproduciendoAudio] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Cleanup de audio Text-to-Speech
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Estados para Sistemas de Inspección Total del Vehículo
  const [seccionActiva, setSeccionActiva] = useState<SeccionInspeccionId>("carroceria");
  const seccionCarouselRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutSeccionRef = useRef<NodeJS.Timeout | null>(null);

  const handleSeccionScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) return;
    const container = e.currentTarget;
    if (scrollTimeoutSeccionRef.current) clearTimeout(scrollTimeoutSeccionRef.current);
    scrollTimeoutSeccionRef.current = setTimeout(() => {
      const width = container.clientWidth;
      if (width > 0) {
        const pageIndex = Math.round(container.scrollLeft / width);
        const targetSis = SISTEMAS_INSPECCION[pageIndex];
        if (targetSis && targetSis.id !== seccionActiva) {
          setSeccionActiva(targetSis.id);
        }
      }
    }, 80);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640 && seccionCarouselRef.current) {
      const container = seccionCarouselRef.current;
      const el = document.getElementById(`seccion-tab-${seccionActiva}`);
      if (el) {
        const targetLeft = el.offsetLeft - container.offsetLeft;
        container.scrollTo({ left: targetLeft, behavior: "smooth" });
      }
    }
  }, [seccionActiva]);

  const [evaluacionesPlantilla, setEvaluacionesPlantilla] = useState<Record<string, any>>({});

  // Modal de PDF y Envío WhatsApp de Inspección
  const [modalPdfAbierto, setModalPdfAbierto] = useState(false);

  const [firmaRecepcionUrl, setFirmaRecepcionUrl] = useState<string | null>(
    ordenActiva?.receptionSignatureUrl || null
  );

  // Estados de carga y error para la imagen 3D del vehículo (compatibilidad móvil)
  const [imagenCargando, setImagenCargando] = useState<boolean>(true);
  const [imagenError, setImagenError] = useState<boolean>(false);

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
    setImagenCargando(true);
    setImagenError(false);
  }, [vistaActiva, seccionActiva]);

  // Sincronizar hallazgos locales cuando cambie la orden seleccionada
  useEffect(() => {
    if (ordenActiva?.inspectionFindings) {
      setHallazgos(ordenActiva.inspectionFindings);
    } else {
      setHallazgos([]);
    }
    if (ordenActiva?.receptionSignatureUrl) {
      setFirmaRecepcionUrl(ordenActiva.receptionSignatureUrl);
    }
    if ((ordenActiva as any)?.inspectionChecklist) {
      setEvaluacionesPlantilla((ordenActiva as any).inspectionChecklist);
    }
  }, [ordenActiva?.id]);

  // Persistir hallazgos y evaluaciones en Neon DB
  const sincronizarHallazgosNeon = useCallback(
    async (
      nuevosHallazgos: InspectionFinding[],
      firmaUrl?: string | null,
      evals?: Record<string, any>,
      seccionId?: string
    ) => {
      if (!ordenActiva) return;
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
        if (data.success && data.activeOrder && onUpdateOrden) {
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
    // Si NO estamos en modo colocación NI reubicación, NO crear pines por toques accidentales en móvil
    if (!modoColocandoPin && !pinReubicandoId) {
      return;
    }

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
    const vistaDestino = esCarroceria ? vistaActiva : (seccionActiva as any);
    const vistaLabel = esCarroceria
      ? (vistaActiva === "frontal"
          ? "Frontal"
          : vistaActiva === "trasera"
          ? "Trasera"
          : vistaActiva === "lateral_izq"
          ? "Lateral Izq"
          : vistaActiva === "lateral_der"
          ? "Lateral Der"
          : "Superior")
      : (seccionActiva === "motor"
          ? "Motor"
          : seccionActiva === "frenos"
          ? "Frenos"
          : seccionActiva === "suspension"
          ? "Suspensión"
          : "Eléctrico");

    const tipoDefault = esCarroceria ? "Rayón" : (seccionActiva === "motor" ? "Fuga" : "Desgaste");

    const nuevoHallazgo: InspectionFinding = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vista: vistaDestino,
      vistaLabel: vistaLabel,
      x: xPct,
      y: yPct,
      zona: `${vistaLabel}`,
      tipo: tipoDefault,
      descripcion: "",
      pinNumber: nuevoPinNumero,
    };

    const actualizados = [...hallazgos, nuevoHallazgo];
    setHallazgos(actualizados);
    setPinSeleccionadoId(nuevoHallazgo.id);
    setTipoSeleccionado(tipoDefault);
    setObservacionTexto("");
    setPopoverAbierto(true);
    setModoColocandoPin(false);

    sincronizarHallazgosNeon(actualizados);
    mostrarToast(`✓ Pin #${nuevoPinNumero} ubicado en ${vistaLabel}.`);
  };

  const pinActual = hallazgos.find((h) => h.id === pinSeleccionadoId) || null;
  const debounceSyncPinRef = useRef<NodeJS.Timeout | null>(null);

  const handleGuardarDetallePin = (tipo: string, obs?: string) => {
    if (!pinSeleccionadoId) return;
    const actualizados = hallazgos.map((h) => {
      if (h.id === pinSeleccionadoId) {
        return {
          ...h,
          tipo,
          descripcion: obs !== undefined ? obs : h.descripcion,
        };
      }
      return h;
    });
    setHallazgos(actualizados);

    if (debounceSyncPinRef.current) clearTimeout(debounceSyncPinRef.current);
    debounceSyncPinRef.current = setTimeout(() => {
      sincronizarHallazgosNeon(actualizados);
    }, 450);
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
    itemData: { name: string; price: number; type: "SERVICE" | "PART"; qty: number }
  ) => {
    const pin = hallazgos.find((h) => h.id === targetPinId);
    if (!pin) return;

    const itemLink: FindingItemLink = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: itemData.name,
      price: itemData.price,
      type: itemData.type,
      qty: itemData.qty,
    };

    // 1. Guardar en los ítems vinculados del pin
    const itemsActuales = pin.linkedItems || [];
    const actualizadosPin = [...itemsActuales, itemLink];
    const nuevosHallazgos = hallazgos.map((h) => {
      if (h.id === targetPinId) {
        return { ...h, linkedItems: actualizadosPin };
      }
      return h;
    });
    setHallazgos(nuevosHallazgos);
    sincronizarHallazgosNeon(nuevosHallazgos);

    // 2. Sincronizar hacia ordenActiva.items (Presupuesto)
    if (ordenActiva && onUpdateOrden) {
      const itemsOrden = ordenActiva.items ? [...ordenActiva.items] : [];
      const itemExistenteIndex = itemsOrden.findIndex((it) => it.id === itemLink.id);

      const nuevoOrderItem: OrderItem = {
        id: itemLink.id,
        code: `PIN-${pin.pinNumber || 1}-${Date.now().toString(36).slice(-4)}`,
        type: itemLink.type,
        name: itemLink.name,
        category: `Inspección - Pin #${pin.pinNumber || 1} (${pin.vistaLabel || pin.vista})`,
        qty: itemLink.qty,
        price: itemLink.price,
        status: "Pendiente",
      };

      if (itemExistenteIndex >= 0) {
        itemsOrden[itemExistenteIndex] = nuevoOrderItem;
      } else {
        itemsOrden.push(nuevoOrderItem);
      }

      const nuevoTotalCost = itemsOrden.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.qty) || 1)), 0);
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

    mostrarToast(`✓ "${itemLink.name}" añadido a la propuesta/presupuesto.`);
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

  // 2. FOTOS COMO EVIDENCIA EN CLOUDFLARE R2 (HASTA 5 FOTOS POR PIN)
  const handleSubirFotosPinR2 = async (e: React.ChangeEvent<HTMLInputElement>, targetPinId: string) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const pinExistente = hallazgos.find((h) => h.id === targetPinId);
    const fotosActuales = pinExistente?.photoUrls || (pinExistente?.photoUrl ? [pinExistente.photoUrl] : []);

    if (fotosActuales.length >= 5) {
      mostrarToast("Ya alcanzaste el límite de 5 fotos para este hallazgo.", "err");
      e.target.value = "";
      return;
    }

    const archivosSubir = files.slice(0, 5 - fotosActuales.length);

    try {
      setSubiendoFotoPin(true);
      mostrarToast(`Subiendo ${archivosSubir.length} ${archivosSubir.length === 1 ? "foto" : "fotos"} a R2...`, "ok");

      const nuevasUrls: string[] = [];

      for (const file of archivosSubir) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "taller_inspeccion_evidencia");

        const res = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          nuevasUrls.push(data.url);
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
        mostrarToast(`✓ ${nuevasUrls.length} ${nuevasUrls.length === 1 ? "foto agregada" : "fotos agregadas"} (${fotosFinales.length}/5)`);
      } else {
        mostrarToast("No se pudo subir la foto a R2", "err");
      }
    } catch {
      mostrarToast("Error de conexión al subir fotos a R2", "err");
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

  // DICTADO POR VOZ (AUDIO A TEXTO) DIRECTO EN LA OBSERVACIÓN
  const handleToggleVozPin = (targetPinId: string) => {
    if (escuchandoVoz && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setEscuchandoVoz(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      mostrarToast("Tu navegador no soporta dictado por voz. Escribe en el recuadro.", "err");
      return;
    }

    try {
      const pinObjetivo = hallazgos.find((h) => h.id === targetPinId);
      const textoPrevio = (observacionTexto || pinObjetivo?.descripcion || "").trim();

      const recognition = new SpeechRecognition();
      recognition.lang = "es-EC";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setEscuchandoVoz(true);
        mostrarToast("🎙 Grabando audio a texto... habla ahora.");
      };

      recognition.onresult = (event: any) => {
        let dictadoSesion = "";
        for (let i = 0; i < event.results.length; ++i) {
          dictadoSesion += event.results[i][0].transcript;
        }
        const dictadoLimpio = dictadoSesion.trim();
        if (dictadoLimpio) {
          const nuevoTexto = textoPrevio
            ? `${textoPrevio} ${dictadoLimpio}`
            : dictadoLimpio;
          setObservacionTexto(nuevoTexto);
          handleGuardarDetallePin(pinObjetivo?.tipo || tipoSeleccionado, nuevoTexto);
        }
      };

      recognition.onerror = (event: any) => {
        setEscuchandoVoz(false);
        if (event.error !== "no-speech" && event.error !== "aborted") {
          mostrarToast(`Micrófono: ${event.error}`, "err");
        }
      };

      recognition.onend = () => {
        setEscuchandoVoz(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setEscuchandoVoz(false);
      mostrarToast("No se pudo iniciar el micrófono.", "err");
    }
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

  // GENERAR OTRO HALLAZGO EN EL MISMO PIN (MISMO NÚMERO, NO INCREMENTA)
  const handleDuplicarPin = (pinOriginal: InspectionFinding) => {
    const mismoPinNumero = pinOriginal.pinNumber || 1;
    const nuevoHallazgo: InspectionFinding = {
      ...pinOriginal,
      id: `pin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pinNumber: mismoPinNumero,
      x: pinOriginal.x,
      y: pinOriginal.y,
      descripcion: "",
      photoUrl: undefined,
      photoUrls: [],
    };
    const actualizados = [...hallazgos, nuevoHallazgo];
    setHallazgos(actualizados);
    setPinSeleccionadoId(nuevoHallazgo.id);
    setTipoSeleccionado(nuevoHallazgo.tipo);
    setObservacionTexto("");
    sincronizarHallazgosNeon(actualizados);
    mostrarToast(`✓ Nuevo hallazgo añadido al mismo Pin #${mismoPinNumero}.`);
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
      {/* ===================================================================
          BARRA DE SISTEMAS DEL VEHÍCULO: INSPECCIÓN TOTAL (5 SISTEMAS)
          =================================================================== */}
      <div className="space-y-1.5 pb-2 border-b border-zinc-200 dark:border-white/10">
        <div
          ref={seccionCarouselRef}
          onScroll={handleSeccionScroll}
          className="flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar scroll-smooth [WebkitOverflowScrolling:touch] touch-pan-x"
        >
          {SISTEMAS_INSPECCION.map((sis) => {
            const active = seccionActiva === sis.id;
            let badge = null;
            if (sis.id === "carroceria") {
              const cantCarroceria = hallazgos.filter((h) =>
                ["frontal", "trasera", "lateral_izq", "lateral_der", "superior"].includes(h.vista)
              ).length;
              if (cantCarroceria > 0) {
                badge = (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {cantCarroceria}
                  </span>
                );
              }
            } else {
              const cantPinesSis = hallazgos.filter((h) => h.vista === sis.id).length;
              if (cantPinesSis > 0) {
                badge = (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {cantPinesSis}
                  </span>
                );
              }
            }

            return (
              <button
                key={sis.id}
                id={`seccion-tab-${sis.id}`}
                type="button"
                onClick={() => setSeccionActiva(sis.id)}
                className={`h-11 sm:h-10 px-3 sm:px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer text-sm sm:text-xs font-semibold shrink-0 active:scale-95 w-full min-w-full sm:min-w-0 sm:w-auto snap-center ${
                  active
                    ? "bg-purple-50 dark:bg-purple-500/20 border-purple-400 dark:border-purple-500/40 text-purple-700 dark:text-purple-200 shadow-sm"
                    : "bg-white dark:bg-white/[0.02] hover:bg-zinc-50 dark:hover:bg-white/[0.05] border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 shadow-sm dark:shadow-none"
                }`}
              >
                <span className="text-base sm:text-sm">{sis.icon}</span>
                <span>{sis.shortName}</span>
                {badge}
              </button>
            );
          })}
        </div>

        {/* Puntos de paginación solo en móvil para ver la sección y deslizar */}
        <div className="flex sm:hidden items-center justify-center gap-1.5 pt-0.5">
          {SISTEMAS_INSPECCION.map((sis) => (
            <button
              key={sis.id}
              type="button"
              onClick={() => setSeccionActiva(sis.id)}
              aria-label={`Ir a ${sis.shortName}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                seccionActiva === sis.id ? "w-5 bg-purple-500" : "w-1.5 bg-zinc-300 dark:bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ===================================================================
          CONTENIDO DINÁMICO SEGÚN EL SISTEMA ACTIVO
          =================================================================== */}
      {seccionActiva === "carroceria" ? (
        <div className="space-y-3 animate-fade-in">

      {/* ===================================================================
          1. ESQUEMA INTERACTIVO EN 5 VISTAS CON PINES NUMERADOS (1, 2, 3...)
          =================================================================== */}
      <div className="space-y-1.5 pb-1">
        <div
          ref={vistaCarouselRef}
          onScroll={handleVistaScroll}
          className="flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar scroll-smooth [WebkitOverflowScrolling:touch] touch-pan-x"
        >
          {VISTAS_CARROCERIA.map((v) => {
            const active = vistaActiva === v.id;
            const cantVista = hallazgos.filter((h) => h.vista === v.id).length;
            return (
              <button
                key={v.id}
                id={`vista-tab-${v.id}`}
                type="button"
                onClick={() => {
                  setVistaActiva(v.id);
                  setPinSeleccionadoId(null);
                  setPopoverAbierto(false);
                }}
                className={`h-11 sm:h-12 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0 px-3 sm:px-0 w-full min-w-full sm:min-w-0 sm:w-auto snap-center ${
                  active
                    ? "bg-purple-50 dark:bg-purple-500/20 border-purple-400 dark:border-purple-500/40 text-purple-700 dark:text-purple-300 shadow-sm"
                    : "bg-white dark:bg-white/[0.02] hover:bg-zinc-50 dark:hover:bg-white/[0.05] border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 shadow-sm dark:shadow-none"
                }`}
              >
                <div className="p-1 rounded-md bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-white">{v.icon}</div>
                <span className="text-sm sm:text-xs font-semibold">{v.label}</span>
                {cantVista > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {cantVista}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Puntos de paginación solo en móvil para ver la vista y deslizar */}
        <div className="flex sm:hidden items-center justify-center gap-1.5 pt-0.5">
          {VISTAS_CARROCERIA.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setVistaActiva(v.id);
                setPinSeleccionadoId(null);
                setPopoverAbierto(false);
              }}
              aria-label={`Ir a ${v.label}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                vistaActiva === v.id ? "w-5 bg-purple-500" : "w-1.5 bg-zinc-300 dark:bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* LIENZO DEL VEHÍCULO CON PINES NUMERADOS */}
      <div className="relative rounded-2xl bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-white/10 p-3 sm:p-5 overflow-hidden select-none shadow-sm dark:shadow-none">


        <div
          onClick={handleTocarLienzo}
          onTouchEnd={handleTocarLienzo}
          style={{ touchAction: "manipulation" }}
          className={`relative w-full h-72 sm:h-96 rounded-xl border flex items-center justify-center overflow-hidden group transition-all ${
            lienzoOscuro
              ? "bg-slate-950 border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]"
              : "bg-slate-50 border-zinc-300 shadow-inner bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
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
            title="Alternar fondo: Plano Técnico CAD (Claro) / Neón 3D (Oscuro)"
            className={`absolute top-2.5 right-2.5 z-30 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-md ${
              lienzoOscuro
                ? "bg-slate-900/85 hover:bg-slate-800 border-cyan-500/40 text-cyan-300"
                : "bg-white/95 hover:bg-zinc-100 border-zinc-300 text-zinc-700 shadow-sm"
            }`}
          >
            <span>{lienzoOscuro ? "🌙 Neón 3D" : "☀️ Plano CAD"}</span>
          </button>

          {/* Banner de modo colocación de nuevo Pin */}
          {modoColocandoPin && (
            <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs shadow-xl backdrop-blur-md animate-pulse">
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
            <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-950/95 border border-amber-400 text-amber-200 text-xs shadow-xl backdrop-blur-md animate-pulse">
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

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2 sm:p-4">
            <img
              src={
                vistaActiva === "trasera" || vistaActiva === "lateral_der"
                  ? "/images/inspeccion/auto_3d_trasera.jpg"
                  : vistaActiva === "superior"
                  ? "/images/inspeccion/auto_3d_superior.jpg"
                  : "/images/inspeccion/auto_3d_frontal.jpg"
              }
              alt={`Vehículo 3D ${vistaActiva}`}
              loading="eager"
              decoding="async"
              onLoad={() => {
                setImagenCargando(false);
                setImagenError(false);
              }}
              onError={() => {
                setImagenCargando(false);
                setImagenError(true);
              }}
              style={{
                filter: lienzoOscuro
                  ? "none"
                  : "invert(1) hue-rotate(180deg) contrast(1.25) brightness(1.02)",
                mixBlendMode: lienzoOscuro ? "normal" : "multiply",
              }}
              className="max-w-full max-h-full w-auto h-auto object-contain select-none transition-all duration-300 inspeccion-wireframe-img"
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
                    setTipoSeleccionado(itemSeleccionar.tipo || "Rayón");
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
                    setTipoSeleccionado(item.tipo || "Rayón");
                    setObservacionTexto(item.descripcion || "");
                    setPopoverAbierto(true);
                    setModoColocandoPin(false);
                    setPinReubicandoId(null);
                  }}
                  className={`h-7 px-2.5 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95 ${
                    activo
                      ? "bg-rose-500 text-white border-rose-400 shadow-sm ring-1 ring-white/30"
                      : "bg-white dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <span>#{p.num}</span>
                  {p.items.length > 1 && (
                    <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 text-black text-[9px] font-black flex items-center justify-center">
                      {p.items.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
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
            <span>Generar #{proximoPinNumero}</span>
          </button>
        </div>

        {/* DETALLE MODERNO DEL PIN ACTIVO (Audio voz bidireccional, fotos R2 y cotización de servicios/productos) */}
        {popoverAbierto && pinActual && (
          <DetallePinModerno
            pin={pinActual}
            chipsTipos={CHIPS_HALLAZGO}
            tipoSeleccionado={tipoSeleccionado}
            onToggleTipo={(tipoId) => handleToggleTipoPin(pinActual.id, tipoId)}
            observacionTexto={observacionTexto}
            onChangeObservacion={(texto) => {
              setObservacionTexto(texto);
              handleGuardarDetallePin(pinActual.tipo, texto);
            }}
            escuchandoVoz={escuchandoVoz}
            onToggleVoz={() => handleToggleVozPin(pinActual.id)}
            reproduciendoAudio={reproduciendoAudio}
            onReproducirAudio={handleReproducirAudioTexto}
            subiendoFotos={subiendoFotoPin}
            onSubirFotos={(e) => handleSubirFotosPinR2(e, pinActual.id)}
            onEliminarFoto={(idx, e) => handleEliminarFotoPin(pinActual.id, idx, e)}
            productosCatalogo={productosCatalogo}
            serviciosCatalogo={serviciosCatalogo}
            onAgregarItemPin={(item) => handleAgregarItemPin(pinActual.id, item)}
            onEliminarItemPin={(itemId) => handleEliminarItemPin(pinActual.id, itemId)}
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
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-white/10 space-y-4 animate-fade-in shadow-sm dark:shadow-none">
      {(() => {
        const sistemaActual = SISTEMAS_INSPECCION.find((s) => s.id === seccionActiva);
        if (!sistemaActual) return null;

        const cantPinesSis = hallazgos.filter((h) => h.vista === seccionActiva).length;

        return (
          <>
            {cantPinesSis > 0 && (
              <div className="flex items-center justify-end pb-1">
                <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {cantPinesSis} {cantPinesSis === 1 ? "hallazgo" : "hallazgos"}
                </span>
              </div>
            )}

            {/* LIENZO 3D INTERACTIVO DEL SISTEMA (Tocar para marcar pines) */}
            <div
              onClick={handleTocarLienzo}
              onTouchEnd={handleTocarLienzo}
              style={{ touchAction: "manipulation" }}
              className={`relative w-full h-72 sm:h-96 rounded-xl border flex items-center justify-center overflow-hidden group transition-all ${
                lienzoOscuro
                  ? "bg-slate-950 border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]"
                  : "bg-slate-50 border-zinc-300 shadow-inner bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
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
                title="Alternar fondo: Plano Técnico CAD (Claro) / Neón 3D (Oscuro)"
                className={`absolute top-2.5 right-2.5 z-30 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-md ${
                  lienzoOscuro
                    ? "bg-slate-900/85 hover:bg-slate-800 border-cyan-500/40 text-cyan-300"
                    : "bg-white/95 hover:bg-zinc-100 border-zinc-300 text-zinc-700 shadow-sm"
                }`}
              >
                <span>{lienzoOscuro ? "🌙 Neón 3D" : "☀️ Plano CAD"}</span>
              </button>

              {/* Banner de modo colocación de nuevo Pin */}
              {modoColocandoPin && (
                <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs shadow-xl backdrop-blur-md animate-pulse">
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
                <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-950/95 border border-amber-400 text-amber-200 text-xs shadow-xl backdrop-blur-md animate-pulse">
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

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2 sm:p-4">
                <img
                  src={
                    seccionActiva === "frenos"
                      ? "/images/inspeccion/auto_3d_frenos.jpg"
                      : seccionActiva === "suspension"
                      ? "/images/inspeccion/auto_3d_suspension.jpg"
                      : seccionActiva === "electrico"
                      ? "/images/inspeccion/auto_3d_electrico.jpg"
                      : "/images/inspeccion/auto_3d_motor.jpg"
                  }
                  alt={`${sistemaActual.name} 3D`}
                  loading="eager"
                  decoding="async"
                  onLoad={() => {
                    setImagenCargando(false);
                    setImagenError(false);
                  }}
                  onError={() => {
                    setImagenCargando(false);
                    setImagenError(true);
                  }}
                  style={{
                    filter: lienzoOscuro
                      ? "none"
                      : "invert(1) hue-rotate(180deg) contrast(1.25) brightness(1.02)",
                    mixBlendMode: lienzoOscuro ? "normal" : "multiply",
                  }}
                  className="max-w-full max-h-full w-auto h-auto object-contain select-none transition-all duration-300 inspeccion-wireframe-img"
                />
              </div>

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
                        setTipoSeleccionado(itemSeleccionar.tipo || "Fuga");
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
                        setTipoSeleccionado(item.tipo || "Fuga");
                        setObservacionTexto(item.descripcion || "");
                        setPopoverAbierto(true);
                        setModoColocandoPin(false);
                        setPinReubicandoId(null);
                      }}
                      className={`h-7 px-2.5 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95 ${
                        activo
                          ? "bg-rose-500 text-white border-rose-400 shadow-sm ring-1 ring-white/30"
                          : "bg-white dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>#{p.num}</span>
                      {p.items.length > 1 && (
                        <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 text-black text-[9px] font-black flex items-center justify-center">
                          {p.items.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
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
                <span>Generar #{proximoPinNumero}</span>
              </button>
            </div>

            {/* DETALLE MODERNO PARA PINES DEL SISTEMA MECÁNICO */}
            {popoverAbierto && pinActual && pinActual.vista === seccionActiva && (
              <DetallePinModerno
                pin={pinActual}
                chipsTipos={CHIPS_HALLAZGO_MECANICO}
                tipoSeleccionado={tipoSeleccionado}
                onToggleTipo={(tipoId) => handleToggleTipoPin(pinActual.id, tipoId)}
                observacionTexto={observacionTexto}
                onChangeObservacion={(texto) => {
                  setObservacionTexto(texto);
                  handleGuardarDetallePin(pinActual.tipo, texto);
                }}
                escuchandoVoz={escuchandoVoz}
                onToggleVoz={() => handleToggleVozPin(pinActual.id)}
                reproduciendoAudio={reproduciendoAudio}
                onReproducirAudio={handleReproducirAudioTexto}
                subiendoFotos={subiendoFotoPin}
                onSubirFotos={(e) => handleSubirFotosPinR2(e, pinActual.id)}
                onEliminarFoto={(idx, e) => handleEliminarFotoPin(pinActual.id, idx, e)}
                productosCatalogo={productosCatalogo}
                serviciosCatalogo={serviciosCatalogo}
                onAgregarItemPin={(item) => handleAgregarItemPin(pinActual.id, item)}
                onEliminarItemPin={(itemId) => handleEliminarItemPin(pinActual.id, itemId)}
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
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight">TALLER AUTOMOTRIZ AUTOG</h1>
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
              {Object.keys(evaluacionesPlantilla).length > 0 && (
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
                  <p>Trazabilidad en Cloudflare R2 y Neon PostgreSQL</p>
                </div>
              </div>
            </div>

            {/* Pie del Modal con Botones de Acción */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalPdfAbierto(false)}
                className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleEnviarReporteWhatsApp}
                className="h-10 px-5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <span>💬 WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="h-10 px-6 rounded-xl bg-purple-500 hover:bg-purple-400 text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95"
              >
                <span>🖨️ PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          BOTONES DE NAVEGACIÓN
          =================================================================== */}
      <div className="flex items-center justify-between pt-2">
        {onVolver ? (
          <button
            type="button"
            onClick={onVolver}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 transition-all cursor-pointer"
          >
            ← Anterior
          </button>
        ) : <div />}

        {onContinuar && (
          <button
            type="button"
            onClick={onContinuar}
            className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}
