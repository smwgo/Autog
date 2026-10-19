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


        <div
          onClick={handleTocarLienzo}
          className="relative w-full h-72 sm:h-96 rounded-xl bg-black border border-cyan-500/30 flex items-center justify-center cursor-crosshair overflow-hidden group transition-all shadow-[0_0_35px_rgba(6,182,212,0.12)]"
        >
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

            {/* LIENZO 3D INTERACTIVO DEL SISTEMA (Tocar para marcar pines) */}
            <div
              onClick={handleTocarLienzo}
              className="relative w-full h-72 sm:h-96 rounded-xl bg-black border border-cyan-500/30 flex items-center justify-center cursor-crosshair overflow-hidden group transition-all shadow-[0_0_35px_rgba(6,182,212,0.12)]"
            >
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
