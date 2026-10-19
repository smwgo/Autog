"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { UnifiedOrder, InspectionFinding } from "@/app/taller/page";

export interface InspeccionVehiculoProps {
  ordenActiva: UnifiedOrder | null;
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
    name: "Carrocería (5 Vistas)",
    shortName: "Carrocería",
    icon: "🚗",
    description: "Inspección exterior en 5 planos vectoriales con registro de daños y fotos",
  },
  {
    id: "motor",
    name: "Motor y Componentes",
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
    name: "Sistema de Frenos",
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
    name: "Suspensión y Dirección",
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
    name: "Sistema Eléctrico y Batería",
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

export default function InspeccionVehiculo({
  ordenActiva,
  onUpdateOrden,
  onGenerarPdf,
  onContinuar,
  onVolver,
  mostrarToast = (msg) => console.log(msg),
}: InspeccionVehiculoProps) {
  const [vistaActiva, setVistaActiva] = useState<VistaVehiculoId>("frontal");
  const [hallazgos, setHallazgos] = useState<InspectionFinding[]>(
    ordenActiva?.inspectionFindings || []
  );
  const [pinSeleccionadoId, setPinSeleccionadoId] = useState<string | null>(null);

  // Modo visual del lienzo: 3D Holográfico (Rayos X) vs Esquema CAD 2D
  const [modoVisual, setModoVisual] = useState<"3d" | "2d">("3d");

  // Estados para popover del pin activo
  const [popoverAbierto, setPopoverAbierto] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("Rayón");
  const [observacionTexto, setObservacionTexto] = useState("");
  const [subiendoFotoPin, setSubiendoFotoPin] = useState(false);

  // Estados para Sistemas de Inspección Total del Vehículo
  const [seccionActiva, setSeccionActiva] = useState<SeccionInspeccionId>("carroceria");
  const [evaluacionesPlantilla, setEvaluacionesPlantilla] = useState<Record<string, any>>({});

  // Modal de PDF y Envío WhatsApp de Inspección
  const [modalPdfAbierto, setModalPdfAbierto] = useState(false);

  const [firmaRecepcionUrl, setFirmaRecepcionUrl] = useState<string | null>(
    ordenActiva?.receptionSignatureUrl || null
  );

  // Sincronizar hallazgos locales cuando la orden activa cambie
  useEffect(() => {
    if (ordenActiva?.inspectionFindings) {
      setHallazgos(ordenActiva.inspectionFindings);
    }
    if (ordenActiva?.receptionSignatureUrl) {
      setFirmaRecepcionUrl(ordenActiva.receptionSignatureUrl);
    }
    if ((ordenActiva as any)?.inspectionChecklist) {
      setEvaluacionesPlantilla((ordenActiva as any).inspectionChecklist);
    }
  }, [ordenActiva]);

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

  // 1. ESQUEMA INTERACTIVO: DETECCIÓN DE TOQUE EN COORDENADAS PORCENTUALES Y PINES NUMERADOS
  const handleTocarLienzo = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(5, Math.min(95, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

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
      descripcion: `${tipoDefault} en ${vistaLabel} #${nuevoPinNumero}`,
      pinNumber: nuevoPinNumero,
    };

    const actualizados = [...hallazgos, nuevoHallazgo];
    setHallazgos(actualizados);
    setPinSeleccionadoId(nuevoHallazgo.id);
    setTipoSeleccionado(tipoDefault);
    setObservacionTexto("");
    setPopoverAbierto(true);

    sincronizarHallazgosNeon(actualizados);
    mostrarToast(`Pin #${nuevoPinNumero} marcado en ${vistaLabel}. Elige el detalle.`);
  };

  const pinActual = hallazgos.find((h) => h.id === pinSeleccionadoId) || null;

  const handleGuardarDetallePin = (tipo: string, obs?: string) => {
    if (!pinSeleccionadoId) return;
    const actualizados = hallazgos.map((h) => {
      if (h.id === pinSeleccionadoId) {
        return {
          ...h,
          tipo,
          descripcion: obs !== undefined ? obs.trim() : h.descripcion,
        };
      }
      return h;
    });
    setHallazgos(actualizados);
    sincronizarHallazgosNeon(actualizados);
  };

  const handleEliminarPin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actualizados = hallazgos.filter((h) => h.id !== id);
    setHallazgos(actualizados);
    if (pinSeleccionadoId === id) {
      setPinSeleccionadoId(null);
      setPopoverAbierto(false);
    }
    sincronizarHallazgosNeon(actualizados);
    mostrarToast("Pin eliminado de la inspección.");
  };

  // 2. FOTOS COMO EVIDENCIA EN CLOUDFLARE R2 CON FECHA Y HORA AUTOMÁTICA
  const handleSubirFotoPinR2 = async (e: React.ChangeEvent<HTMLInputElement>, targetPinId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubiendoFotoPin(true);
      mostrarToast("Subiendo evidencia a Cloudflare R2 en segundo plano...", "ok");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "taller_inspeccion_evidencia");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        const ahora = new Date();
        const timestampExacto = ahora.toLocaleString("es-EC", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const actualizados = hallazgos.map((h) => {
          if (h.id === targetPinId) {
            return {
              ...h,
              photoUrl: data.url,
              capturedAt: timestampExacto,
            };
          }
          return h;
        });

        setHallazgos(actualizados);
        sincronizarHallazgosNeon(actualizados);
        mostrarToast(`✓ Evidencia guardada en R2 con fecha: ${timestampExacto}`);
      } else {
        mostrarToast(data.error || "No se pudo subir la foto a R2", "err");
      }
    } catch {
      mostrarToast("Error de conexión al subir foto a R2", "err");
    } finally {
      setSubiendoFotoPin(false);
    }
  };

  // 3. SELECCIÓN DE SISTEMAS Y EVALUACIÓN
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
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
            } else if (sis.items) {
              const cantPinesSis = hallazgos.filter((h) => h.vista === sis.id).length;
              const resp = sis.items.filter((it) => evaluacionesPlantilla[it.id] !== undefined).length;
              const malos = sis.items.filter((it) => evaluacionesPlantilla[it.id] === "MALO").length;
              if (cantPinesSis > 0 || malos > 0) {
                badge = (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1">
                    {cantPinesSis > 0 && <span>📍{cantPinesSis}</span>}
                    {malos > 0 && <span>!{malos}</span>}
                  </span>
                );
              } else if (resp > 0) {
                badge = (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                    {resp}/{sis.items.length}
                  </span>
                );
              }
            }

            return (
              <button
                key={sis.id}
                type="button"
                onClick={() => setSeccionActiva(sis.id)}
                className={`h-10 px-3 sm:px-4 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-xs font-medium active:scale-95 ${
                  active
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-200 shadow-md shadow-purple-500/10"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-sm">{sis.icon}</span>
                <span>{sis.shortName}</span>
                {badge}
              </button>
            );
          })}
        </div>

        {/* BOTÓN MINIMALISTA CON ICONO TRANSPARENTE: "PDF DE INSPECCIÓN" */}
        <button
          type="button"
          onClick={() => setModalPdfAbierto(true)}
          className="h-10 px-3.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm ml-auto"
        >
          <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span>PDF de Inspección</span>
        </button>
      </div>

      {/* ===================================================================
          CONTENIDO DINÁMICO SEGÚN EL SISTEMA ACTIVO
          =================================================================== */}
      {seccionActiva === "carroceria" ? (
        <div className="space-y-3 animate-fade-in">

      {/* ===================================================================
          1. ESQUEMA INTERACTIVO EN 5 VISTAS CON PINES NUMERADOS (1, 2, 3...)
          =================================================================== */}
      <div className="grid grid-cols-5 gap-2">
        {[
          {
            id: "frontal" as const,
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
            id: "trasera" as const,
            label: "2. Trasera",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l1.5-6h13.5l1.5 6M3.75 13.5h16.5M3.75 13.5v5.25h16.5V13.5" />
                <rect x="7" y="15" width="10" height="2" rx="1" />
              </svg>
            ),
          },
          {
            id: "lateral_izq" as const,
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
            id: "lateral_der" as const,
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
            id: "superior" as const,
            label: "5. Superior",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <rect x="6" y="3" width="12" height="18" rx="4" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="6" y1="8" x2="18" y2="8" strokeLinecap="round" />
                <line x1="6" y1="16" x2="18" y2="16" strokeLinecap="round" />
              </svg>
            ),
          },
        ].map((v) => {
          const active = vistaActiva === v.id;
          const cantVista = hallazgos.filter((h) => h.vista === v.id).length;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setVistaActiva(v.id);
                setPinSeleccionadoId(null);
                setPopoverAbierto(false);
              }}
              className={`h-11 sm:h-12 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all cursor-pointer active:scale-95 ${
                active
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-md shadow-purple-500/10"
                  : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="p-1 rounded-md bg-white/5">{v.icon}</div>
              <span className="text-[10px] sm:text-xs font-semibold">{v.label}</span>
              {cantVista > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {cantVista}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* LIENZO DEL VEHÍCULO CON PINES NUMERADOS */}
      <div className="relative rounded-2xl bg-[#09090b] border border-white/10 p-3 sm:p-5 overflow-hidden select-none">
        {/* Cabecera del Lienzo con Switch 3D Holograma vs CAD 2D */}
        <div className="flex items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {modoVisual === "3d" ? "Auto Holográfico 3D (Rayos X)" : "Esquema Vectorial CAD 2D"}
            </span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">• Toca sobre el vehículo para marcar</span>
          </div>

          <div className="flex items-center bg-black/70 p-1 rounded-xl border border-white/10 gap-1">
            <button
              type="button"
              onClick={() => setModoVisual("3d")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                modoVisual === "3d"
                  ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>✨ 3D Holograma</span>
            </button>
            <button
              type="button"
              onClick={() => setModoVisual("2d")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                modoVisual === "2d"
                  ? "bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-500/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>📐 CAD 2D</span>
            </button>
          </div>
        </div>

        <div
          onClick={handleTocarLienzo}
          className={`relative w-full h-72 sm:h-96 rounded-xl flex items-center justify-center cursor-crosshair overflow-hidden group transition-all ${
            modoVisual === "3d"
              ? "bg-black border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]"
              : "bg-white/[0.02] border border-white/5"
          }`}
        >
          {modoVisual === "3d" ? (
            <div className="relative w-full h-full flex items-center justify-center pointer-events-none p-2 sm:p-4">
              <img
                src={
                  vistaActiva === "trasera" || vistaActiva === "lateral_der"
                    ? "/images/inspeccion/auto_3d_trasera.jpg"
                    : vistaActiva === "superior"
                    ? "/images/inspeccion/auto_3d_superior.jpg"
                    : "/images/inspeccion/auto_3d_frontal.jpg"
                }
                alt={`Vehículo 3D ${vistaActiva}`}
                className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(6,182,212,0.35)] select-none"
              />
            </div>
          ) : (
            /* Planos Vectoriales SVG Limpios */
            <div className="w-full h-full flex items-center justify-center pointer-events-none p-4">
            {/* 1. VISTA FRONTAL: Sedán deportivo moderno de alta gama */}
            {vistaActiva === "frontal" && (
              <svg className="w-full h-full max-h-72 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.8}>
                {/* Neumáticos y línea de suelo */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 124 236 L 124 268 C 124 272, 146 272, 146 268 L 146 238" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 454 238 L 454 268 C 454 272, 476 272, 476 268 L 476 236" />
                <line x1="80" y1="270" x2="520" y2="270" strokeWidth={1} strokeDasharray="6 4" opacity={0.3} />

                {/* Silueta exterior aerodinámica deportiva */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M 226 64 C 265 56, 335 56, 374 64 C 398 96, 420 132, 436 148 C 456 156, 476 172, 484 196 C 488 214, 484 238, 470 252 C 420 266, 180 266, 130 252 C 116 238, 112 214, 116 196 C 124 172, 144 156, 164 148 C 180 132, 202 96, 226 64 Z" />

                {/* Parabrisas aerodinámico con curvatura suave */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 232 74 C 270 66, 330 66, 368 74 C 396 114, 410 136, 418 144 C 360 152, 240 152, 182 144 C 190 136, 204 114, 232 74 Z" />
                {/* Espejo retrovisor interior */}
                <line x1="300" y1="74" x2="300" y2="82" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 288 82 L 312 82 L 309 92 L 291 92 Z" strokeWidth={1.2} />

                {/* Líneas de carácter en el capó (nervaduras aerodinámicas) */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 234 150 C 240 176, 232 200, 216 208" opacity={0.7} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 366 150 C 360 176, 368 200, 384 208" opacity={0.7} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 276 154 C 278 178, 268 200, 258 208" opacity={0.5} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 324 154 C 322 178, 332 200, 342 208" opacity={0.5} />

                {/* Faros Matrix LED modernos con firma lumínica DRL */}
                {/* Faro Izquierdo */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 136 186 C 160 182, 198 186, 218 202 C 210 214, 174 218, 142 208 C 134 200, 132 194, 136 186 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 142 190 C 164 187, 194 191, 212 202" strokeWidth={2.4} opacity={0.9} />
                <circle cx="160" cy="198" r="4.5" strokeWidth={1.4} opacity={0.8} />
                <circle cx="180" cy="201" r="4.5" strokeWidth={1.4} opacity={0.8} />

                {/* Faro Derecho */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 464 186 C 440 182, 402 186, 382 202 C 390 214, 426 218, 458 208 C 466 200, 468 194, 464 186 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 458 190 C 436 187, 406 191, 388 202" strokeWidth={2.4} opacity={0.9} />
                <circle cx="440" cy="198" r="4.5" strokeWidth={1.4} opacity={0.8} />
                <circle cx="420" cy="201" r="4.5" strokeWidth={1.4} opacity={0.8} />

                {/* Parrilla central deportiva con entramado y emblema */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 234 206 C 274 204, 326 204, 366 206 L 356 246 C 326 250, 274 250, 244 246 Z" />
                <line x1="242" y1="218" x2="358" y2="218" opacity={0.4} />
                <line x1="246" y1="228" x2="354" y2="228" opacity={0.4} />
                <line x1="249" y1="238" x2="351" y2="238" opacity={0.4} />
                <ellipse cx="300" cy="214" rx="14" ry="9" strokeWidth={1.4} />

                {/* Tomas de aire inferiores, difusor y splitter */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 132 222 L 180 226 L 174 246 L 130 240 Z" opacity={0.7} />
                <line x1="152" y1="224" x2="148" y2="242" opacity={0.5} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 468 222 L 420 226 L 426 246 L 470 240 Z" opacity={0.7} />
                <line x1="448" y1="224" x2="452" y2="242" opacity={0.5} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 224 254 C 265 258, 335 258, 376 254 L 382 262 C 335 266, 265 266, 218 262 Z" strokeWidth={1.6} />

                {/* Retrovisores modernos aerodinámicos con intermitente LED */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 170 156 L 152 152" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 152 144 C 136 140, 96 142, 88 152 C 86 160, 102 166, 132 164 C 146 162, 154 154, 152 144 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 94 154 C 108 156, 126 158, 142 155" strokeWidth={2} opacity={0.9} />

                <path strokeLinecap="round" strokeLinejoin="round" d="M 430 156 L 448 152" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 448 144 C 464 140, 504 142, 512 152 C 514 160, 498 166, 468 164 C 454 162, 446 154, 448 144 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 506 154 C 492 156, 474 158, 458 155" strokeWidth={2} opacity={0.9} />
              </svg>
            )}

            {/* 2. VISTA TRASERA: Inconfundiblemente la parte posterior del vehículo */}
            {vistaActiva === "trasera" && (
              <svg className="w-full h-full max-h-72 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.8}>
                {/* Neumáticos traseros con banda de rodadura vista desde atrás */}
                <rect x="114" y="226" width="30" height="39" rx="3" strokeWidth={1.8} />
                <line x1="124" y1="232" x2="124" y2="265" strokeWidth={1} opacity={0.4} />
                <line x1="134" y1="232" x2="134" y2="265" strokeWidth={1} opacity={0.4} />

                <rect x="456" y="226" width="30" height="39" rx="3" strokeWidth={1.8} />
                <line x1="466" y1="232" x2="466" y2="265" strokeWidth={1} opacity={0.4} />
                <line x1="476" y1="232" x2="476" y2="265" strokeWidth={1} opacity={0.4} />

                {/* Línea de suelo */}
                <line x1="70" y1="265" x2="530" y2="265" strokeWidth={1} strokeDasharray="6 4" opacity={0.3} />

                {/* Silueta exterior carrocería trasera */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M 215 70 Q 300 64 385 70 C 412 100, 436 130, 450 150 C 468 156, 482 174, 485 202 C 486 224, 480 242, 470 254 C 415 262, 185 262, 130 254 C 120 242, 114 224, 115 202 C 118 174, 132 156, 150 150 C 164 130, 188 100, 215 70 Z" />

                {/* Alerón de techo con tercera luz de freno en gris plomo */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 205 68 C 260 62, 340 62, 395 68 L 390 76 C 340 72, 260 72, 210 76 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.08" strokeWidth={1.6} />
                <rect x="260" y="70" width="80" height="4" rx="2" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth={1.2} />

                {/* Luneta trasera (Vidrio posterior con curvatura) */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 220 78 Q 300 72 380 78 L 432 144 Q 300 150 168 144 Z" />
                <line x1="195" y1="104" x2="405" y2="104" strokeWidth={0.7} opacity={0.25} />
                <line x1="184" y1="120" x2="416" y2="120" strokeWidth={0.7} opacity={0.25} />
                <line x1="176" y1="134" x2="424" y2="134" strokeWidth={0.7} opacity={0.25} />

                {/* Apoyacabezas de los asientos delanteros vistos por detrás */}
                <rect x="228" y="94" width="38" height="24" rx="7" strokeWidth={1.2} opacity={0.4} />
                <line x1="240" y1="118" x2="240" y2="126" strokeWidth={1.2} opacity={0.3} />
                <line x1="254" y1="118" x2="254" y2="126" strokeWidth={1.2} opacity={0.3} />

                <rect x="334" y="94" width="38" height="24" rx="7" strokeWidth={1.2} opacity={0.4} />
                <line x1="346" y1="118" x2="346" y2="126" strokeWidth={1.2} opacity={0.3} />
                <line x1="360" y1="118" x2="360" y2="126" strokeWidth={1.2} opacity={0.3} />

                {/* LIMPIAPARABRISAS TRASERO (Elemento universal e inconfundible de la parte trasera) */}
                <circle cx="300" cy="142" r="3.5" fill="currentColor" />
                <line x1="300" y1="142" x2="365" y2="134" strokeWidth={2.4} strokeLinecap="round" />
                <line x1="345" y1="136" x2="385" y2="131" strokeWidth={1.8} strokeLinecap="round" />

                {/* Tapa del Baúl / Maletera con cámara de retroceso y emblema */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 152 148 Q 300 154 448 148" />
                <circle cx="300" cy="158" r="9" strokeWidth={1.4} />
                <circle cx="300" cy="170" r="2.5" fill="currentColor" opacity={0.7} /> {/* Lente cámara reversa */}

                {/* FAROS TRASEROS EN GRIS PLOMO CAD (Ópticas traseras elegantes) */}
                {/* Faro Izquierdo */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 118 162 L 225 168 L 220 196 L 128 190 C 120 184, 118 174, 118 162 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.08" strokeWidth={2} />
                <line x1="126" y1="170" x2="218" y2="174" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
                <rect x="135" y="178" width="38" height="8" rx="2" stroke="currentColor" opacity={0.6} strokeWidth={1} />
                <rect x="178" y="179" width="36" height="8" rx="2" stroke="currentColor" opacity={0.4} strokeWidth={1} />

                {/* Faro Derecho */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 482 162 L 375 168 L 380 196 L 472 190 C 480 184, 482 174, 482 162 Z" stroke="currentColor" fill="currentColor" fillOpacity="0.08" strokeWidth={2} />
                <line x1="474" y1="170" x2="382" y2="174" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
                <rect x="427" y="178" width="38" height="8" rx="2" stroke="currentColor" opacity={0.6} strokeWidth={1} />
                <rect x="386" y="179" width="36" height="8" rx="2" stroke="currentColor" opacity={0.4} strokeWidth={1} />

                {/* Tira continua entre faros */}
                <line x1="225" y1="170" x2="375" y2="170" stroke="currentColor" strokeWidth={1.8} opacity={0.6} />

                {/* Línea de corte inferior de la compuerta de maletera */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 180 198 Q 300 203 420 198" opacity={0.6} />

                {/* Parachoques trasero con luz de patente y PLACA */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 116 210 Q 300 216 484 210" opacity={0.4} />
                {/* Luces de patente */}
                <rect x="265" y="206" width="14" height="3" rx="1" opacity={0.6} />
                <rect x="321" y="206" width="14" height="3" rx="1" opacity={0.6} />
                {/* Placa Patente */}
                <rect x="238" y="210" width="124" height="26" rx="3" strokeWidth={1.5} />
                <text x="300" y="227" textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="monospace" fontWeight="bold" opacity={0.8} letterSpacing="3">PLACA</text>

                {/* Reflectores inferiores y sensores de retroceso */}
                <rect x="135" y="226" width="30" height="6" rx="3" stroke="currentColor" opacity={0.7} strokeWidth={1.4} />
                <rect x="435" y="226" width="30" height="6" rx="3" stroke="currentColor" opacity={0.7} strokeWidth={1.4} />
                <circle cx="180" cy="227" r="2" opacity={0.6} />
                <circle cx="218" cy="227" r="2" opacity={0.6} />
                <circle cx="382" cy="227" r="2" opacity={0.6} />
                <circle cx="420" cy="227" r="2" opacity={0.6} />

                {/* Silenciador de escape visible debajo del chasis */}
                <rect x="220" y="248" width="160" height="12" rx="4" strokeWidth={1} opacity={0.25} />

                {/* Difusor aerodinámico */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 180 248 Q 300 252 420 248 L 410 262 Q 300 265 190 262 Z" opacity={0.5} />
                <line x1="270" y1="250" x2="270" y2="261" opacity={0.4} />
                <line x1="300" y1="251" x2="300" y2="262" opacity={0.4} />
                <line x1="330" y1="250" x2="330" y2="261" opacity={0.4} />

                {/* Tubos de escape dobles cromados (2 a la izquierda, 2 a la derecha) */}
                <circle cx="148" cy="252" r="7" strokeWidth={1.8} />
                <circle cx="166" cy="252" r="7" strokeWidth={1.8} />
                <circle cx="434" cy="252" r="7" strokeWidth={1.8} />
                <circle cx="452" cy="252" r="7" strokeWidth={1.8} />
              </svg>
            )}

            {/* 3. VISTA LATERAL IZQUIERDA: Coupé 4 puertas de perfil dinámico */}
            {vistaActiva === "lateral_izq" && (
              <svg className="w-full h-full max-h-72 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.8}>
                {/* Línea de suelo */}
                <line x1="20" y1="270" x2="580" y2="270" strokeWidth={1} strokeDasharray="6 4" opacity={0.3} />

                {/* Silueta exterior fluida tipo fastback */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M 42 208 C 42 196, 52 184, 72 176 C 114 166, 160 158, 198 146 C 228 114, 262 86, 304 82 C 354 78, 406 82, 442 96 C 478 116, 516 150, 540 164 C 552 166, 562 170, 566 174 C 574 186, 572 208, 554 222 C 544 226, 524 228, 512 228 C 512 203, 492 184, 462 184 C 432 184, 412 203, 412 228 L 208 228 C 208 203, 188 184, 158 184 C 128 184, 108 203, 108 228 L 54 228 C 44 224, 42 216, 42 208 Z" />

                {/* Acristalamiento con pilar B y curva Hofmeister */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 208 144 L 292 90 L 348 90 L 348 148 L 208 144 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 356 90 L 428 100 C 456 114, 484 136, 494 146 L 356 148 Z" />
                <line x1="456" y1="146" x2="444" y2="106" opacity={0.5} />
                <rect x="348" y="90" width="8" height="58" opacity={0.6} />

                {/* Línea de cintura tensa y faldón lateral */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 74 178 C 178 164, 380 154, 552 170" opacity={0.7} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 216 216 C 300 212, 400 212, 418 216" opacity={0.5} />

                {/* Líneas de apertura de puertas */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 204 146 L 202 226" opacity={0.8} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 352 90 L 352 226" opacity={0.8} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 434 148 C 438 170, 428 203, 416 226" opacity={0.8} />

                {/* Manijas de puerta integradas enrasadas */}
                <rect x="254" y="160" width="22" height="5" rx="2.5" strokeWidth={1.4} />
                <rect x="366" y="160" width="22" height="5" rx="2.5" strokeWidth={1.4} />

                {/* Espejo y antena de tiburón */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 206 140 C 194 134, 182 138, 178 146 C 182 152, 194 154, 204 148 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 436 94 L 444 84 L 452 94 Z" opacity={0.8} />

                {/* Remates ópticos envolventes */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 48 186 C 64 182, 84 180, 94 180 L 91 190 Z" opacity={0.8} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 560 174 C 550 176, 534 178, 528 184 L 538 190 Z" opacity={0.8} />

                {/* Rueda Delantera con llanta de aleación y freno de disco (158, 228) */}
                <circle cx="158" cy="228" r="41" strokeWidth={2} />
                <circle cx="158" cy="228" r="31" strokeWidth={1.4} />
                <circle cx="158" cy="228" r="23" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 142 214 C 146 210, 154 210, 158 214 L 155 224 L 142 220 Z" strokeWidth={1.6} />
                <circle cx="158" cy="228" r="9" strokeWidth={1.4} />
                <line x1="158" y1="219" x2="158" y2="199" strokeWidth={2.2} />
                <line x1="166" y1="223" x2="183" y2="210" strokeWidth={2.2} />
                <line x1="164" y1="234" x2="176" y2="252" strokeWidth={2.2} />
                <line x1="152" y1="234" x2="140" y2="252" strokeWidth={2.2} />
                <line x1="150" y1="223" x2="133" y2="210" strokeWidth={2.2} />

                {/* Rueda Trasera con llanta de aleación y freno de disco (462, 228) */}
                <circle cx="462" cy="228" r="41" strokeWidth={2} />
                <circle cx="462" cy="228" r="31" strokeWidth={1.4} />
                <circle cx="462" cy="228" r="23" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 446 214 C 450 210, 458 210, 462 214 L 459 224 L 446 220 Z" strokeWidth={1.6} />
                <circle cx="462" cy="228" r="9" strokeWidth={1.4} />
                <line x1="462" y1="219" x2="462" y2="199" strokeWidth={2.2} />
                <line x1="470" y1="223" x2="487" y2="210" strokeWidth={2.2} />
                <line x1="468" y1="234" x2="480" y2="252" strokeWidth={2.2} />
                <line x1="456" y1="234" x2="444" y2="252" strokeWidth={2.2} />
                <line x1="454" y1="223" x2="437" y2="210" strokeWidth={2.2} />
              </svg>
            )}

            {/* 4. VISTA LATERAL DERECHA: Reflejo simétrico exacto */}
            {vistaActiva === "lateral_der" && (
              <svg className="w-full h-full max-h-72 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <g transform="scale(-1, 1) translate(-600, 0)">
                  {/* Línea de suelo */}
                  <line x1="20" y1="270" x2="580" y2="270" strokeWidth={1} strokeDasharray="6 4" opacity={0.3} />

                  {/* Silueta exterior fluida tipo fastback */}
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M 42 208 C 42 196, 52 184, 72 176 C 114 166, 160 158, 198 146 C 228 114, 262 86, 304 82 C 354 78, 406 82, 442 96 C 478 116, 516 150, 540 164 C 552 166, 562 170, 566 174 C 574 186, 572 208, 554 222 C 544 226, 524 228, 512 228 C 512 203, 492 184, 462 184 C 432 184, 412 203, 412 228 L 208 228 C 208 203, 188 184, 158 184 C 128 184, 108 203, 108 228 L 54 228 C 44 224, 42 216, 42 208 Z" />

                  {/* Acristalamiento con pilar B y curva Hofmeister */}
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 208 144 L 292 90 L 348 90 L 348 148 L 208 144 Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 356 90 L 428 100 C 456 114, 484 136, 494 146 L 356 148 Z" />
                  <line x1="456" y1="146" x2="444" y2="106" opacity={0.5} />
                  <rect x="348" y="90" width="8" height="58" opacity={0.6} />

                  {/* Línea de cintura tensa y faldón lateral */}
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 74 178 C 178 164, 380 154, 552 170" opacity={0.7} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 216 216 C 300 212, 400 212, 418 216" opacity={0.5} />

                  {/* Líneas de apertura de puertas */}
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 204 146 L 202 226" opacity={0.8} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 352 90 L 352 226" opacity={0.8} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 434 148 C 438 170, 428 203, 416 226" opacity={0.8} />

                  {/* Manijas de puerta integradas enrasadas */}
                  <rect x="254" y="160" width="22" height="5" rx="2.5" strokeWidth={1.4} />
                  <rect x="366" y="160" width="22" height="5" rx="2.5" strokeWidth={1.4} />

                  {/* Espejo y antena de tiburón */}
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 206 140 C 194 134, 182 138, 178 146 C 182 152, 194 154, 204 148 Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 436 94 L 444 84 L 452 94 Z" opacity={0.8} />

                  {/* Remates ópticos envolventes */}
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 48 186 C 64 182, 84 180, 94 180 L 91 190 Z" opacity={0.8} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 560 174 C 550 176, 534 178, 528 184 L 538 190 Z" opacity={0.8} />

                  {/* Ruedas de aleación con frenos */}
                  <circle cx="158" cy="228" r="41" strokeWidth={2} />
                  <circle cx="158" cy="228" r="31" strokeWidth={1.4} />
                  <circle cx="158" cy="228" r="23" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 142 214 C 146 210, 154 210, 158 214 L 155 224 L 142 220 Z" strokeWidth={1.6} />
                  <circle cx="158" cy="228" r="9" strokeWidth={1.4} />
                  <line x1="158" y1="219" x2="158" y2="199" strokeWidth={2.2} />
                  <line x1="166" y1="223" x2="183" y2="210" strokeWidth={2.2} />
                  <line x1="164" y1="234" x2="176" y2="252" strokeWidth={2.2} />
                  <line x1="152" y1="234" x2="140" y2="252" strokeWidth={2.2} />
                  <line x1="150" y1="223" x2="133" y2="210" strokeWidth={2.2} />

                  <circle cx="462" cy="228" r="41" strokeWidth={2} />
                  <circle cx="462" cy="228" r="31" strokeWidth={1.4} />
                  <circle cx="462" cy="228" r="23" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M 446 214 C 450 210, 458 210, 462 214 L 459 224 L 446 220 Z" strokeWidth={1.6} />
                  <circle cx="462" cy="228" r="9" strokeWidth={1.4} />
                  <line x1="462" y1="219" x2="462" y2="199" strokeWidth={2.2} />
                  <line x1="470" y1="223" x2="487" y2="210" strokeWidth={2.2} />
                  <line x1="468" y1="234" x2="480" y2="252" strokeWidth={2.2} />
                  <line x1="456" y1="234" x2="444" y2="252" strokeWidth={2.2} />
                  <line x1="454" y1="223" x2="437" y2="210" strokeWidth={2.2} />
                </g>
              </svg>
            )}

            {/* 5. VISTA SUPERIOR: Planta aerodinámica con techo panorámico doble */}
            {vistaActiva === "superior" && (
              <svg className="w-full h-full max-h-72 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.8}>
                {/* Contorno aerodinámico del vehículo */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M 118 160 C 118 108, 142 66, 212 54 C 290 48, 380 48, 458 56 C 518 68, 542 110, 542 160 C 542 210, 518 252, 458 264 C 380 272, 290 272, 212 266 C 142 254, 118 212, 118 160 Z" />

                {/* Capó delantero con nervaduras y emblema */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 146 100 C 186 104, 208 108, 224 112" opacity={0.6} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 146 220 C 186 216, 208 212, 224 208" opacity={0.6} />
                <ellipse cx="132" cy="160" rx="4" ry="7" strokeWidth={1.2} />

                {/* Parabrisas delantero curvo */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 228 74 C 240 118, 240 202, 228 246 C 264 240, 276 234, 282 232 C 282 120, 282 120, 282 88 C 276 86, 264 80, 228 74 Z" />

                {/* Techo panorámico de cristal de 2 secciones */}
                <rect x="288" y="86" width="60" height="148" rx="10" strokeWidth={1.4} opacity={0.9} />
                <rect x="354" y="88" width="64" height="144" rx="10" strokeWidth={1.4} opacity={0.9} />

                {/* Luneta trasera curva */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 424 90 C 434 120, 434 200, 424 230 C 452 224, 464 216, 470 210 C 470 120, 470 120, 470 110 C 464 104, 452 96, 424 90 Z" />

                {/* Tapa de baúl y alerón ducktail */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 478 110 C 496 114, 514 122, 524 130 L 524 190 C 514 198, 496 206, 478 210" opacity={0.8} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 522 136 C 532 144, 534 176, 522 184" strokeWidth={2} />

                {/* Espejos retrovisores laterales aerodinámicos */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 242 72 C 238 54, 222 46, 210 50 C 208 58, 220 68, 238 74 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 242 248 C 238 266, 222 274, 210 270 C 208 262, 220 252, 238 246 Z" />

                {/* Ópticas delanteras y traseras vistas desde arriba */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M 124 135 C 136 122, 150 115, 166 112" strokeWidth={2.2} opacity={0.8} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 124 185 C 136 198, 150 205, 166 208" strokeWidth={2.2} opacity={0.8} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 534 135 C 522 122, 508 115, 492 112" strokeWidth={2.2} opacity={0.8} />
                <path strokeLinecap="round" strokeLinejoin="round" d="M 534 185 C 522 198, 508 205, 492 208" strokeWidth={2.2} opacity={0.8} />
              </svg>
            )}
          </div>
          )}

          {/* PINES CIRCULARES ROJOS NUMERADOS */}
          {hallazgos
            .filter((h) => h.vista === vistaActiva)
            .map((h) => {
              const esActivo = h.id === pinSeleccionadoId;
              return (
                <div
                  key={h.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinSeleccionadoId(h.id);
                    setTipoSeleccionado(h.tipo || "Rayón");
                    setObservacionTexto(h.descripcion || "");
                    setPopoverAbierto(true);
                  }}
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white shadow-xl border-2 transition-all cursor-pointer z-20 ${
                    esActivo
                      ? "bg-rose-500 border-white ring-4 ring-rose-500/50 scale-125 animate-pulse"
                      : "bg-rose-600 hover:bg-rose-500 border-white/90 ring-2 ring-rose-500/30 hover:scale-110"
                  }`}
                  title={`Pin #${h.pinNumber || 1}: ${h.tipo}`}
                >
                  {h.pinNumber || "!"}
                </div>
              );
            })}
        </div>

        {/* POPOVER MINIMALISTA DEL PIN ACTIVO */}
        {popoverAbierto && pinActual && (
          <div className="mt-3 p-4 rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-2xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                  {pinActual.pinNumber || 1}
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Detalle del Daño (Pin #{pinActual.pinNumber || 1})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleEliminarPin(pinActual.id, e)}
                  className="px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium cursor-pointer"
                >
                  Eliminar Pin ✕
                </button>
                <button
                  type="button"
                  onClick={() => setPopoverAbierto(false)}
                  className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded bg-white/5"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Chips de 1 toque */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-zinc-400 font-medium block">
                Tipo de daño (1 toque):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHIPS_HALLAZGO.map((chip) => {
                  const sel = (pinActual.tipo || tipoSeleccionado) === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => {
                        setTipoSeleccionado(chip.id);
                        handleGuardarDetallePin(chip.id);
                      }}
                      className={`h-9 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                        sel
                          ? `${chip.color} ring-1 ring-white/30 font-bold shadow-md`
                          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observación + Foto R2 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
              <div className="sm:col-span-8">
                <input
                  type="text"
                  value={observacionTexto || pinActual.descripcion || ""}
                  onChange={(e) => {
                    setObservacionTexto(e.target.value);
                    handleGuardarDetallePin(pinActual.tipo, e.target.value);
                  }}
                  placeholder="Observación opcional (ej: 5 cm aprox)..."
                  className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <label className="flex-1 h-10 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                  <span>{subiendoFotoPin ? "Subiendo..." : "Foto R2"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleSubirFotoPinR2(e, pinActual.id)}
                    className="hidden"
                  />
                </label>

                {pinActual.photoUrl && (
                  <a
                    href={pinActual.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 w-10 rounded-xl overflow-hidden border border-white/20 shrink-0 relative"
                    title={`Capturado: ${pinActual.capturedAt || "Ahora"}`}
                  >
                    <img src={pinActual.photoUrl} alt="Evidencia R2" className="w-full h-full object-cover" />
                  </a>
                )}
              </div>
            </div>

            {pinActual.capturedAt && (
              <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-1.5 pt-0.5">
                <span>⏱ Foto R2 con fecha y hora:</span>
                <strong>{pinActual.capturedAt}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : (
    /* SISTEMAS MECÁNICOS Y ELÉCTRICOS (Motor, Frenos, Suspensión, Eléctrico) */
    <div className="p-4 sm:p-5 rounded-2xl bg-[#09090b] border border-white/10 space-y-4 animate-fade-in">
      {(() => {
        const sistemaActual = SISTEMAS_INSPECCION.find((s) => s.id === seccionActiva);
        if (!sistemaActual || !sistemaActual.items) return null;

        const total = sistemaActual.items.length;
        const evaluados = sistemaActual.items.filter((it) => evaluacionesPlantilla[it.id] !== undefined).length;
        const pct = total > 0 ? Math.round((evaluados / total) * 100) : 0;
        const malosCount = sistemaActual.items.filter((it) => evaluacionesPlantilla[it.id] === "MALO").length;

        return (
          <>
            {/* Cabecera del sistema */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="text-base">{sistemaActual.icon}</span>
                  <span>{sistemaActual.name}</span>
                  {malosCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold">
                      {malosCount} {malosCount === 1 ? "falla detectada" : "fallas detectadas"}
                    </span>
                  )}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-28 sm:w-36 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-zinc-300 text-xs">{evaluados}/{total} ({pct}%)</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleMarcarTodosBueno(sistemaActual.items!)}
                  className="h-8 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Todo Bueno</span>
                </button>
              </div>
            </div>

            {/* Cabecera del Lienzo Mecánico con Switch 3D Holograma vs CAD 2D */}
            <div className="flex items-center justify-between gap-2 pt-1 pb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {modoVisual === "3d" ? `${sistemaActual.name} 3D Holográfico` : "Plano Vectorial CAD 2D"}
                </span>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">• Toca para marcar hallazgo</span>
              </div>

              <div className="flex items-center bg-black/70 p-1 rounded-xl border border-white/10 gap-1">
                <button
                  type="button"
                  onClick={() => setModoVisual("3d")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    modoVisual === "3d"
                      ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/20"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>✨ 3D Holograma</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoVisual("2d")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    modoVisual === "2d"
                      ? "bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-500/20"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>📐 CAD 2D</span>
                </button>
              </div>
            </div>

            {/* LIENZO VECTORIAL / 3D INTERACTIVO DEL SISTEMA (Tocar para marcar pines) */}
            <div
              onClick={handleTocarLienzo}
              className={`relative w-full h-72 sm:h-96 rounded-xl flex items-center justify-center cursor-crosshair overflow-hidden group transition-all ${
                modoVisual === "3d"
                  ? "bg-black border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]"
                  : "bg-white/[0.02] border border-white/5"
              }`}
            >
              {modoVisual === "3d" ? (
                <div className="relative w-full h-full flex items-center justify-center pointer-events-none p-2 sm:p-4">
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
                    className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(6,182,212,0.35)] select-none"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-3 pointer-events-none">
                {/* 1. PLANO VANO MOTOR Y COMPONENTES (CAD Blueprint Hiperdetallado en Gris/Plomo) */}
                {seccionActiva === "motor" && (
                  <svg className="w-full h-full max-h-72 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 280" fill="none" stroke="currentColor" strokeWidth={1.7}>
                    {/* Estructura del vano motor y cortafuegos perimetral */}
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M 45 20 L 555 20 L 535 265 L 65 265 Z" opacity={0.35} />

                    {/* Cerradura frontal del capó */}
                    <rect x="288" y="16" width="24" height="12" rx="3" strokeWidth={1.4} opacity={0.7} />
                    <circle cx="300" cy="22" r="2.5" fill="currentColor" opacity={0.8} />

                    {/* Torretas de amortiguación (Copelas con 3 pernos y vástago central) */}
                    <circle cx="95" cy="125" r="30" strokeWidth={1.8} opacity={0.6} />
                    <circle cx="95" cy="125" r="16" strokeWidth={1.3} opacity={0.5} />
                    <circle cx="95" cy="125" r="5" fill="currentColor" opacity={0.7} />
                    <circle cx="95" cy="100" r="3.2" fill="currentColor" opacity={0.85} />
                    <circle cx="75" cy="138" r="3.2" fill="currentColor" opacity={0.85} />
                    <circle cx="115" cy="138" r="3.2" fill="currentColor" opacity={0.85} />
                    {/* Nervios estructurales de aleta izquierda */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 55 50 L 78 78 M 55 180 L 78 160" strokeWidth={1.2} opacity={0.4} />

                    <circle cx="505" cy="125" r="30" strokeWidth={1.8} opacity={0.6} />
                    <circle cx="505" cy="125" r="16" strokeWidth={1.3} opacity={0.5} />
                    <circle cx="505" cy="125" r="5" fill="currentColor" opacity={0.7} />
                    <circle cx="505" cy="100" r="3.2" fill="currentColor" opacity={0.85} />
                    <circle cx="485" cy="138" r="3.2" fill="currentColor" opacity={0.85} />
                    <circle cx="525" cy="138" r="3.2" fill="currentColor" opacity={0.85} />
                    {/* Nervios estructurales de aleta derecha */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 545 50 L 522 78 M 545 180 L 522 160" strokeWidth={1.2} opacity={0.4} />

                    {/* Depósito limpiaparabrisas con tapón */}
                    <rect x="70" y="32" width="34" height="28" rx="6" strokeWidth={1.4} opacity={0.7} />
                    <circle cx="87" cy="32" r="5" strokeWidth={1.2} />

                    {/* Barra frontal y Radiador de aluminio con panel de celdas */}
                    <rect x="135" y="26" width="330" height="10" rx="3" strokeWidth={1.4} opacity={0.5} />
                    <rect x="145" y="36" width="310" height="28" rx="4" strokeWidth={2} />
                    <line x1="160" y1="42" x2="440" y2="42" strokeWidth={0.9} strokeDasharray="4 2" opacity="0.45" />
                    <line x1="160" y1="50" x2="440" y2="50" strokeWidth={0.9} strokeDasharray="4 2" opacity="0.45" />
                    <line x1="160" y1="58" x2="440" y2="58" strokeWidth={0.9} strokeDasharray="4 2" opacity="0.45" />

                    {/* Tapón presurizado de radiador con aletas laterales */}
                    <circle cx="168" cy="36" r="6" strokeWidth={1.6} />
                    <path strokeLinecap="round" d="M 160 36 L 176 36" strokeWidth={1.4} />

                    {/* Doble electroventilador con aspas aerodinámicas y motores */}
                    <circle cx="230" cy="48" r="12" strokeWidth={1.4} />
                    <circle cx="230" cy="48" r="4" fill="currentColor" opacity={0.6} />
                    <path strokeLinecap="round" strokeWidth={1} d="M 230 38 L 230 58 M 221 43 L 239 53 M 221 53 L 239 43" opacity={0.7} />

                    <circle cx="370" cy="48" r="12" strokeWidth={1.4} />
                    <circle cx="370" cy="48" r="4" fill="currentColor" opacity={0.6} />
                    <path strokeLinecap="round" strokeWidth={1} d="M 370 38 L 370 58 M 361 43 L 379 53 M 361 53 L 379 43" opacity={0.7} />

                    {/* Manguera superior de refrigerante con abrazaderas metálicas */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 205 64 C 205 84, 226 90, 246 98" strokeWidth={3} opacity={0.85} />
                    <rect x="201" y="66" width="8" height="4" rx="1" opacity={0.7} />
                    <rect x="241" y="94" width="8" height="4" rx="1" opacity={0.7} />

                    {/* BLOQUE MOTOR DOHC 16V (Tapa de válvulas nervada en plomo/gris) */}
                    <rect x="195" y="98" width="210" height="118" rx="14" strokeWidth={2.4} />
                    {/* Pernos de apriete perimetral de culata */}
                    <circle cx="206" cy="108" r="2.5" fill="currentColor" opacity={0.6} />
                    <circle cx="300" cy="105" r="2.5" fill="currentColor" opacity={0.6} />
                    <circle cx="394" cy="108" r="2.5" fill="currentColor" opacity={0.6} />
                    <circle cx="206" cy="206" r="2.5" fill="currentColor" opacity={0.6} />
                    <circle cx="300" cy="209" r="2.5" fill="currentColor" opacity={0.6} />
                    <circle cx="394" cy="206" r="2.5" fill="currentColor" opacity={0.6} />

                    {/* Franja central de bujías / bobinas */}
                    <rect x="216" y="134" width="168" height="46" rx="6" strokeWidth={1.3} opacity={0.6} />

                    {/* 4 Bobinas de encendido directas (Coil-on-Plug) con arnés */}
                    <rect x="228" y="140" width="24" height="32" rx="4" strokeWidth={1.5} />
                    <circle cx="240" cy="156" r="3" fill="currentColor" opacity={0.7} />
                    <rect x="272" y="140" width="24" height="32" rx="4" strokeWidth={1.5} />
                    <circle cx="284" cy="156" r="3" fill="currentColor" opacity={0.7} />
                    <rect x="316" y="140" width="24" height="32" rx="4" strokeWidth={1.5} />
                    <circle cx="328" cy="156" r="3" fill="currentColor" opacity={0.7} />
                    <rect x="360" y="140" width="24" height="32" rx="4" strokeWidth={1.5} />
                    <circle cx="372" cy="156" r="3" fill="currentColor" opacity={0.7} />
                    {/* Arnés conductor de cables de encendido */}
                    <line x1="222" y1="174" x2="388" y2="174" strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />

                    {/* Tapón de llenado de aceite grabado */}
                    <circle cx="240" cy="118" r="10" strokeWidth={1.8} />
                    <path strokeLinecap="round" d="M 235 118 L 245 118 M 240 113 L 240 123" strokeWidth={1.6} />

                    {/* Varilla medidora de nivel de aceite con tirador circular */}
                    <circle cx="418" cy="110" r="7" strokeWidth={1.8} />
                    <circle cx="418" cy="110" r="3.5" strokeWidth={1.2} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 414 116 L 398 144" strokeWidth={2.2} />

                    {/* Riel de inyectores de combustible */}
                    <line x1="220" y1="123" x2="380" y2="123" strokeWidth={1.8} opacity={0.65} />
                    <rect x="236" y="120" width="8" height="6" rx="1" opacity={0.8} />
                    <rect x="280" y="120" width="8" height="6" rx="1" opacity={0.8} />
                    <rect x="324" y="120" width="8" height="6" rx="1" opacity={0.8} />
                    <rect x="368" y="120" width="8" height="6" rx="1" opacity={0.8} />

                    {/* Múltiple de admisión de 4 colectores afinados */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 235 98 C 235 78, 248 74, 255 98" strokeWidth={2} opacity={0.85} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 275 98 C 275 78, 288 74, 295 98" strokeWidth={2} opacity={0.85} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 315 98 C 315 78, 328 74, 335 98" strokeWidth={2} opacity={0.85} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 355 98 C 355 78, 368 74, 375 98" strokeWidth={2} opacity={0.85} />

                    {/* Filtro de aire sellado y tobera de admisión (Izquierda) */}
                    <rect x="70" y="100" width="95" height="68" rx="8" strokeWidth={1.8} />
                    {/* Pliegues del panel filtrante */}
                    <line x1="80" y1="112" x2="155" y2="112" strokeWidth={1} opacity={0.35} />
                    <line x1="80" y1="124" x2="155" y2="124" strokeWidth={1} opacity={0.35} />
                    <line x1="80" y1="136" x2="155" y2="136" strokeWidth={1} opacity={0.35} />
                    <line x1="80" y1="148" x2="155" y2="148" strokeWidth={1} opacity={0.35} />
                    <line x1="80" y1="160" x2="155" y2="160" strokeWidth={1} opacity={0.35} />
                    {/* Presillas de apertura rápida */}
                    <rect x="67" y="112" width="4" height="8" rx="1" opacity={0.8} />
                    <rect x="67" y="148" width="4" height="8" rx="1" opacity={0.8} />
                    <rect x="164" y="112" width="4" height="8" rx="1" opacity={0.8} />
                    <rect x="164" y="148" width="4" height="8" rx="1" opacity={0.8} />
                    {/* Ducto de entrada frontal */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 90 100 L 90 70 L 115 70 L 115 100" strokeWidth={1.4} opacity={0.7} />
                    {/* Sensor MAF y manguito flexible hacia acelerador */}
                    <rect x="160" y="127" width="12" height="18" rx="2" strokeWidth={1.2} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 165 136 C 185 136, 192 112, 202 104" strokeWidth={3.2} />
                    <line x1="174" y1="129" x2="174" y2="141" strokeWidth={1.2} opacity={0.5} />
                    <line x1="182" y1="124" x2="182" y2="136" strokeWidth={1.2} opacity={0.5} />

                    {/* Alternador y correa serpentina de accesorios (Derecha) */}
                    <circle cx="430" cy="166" r="22" strokeWidth={2} />
                    <circle cx="430" cy="166" r="9" strokeWidth={1.5} />
                    {/* Ranuras de ventilación del alternador */}
                    <line x1="430" y1="148" x2="430" y2="153" strokeWidth={1.2} opacity={0.6} />
                    <line x1="430" y1="179" x2="430" y2="184" strokeWidth={1.2} opacity={0.6} />
                    <line x1="412" y1="166" x2="417" y2="166" strokeWidth={1.2} opacity={0.6} />
                    <line x1="443" y1="166" x2="448" y2="166" strokeWidth={1.2} opacity={0.6} />
                    {/* Polea tensora */}
                    <circle cx="410" cy="214" r="16" strokeWidth={1.8} />
                    {/* Correa serpentina acanalada */}
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 395 166 L 426 142 C 452 145, 458 178, 438 196 L 420 228 C 395 228, 395 196, 395 166 Z" strokeWidth={2} strokeDasharray="5 2" opacity="0.85" />

                    {/* Batería principal de 12V con terminales (+ / -) */}
                    <rect x="455" y="38" width="85" height="58" rx="6" strokeWidth={1.8} />
                    {/* Soporte transversal de fijación de batería */}
                    <line x1="452" y1="67" x2="543" y2="67" strokeWidth={2} opacity={0.7} />
                    <circle cx="497" cy="67" r="3" fill="currentColor" opacity={0.8} />
                    {/* Borne Positivo (+) */}
                    <rect x="466" y="44" width="16" height="12" rx="2" strokeWidth={1.3} />
                    <line x1="474" y1="47" x2="474" y2="53" strokeWidth={1.5} />
                    <line x1="471" y1="50" x2="477" y2="50" strokeWidth={1.5} />
                    {/* Borne Negativo (-) */}
                    <rect x="515" y="44" width="16" height="12" rx="2" strokeWidth={1.3} />
                    <line x1="520" y1="50" x2="526" y2="50" strokeWidth={1.5} />

                    {/* Depósito de expansión de refrigerante */}
                    <rect x="455" y="115" width="55" height="45" rx="8" strokeWidth={1.6} />
                    <circle cx="482" cy="115" r="6" strokeWidth={1.4} />
                    <line x1="465" y1="135" x2="500" y2="135" strokeWidth={1.2} strokeDasharray="3 2" opacity="0.5" />
                    <line x1="465" y1="145" x2="500" y2="145" strokeWidth={1.2} strokeDasharray="3 2" opacity="0.5" />

                    {/* Caja de fusibles y relés del compartimiento motor */}
                    <rect x="458" y="172" width="68" height="52" rx="7" strokeWidth={1.8} />
                    <rect x="486" y="167" width="12" height="6" rx="1.5" opacity={0.8} />
                    <rect x="468" y="180" width="10" height="14" rx="2" strokeWidth={1} opacity={0.5} />
                    <rect x="484" y="180" width="10" height="14" rx="2" strokeWidth={1} opacity={0.5} />
                    <rect x="500" y="180" width="16" height="16" rx="2" strokeWidth={1} opacity={0.6} />

                    {/* Servofreno circular y bomba de freno con depósito */}
                    <circle cx="118" cy="192" r="22" strokeWidth={1.8} opacity={0.8} />
                    <rect x="134" y="184" width="38" height="16" rx="3" strokeWidth={1.5} />
                    <circle cx="145" cy="184" r="4" strokeWidth={1.2} />
                    <circle cx="162" cy="184" r="4" strokeWidth={1.2} />

                    {/* Soportes de motor (Patas de apoyo hidráulico con tornillo pasante) */}
                    <rect x="170" y="150" width="24" height="24" rx="5" strokeWidth={1.6} opacity={0.7} />
                    <circle cx="182" cy="162" r="4" fill="currentColor" opacity={0.6} />
                    <rect x="405" y="130" width="22" height="22" rx="5" strokeWidth={1.6} opacity={0.7} />
                    <circle cx="416" cy="141" r="4" fill="currentColor" opacity={0.6} />

                    {/* Rejilla vierteaguas en cortafuegos */}
                    <line x1="80" y1="245" x2="520" y2="245" strokeWidth={1.5} opacity={0.4} />
                    <line x1="160" y1="255" x2="440" y2="255" strokeWidth={1.2} strokeDasharray="5 4" opacity={0.3} />
                  </svg>
                )}

                {/* 2. PLANO SISTEMA DE FRENOS */}
                {seccionActiva === "frenos" && (
                  <svg className="w-full h-full max-h-60 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 240" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <circle cx="250" cy="120" r="95" strokeWidth={2} />
                    <circle cx="250" cy="120" r="82" strokeWidth={1.2} opacity={0.6} />
                    <circle cx="250" cy="120" r="44" strokeWidth={1.6} />
                    <circle cx="250" cy="120" r="18" strokeWidth={1.4} />
                    <circle cx="250" cy="90" r="5" strokeWidth={1.4} />
                    <circle cx="278" cy="105" r="5" strokeWidth={1.4} />
                    <circle cx="268" cy="138" r="5" strokeWidth={1.4} />
                    <circle cx="232" cy="138" r="5" strokeWidth={1.4} />
                    <circle cx="222" cy="105" r="5" strokeWidth={1.4} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M 160 55 C 190 40, 260 40, 305 52 C 320 58, 322 72, 315 85 C 305 105, 275 118, 240 120 C 200 120, 175 105, 162 90 C 152 76, 150 62, 160 55 Z" />
                    <rect x="195" y="65" width="65" height="16" rx="3" strokeWidth={1.4} />
                    <circle cx="215" cy="73" r="8" strokeWidth={1.2} />
                    <circle cx="245" cy="73" r="8" strokeWidth={1.2} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 178 55 C 150 50, 120 70, 95 105 C 75 130, 60 160, 45 180" strokeWidth={2.4} opacity={0.8} />
                    <circle cx="465" cy="90" r="32" strokeWidth={1.8} />
                    <rect x="395" y="82" width="45" height="16" rx="3" strokeWidth={1.5} />
                    <rect x="405" y="58" width="30" height="24" rx="4" strokeWidth={1.5} />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 497 90 L 530 90 L 530 165 L 518 165" strokeWidth={2} />
                  </svg>
                )}

                {/* 3. PLANO SUSPENSIÓN Y DIRECCIÓN */}
                {seccionActiva === "suspension" && (
                  <svg className="w-full h-full max-h-60 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 240" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <rect x="155" y="28" width="50" height="14" rx="4" strokeWidth={1.8} />
                    <rect x="175" y="42" width="10" height="35" strokeWidth={1.2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M 155 78 C 210 68, 210 90, 155 96 C 210 88, 210 110, 155 116 C 210 108, 210 130, 155 136 C 210 128, 210 150, 155 156 L 205 156" />
                    <rect x="170" y="156" width="20" height="52" rx="3" strokeWidth={1.8} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M 165 190 L 130 195 L 120 220 L 175 222 Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M 175 222 L 250 228 L 250 236 L 165 230 Z" />
                    <circle cx="170" cy="226" r="6" strokeWidth={1.4} />
                    <circle cx="250" cy="232" r="7" strokeWidth={1.4} />
                    <rect x="260" y="130" width="190" height="18" rx="4" strokeWidth={1.8} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M 235 139 L 155 165 L 150 185" />
                    <line x1="200" y1="140" x2="220" y2="195" strokeWidth={2.4} />
                    <rect x="350" y="90" width="12" height="40" rx="3" strokeWidth={1.4} />
                    <circle cx="356" cy="70" r="16" strokeWidth={1.6} />
                  </svg>
                )}

                {/* 4. PLANO SISTEMA ELÉCTRICO */}
                {seccionActiva === "electrico" && (
                  <svg className="w-full h-full max-h-60 text-zinc-400 group-hover:text-cyan-400 transition-colors" viewBox="0 0 600 240" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <rect x="70" y="65" width="130" height="95" rx="8" strokeWidth={2} />
                    <rect x="88" y="50" width="22" height="15" rx="3" strokeWidth={1.4} />
                    <rect x="160" y="50" width="22" height="15" rx="3" strokeWidth={1.4} />
                    <rect x="95" y="95" width="80" height="30" rx="4" strokeWidth={1.4} />
                    <text x="135" y="115" textAnchor="middle" fill="currentColor" fontSize="12" fontFamily="monospace" fontWeight="bold">12.6V</text>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M 99 50 C 99 35, 230 35, 270 65 L 270 120" strokeWidth={3} opacity={0.9} />
                    <circle cx="270" cy="155" r="38" strokeWidth={2} />
                    <circle cx="270" cy="155" r="16" strokeWidth={1.6} />
                    <rect x="350" y="130" width="75" height="42" rx="8" strokeWidth={1.8} />
                    <rect x="350" y="35" width="115" height="60" rx="8" strokeWidth={1.8} />
                    <rect x="490" y="55" width="75" height="90" rx="7" strokeWidth={1.8} />
                  </svg>
                )}
              </div>
              )}

              {/* PINES CIRCULARES NUMERADOS EN EL SISTEMA MECÁNICO */}
              {hallazgos
                .filter((h) => h.vista === seccionActiva)
                .map((h) => {
                  const esActivo = h.id === pinSeleccionadoId;
                  return (
                    <div
                      key={h.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPinSeleccionadoId(h.id);
                        setTipoSeleccionado(h.tipo || "Fuga");
                        setObservacionTexto(h.descripcion || "");
                        setPopoverAbierto(true);
                      }}
                      style={{ left: `${h.x}%`, top: `${h.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white shadow-xl border-2 transition-all cursor-pointer z-20 ${
                        esActivo
                          ? "bg-rose-500 border-white ring-4 ring-rose-500/50 scale-125 animate-pulse"
                          : "bg-rose-600 hover:bg-rose-500 border-white/90 ring-2 ring-rose-500/30 hover:scale-110"
                      }`}
                      title={`Pin #${h.pinNumber || 1}: ${h.tipo}`}
                    >
                      {h.pinNumber || "!"}
                    </div>
                  );
                })}
            </div>

            {/* POPOVER PARA PINES DEL SISTEMA MECÁNICO */}
            {popoverAbierto && pinActual && pinActual.vista === seccionActiva && (
              <div className="p-4 rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-2xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                      {pinActual.pinNumber || 1}
                    </span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Detalle del Hallazgo en {sistemaActual.name} (Pin #{pinActual.pinNumber || 1})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleEliminarPin(pinActual.id, e)}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium cursor-pointer"
                    >
                      Eliminar Pin ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => setPopoverAbierto(false)}
                      className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded bg-white/5"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                {/* Chips de 1 toque */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-zinc-400 font-medium block">
                    Tipo de hallazgo / anomalía (1 toque):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {CHIPS_HALLAZGO_MECANICO.map((chip) => {
                      const sel = (pinActual.tipo || tipoSeleccionado) === chip.id;
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => {
                            setTipoSeleccionado(chip.id);
                            handleGuardarDetallePin(chip.id);
                          }}
                          className={`h-9 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                            sel
                              ? `${chip.color} ring-1 ring-white/30 font-bold shadow-md`
                              : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <span>{chip.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Observación + Foto R2 */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
                  <div className="sm:col-span-8">
                    <input
                      type="text"
                      value={observacionTexto || pinActual.descripcion || ""}
                      onChange={(e) => {
                        setObservacionTexto(e.target.value);
                        handleGuardarDetallePin(pinActual.tipo, e.target.value);
                      }}
                      placeholder="Observación técnica (ej: fuga activa por junta de tapa o manguera rota)..."
                      className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div className="sm:col-span-4 flex items-center gap-2">
                    <label className="flex-1 h-10 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                      </svg>
                      <span>{subiendoFotoPin ? "Subiendo..." : "Foto R2"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleSubirFotoPinR2(e, pinActual.id)}
                        className="hidden"
                      />
                    </label>

                    {pinActual.photoUrl && (
                      <a
                        href={pinActual.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-10 w-10 rounded-xl overflow-hidden border border-white/20 shrink-0 relative"
                        title={`Capturado: ${pinActual.capturedAt || "Ahora"}`}
                      >
                        <img src={pinActual.photoUrl} alt="Evidencia R2" className="w-full h-full object-cover" />
                      </a>
                    )}
                  </div>
                </div>

                {pinActual.capturedAt && (
                  <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-1.5 pt-0.5">
                    <span>⏱ Foto R2 con fecha y hora:</span>
                    <strong>{pinActual.capturedAt}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Lista de Ítems del Sistema */}
            <div className="divide-y divide-white/5">
              {sistemaActual.items.map((item) => {
                const val = evaluacionesPlantilla[item.id];
                const notaKey = `${item.id}_nota`;
                const notaVal = evaluacionesPlantilla[notaKey] || "";

                return (
                  <div key={item.id} className="py-3.5 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <span className="text-xs font-medium text-zinc-200">{item.label}</span>

                      {/* 1-touch Semáforo: BUENO, REGULAR, MALO */}
                      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 shrink-0 self-start sm:self-center">
                        {[
                          { id: "BUENO", label: "Bueno", color: "bg-emerald-500/25 border-emerald-500/50 text-emerald-300" },
                          { id: "REGULAR", label: "Regular", color: "bg-amber-500/25 border-amber-500/50 text-amber-300" },
                          { id: "MALO", label: "Malo", color: "bg-rose-500/25 border-rose-500/50 text-rose-300" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleEvaluarItem(item.id, opt.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              val === opt.id
                                ? `${opt.color} shadow-sm font-semibold scale-105`
                                : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Si es Regular o Malo, campo de detalle/observación */}
                    {(val === "REGULAR" || val === "MALO" || notaVal) && (
                      <div className="pl-1 flex items-center gap-2">
                        <span className="text-[11px] text-zinc-500">Detalle:</span>
                        <input
                          type="text"
                          value={notaVal}
                          onChange={(e) => {
                            const nuevo = { ...evaluacionesPlantilla, [notaKey]: e.target.value };
                            setEvaluacionesPlantilla(nuevo);
                            sincronizarHallazgosNeon(hallazgos, firmaRecepcionUrl, nuevo, seccionActiva);
                          }}
                          placeholder={
                            val === "MALO"
                              ? "Describir falla detectada (ej: requiere cambio urgente)..."
                              : "Observación preventiva (ej: desgaste moderado)..."
                          }
                          className="flex-1 h-8 px-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4"
          >
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Reporte Oficial de Inspección Vehicular
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalPdfAbierto(false)}
                className="text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 cursor-pointer text-xs"
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
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
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

                        {h.photoUrl && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-zinc-500">
                              ⏱ {h.capturedAt || "Capturado"}
                            </span>
                            <img
                              src={h.photoUrl}
                              alt="Evidencia R2"
                              className="w-12 h-12 object-cover rounded border border-zinc-300"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resultados de la Inspección de Sistemas (Motor, Frenos, Suspensión, Eléctrico) */}
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

              {/* Conformidad y Firma del Cliente */}
              <div className="pt-4 border-t-2 border-zinc-900 flex items-end justify-between">
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

                <div className="text-right text-[10px] text-zinc-500 font-mono">
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
                <span>💬 Enviar por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="h-10 px-6 rounded-xl bg-purple-500 hover:bg-purple-400 text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95"
              >
                <span>🖨️ Imprimir / Guardar PDF</span>
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
