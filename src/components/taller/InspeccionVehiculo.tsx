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

export const PLANTILLAS_INSPECCION: InspectionTemplate[] = [
  {
    id: "general",
    name: "Recepción General",
    icon: "📋",
    description: "Inspección integral de ingreso al taller",
    items: [
      { id: "gen_luces", label: "Luces principales, altas y direccionales", modo: "semaforo" },
      { id: "gen_neumaticos", label: "Presión y desgaste parejo de neumáticos", modo: "semaforo" },
      { id: "gen_fluidos", label: "Nivel de fluidos (aceite, frenos, refrigerante)", modo: "cumplimiento" },
      { id: "gen_parabrisas", label: "Parabrisas y cristales sin fisuras", modo: "binario" },
      { id: "gen_freno_mano", label: "Tensión y anclaje de freno de mano", modo: "cumplimiento" },
      { id: "gen_bateria", label: "Voltaje y estado de bornes de batería", modo: "puntaje" },
      { id: "gen_habitaculo", label: "Limpieza y estado interior del habitáculo", modo: "puntaje" },
    ],
  },
  {
    id: "frenos",
    name: "Frenos",
    icon: "🛑",
    description: "Evaluación de pastillas, discos y sistema hidráulico",
    items: [
      { id: "frn_pastillas_del", label: "Espesor de pastillas de freno delanteras", modo: "semaforo" },
      { id: "frn_pastillas_tras", label: "Espesor de pastillas / balatas traseras", modo: "semaforo" },
      { id: "frn_discos", label: "Discos de freno sin ceja pronunciada", modo: "cumplimiento" },
      { id: "frn_liquido", label: "Punto de ebullición / nivel de líquido de frenos", modo: "semaforo" },
      { id: "frn_fugas", label: "Fugas en mangueras o cañerías hidráulicas", modo: "binario" },
      { id: "frn_pedal", label: "Tacto y firmeza del pedal de freno", modo: "puntaje" },
    ],
  },
  {
    id: "suspension",
    name: "Suspensión",
    icon: "🔩",
    description: "Amortiguadores, rótulas, bujes y terminales",
    items: [
      { id: "susp_amort_del", label: "Amortiguadores delanteros sin fugas de aceite", modo: "semaforo" },
      { id: "susp_amort_tras", label: "Amortiguadores traseros y rebote", modo: "semaforo" },
      { id: "susp_rotulas", label: "Rótulas de suspensión y terminales de dirección", modo: "cumplimiento" },
      { id: "susp_bujes", label: "Bujes de tijetas / bandejas sin holguras", modo: "semaforo" },
      { id: "susp_alineacion", label: "Desgaste parejo en banda de rodado", modo: "binario" },
      { id: "susp_estabilidad", label: "Estabilidad y respuesta de amortiguación", modo: "puntaje" },
    ],
  },
  {
    id: "lubricacion",
    name: "Lubricación",
    icon: "🛢️",
    description: "Fluidos de motor, caja y filtros de aire/aceite",
    items: [
      { id: "lub_aceite_motor", label: "Nivel, color y viscosidad de aceite motor", modo: "semaforo" },
      { id: "lub_filtro_aceite", label: "Filtro de aceite bien sellado y sin fugas", modo: "cumplimiento" },
      { id: "lub_filtro_aire", label: "Estado y saturación de filtro de aire motor", modo: "semaforo" },
      { id: "lub_filtro_cabina", label: "Filtro de polen / cabina A/C", modo: "semaforo" },
      { id: "lub_refrigerante", label: "Nivel y concentración de líquido refrigerante", modo: "cumplimiento" },
      { id: "lub_fugas_carter", label: "Fugas en cárter o tapón de drenaje", modo: "binario" },
      { id: "lub_engrase", label: "Engrase general de rótulas y articulaciones", modo: "puntaje" },
    ],
  },
];

const CHIPS_HALLAZGO = [
  { id: "Rayón", label: "Rayón", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { id: "Golpe", label: "Golpe", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  { id: "Abolladura", label: "Abolladura", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { id: "Fisura", label: "Fisura", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
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

  // Estados para Plantillas de Inspección Dinámicas
  const [plantillaActivaId, setPlantillaActivaId] = useState<string>("general");
  const [evaluacionesPlantilla, setEvaluacionesPlantilla] = useState<Record<string, any>>({});

  // Modal de PDF y Envío WhatsApp de Inspección
  const [modalPdfAbierto, setModalPdfAbierto] = useState(false);

  // Acordeón y Firma rápida de recepción
  const [mostrarFirmaRecepcion, setMostrarFirmaRecepcion] = useState(false);
  const [firmaRecepcionUrl, setFirmaRecepcionUrl] = useState<string | null>(
    ordenActiva?.receptionSignatureUrl || null
  );
  const canvasRecepcionRef = useRef<HTMLCanvasElement | null>(null);
  const dibujandoRef = useRef(false);
  const tieneTrazosRef = useRef(false);

  // Sincronizar hallazgos locales cuando la orden activa cambie
  useEffect(() => {
    if (ordenActiva?.inspectionFindings) {
      setHallazgos(ordenActiva.inspectionFindings);
    }
    if (ordenActiva?.receptionSignatureUrl) {
      setFirmaRecepcionUrl(ordenActiva.receptionSignatureUrl);
    }
  }, [ordenActiva]);

  // Persistir hallazgos y evaluaciones en Neon DB
  const sincronizarHallazgosNeon = useCallback(
    async (
      nuevosHallazgos: InspectionFinding[],
      firmaUrl?: string | null,
      evals?: Record<string, any>,
      plantillaId?: string
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
          payload.inspectionTemplateId = plantillaId || plantillaActivaId;
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
    [ordenActiva, onUpdateOrden, plantillaActivaId]
  );

  // 1. ESQUEMA INTERACTIVO: DETECCIÓN DE TOQUE EN COORDENADAS PORCENTUALES Y PINES NUMERADOS
  const handleTocarLienzo = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(5, Math.min(95, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    const maxNum = hallazgos.reduce((max, h) => Math.max(max, h.pinNumber || 0), 0);
    const nuevoPinNumero = maxNum + 1;

    const nuevoHallazgo: InspectionFinding = {
      id: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vista: vistaActiva,
      vistaLabel:
        vistaActiva === "frontal"
          ? "Frontal"
          : vistaActiva === "trasera"
          ? "Trasera"
          : vistaActiva === "lateral_izq"
          ? "Lateral Izq"
          : vistaActiva === "lateral_der"
          ? "Lateral Der"
          : "Superior",
      x: xPct,
      y: yPct,
      zona: `Vista ${vistaActiva}`,
      tipo: "Rayón",
      descripcion: `Rayón en ${vistaActiva} #${nuevoPinNumero}`,
      pinNumber: nuevoPinNumero,
    };

    const actualizados = [...hallazgos, nuevoHallazgo];
    setHallazgos(actualizados);
    setPinSeleccionadoId(nuevoHallazgo.id);
    setTipoSeleccionado("Rayón");
    setObservacionTexto("");
    setPopoverAbierto(true);

    sincronizarHallazgosNeon(actualizados);
    mostrarToast(`Pin #${nuevoPinNumero} colocado. Selecciona el tipo de daño.`);
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

  // 3. PLANTILLAS DE INSPECCIÓN: EVALUACIÓN EN 1 TOQUE Y BARRA DE PROGRESO
  const plantillaSeleccionada = useMemo(() => {
    return (
      PLANTILLAS_INSPECCION.find((p) => p.id === plantillaActivaId) ||
      PLANTILLAS_INSPECCION[0]
    );
  }, [plantillaActivaId]);

  const itemsRespondidosCount = useMemo(() => {
    return plantillaSeleccionada.items.filter(
      (it) => evaluacionesPlantilla[it.id] !== undefined
    ).length;
  }, [plantillaSeleccionada, evaluacionesPlantilla]);

  const porcentajeProgresoPlantilla = useMemo(() => {
    if (plantillaSeleccionada.items.length === 0) return 0;
    return Math.round((itemsRespondidosCount / plantillaSeleccionada.items.length) * 100);
  }, [itemsRespondidosCount, plantillaSeleccionada]);

  const handleEvaluarItem = (itemId: string, valor: any) => {
    const nuevo = { ...evaluacionesPlantilla, [itemId]: valor };
    setEvaluacionesPlantilla(nuevo);
    sincronizarHallazgosNeon(hallazgos, firmaRecepcionUrl, nuevo, plantillaActivaId);
    mostrarToast("Evaluación guardada automáticamente.");
  };

  // 4. FIRMA RÁPIDA DE RECEPCIÓN (CONFORMIDAD DE RECEPCIÓN)
  const obtenerCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRecepcionRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const iniciarTrazo = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRecepcionRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = obtenerCoords(e);
    dibujandoRef.current = true;
    tieneTrazosRef.current = true;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moverTrazo = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!dibujandoRef.current) return;
    const canvas = canvasRecepcionRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = obtenerCoords(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const terminarTrazo = () => {
    dibujandoRef.current = false;
  };

  const limpiarFirma = () => {
    const canvas = canvasRecepcionRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    tieneTrazosRef.current = false;
    setFirmaRecepcionUrl(null);
  };

  const guardarFirmaRecepcion = async () => {
    const canvas = canvasRecepcionRef.current;
    if (!canvas || !tieneTrazosRef.current) {
      mostrarToast("Dibuja la firma antes de guardar la conformidad", "err");
      return;
    }
    const dataUrl = canvas.toDataURL("image/png");
    setFirmaRecepcionUrl(dataUrl);
    await sincronizarHallazgosNeon(hallazgos, dataUrl, evaluacionesPlantilla, plantillaActivaId);
    mostrarToast("✓ Firma de conformidad de recepción registrada correctamente");
  };

  // 5. ENVÍO DEL REPORTE POR WHATSAPP EN UN CLIC
  const handleEnviarReporteWhatsApp = () => {
    if (!ordenActiva) return;
    const tel = (ordenActiva.clientPhone || "").replace(/[^0-9]/g, "");
    const hallazgosTxt =
      hallazgos.length > 0
        ? hallazgos.map((h) => `#${h.pinNumber || 1} [${h.vistaLabel}] ${h.tipo}: ${h.descripcion || "Sin nota"}`).join("\n")
        : "Sin daños reportados.";

    const urlSeguimiento = `${typeof window !== "undefined" ? window.location.origin : ""}/taller/seguimiento?orden=${ordenActiva.orderNumber}&pin=${ordenActiva.trackingPin || "4821"}`;

    const msg = `🚗 *INFORME DE INSPECCIÓN VEHICULAR - TALLER AUTOG*
--------------------------------------------------
*Orden:* #${ordenActiva.orderNumber}
*Vehículo:* ${ordenActiva.vehicle} (${ordenActiva.plate})
*Cliente:* ${ordenActiva.client}
*Plantilla:* ${plantillaSeleccionada.name} (${porcentajeProgresoPlantilla}% evaluado)

📌 *Pines de Daños / Hallazgos Registrados:*
${hallazgosTxt}

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
          BARRA SUPERIOR: SELECTOR DE VISTAS + BOTÓN PDF DE INSPECCIÓN
          =================================================================== */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            Inspección de 5 Vistas y Plantillas Dinámicas
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
            {hallazgos.length} pin(es) • {porcentajeProgresoPlantilla}% evaluado
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* BOTÓN MINIMALISTA CON ICONO TRANSPARENTE: "PDF DE INSPECCIÓN" */}
          <button
            type="button"
            onClick={() => setModalPdfAbierto(true)}
            className="h-9 px-3.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span>PDF de Inspección</span>
          </button>
        </div>
      </div>

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

      {/* LIENZO/SVG LIMPIO DEL VEHÍCULO CON PINES NUMERADOS */}
      <div className="relative rounded-2xl bg-[#09090b] border border-white/10 p-3 sm:p-6 overflow-hidden select-none">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            Toca el vehículo para colocar un Pin correlativo (1, 2, 3...):
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            Vista activa: <strong className="text-zinc-300 uppercase">{vistaActiva}</strong>
          </span>
        </div>

        <div
          onClick={handleTocarLienzo}
          className="relative w-full h-64 sm:h-80 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center cursor-crosshair overflow-hidden group transition-all"
        >
          {/* Planos Vectoriales SVG Limpios */}
          <div className="w-full h-full flex items-center justify-center pointer-events-none p-4">
            {vistaActiva === "frontal" && (
              <svg className="w-full h-full max-h-72 text-zinc-600 group-hover:text-zinc-500 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M120 250 L100 230 L110 170 L170 120 L240 70 L360 70 L430 120 L490 170 L500 230 L480 250 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M185 125 L245 80 L355 80 L415 125 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M175 130 L150 190 L450 190 L425 130 Z" />
                <polygon strokeLinecap="round" strokeLinejoin="round" points="140,195 190,195 180,225 130,220" />
                <polygon strokeLinecap="round" strokeLinejoin="round" points="460,195 410,195 420,225 470,220" />
                <rect x="230" y="200" width="140" height="40" rx="6" strokeLinecap="round" />
                <line x1="240" y1="210" x2="360" y2="210" />
                <line x1="240" y1="220" x2="360" y2="220" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M100 250 Q300 280 500 250" />
                <rect x="70" y="140" width="35" height="20" rx="5" />
                <rect x="495" y="140" width="35" height="20" rx="5" />
              </svg>
            )}

            {vistaActiva === "trasera" && (
              <svg className="w-full h-full max-h-72 text-zinc-600 group-hover:text-zinc-500 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M120 250 L100 230 L115 170 L170 115 L240 68 L360 68 L430 115 L485 170 L500 230 L480 250 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M185 120 L245 78 L355 78 L415 120 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M175 130 L160 210 L440 210 L425 130 Z" />
                <polygon strokeLinecap="round" strokeLinejoin="round" points="135,190 190,190 185,225 130,225" />
                <polygon strokeLinecap="round" strokeLinejoin="round" points="465,190 410,190 415,225 470,225" />
                <rect x="250" y="205" width="100" height="30" rx="4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M100 250 Q300 275 500 250" />
                <ellipse cx="440" cy="270" rx="10" ry="6" />
              </svg>
            )}

            {vistaActiva === "lateral_izq" && (
              <svg className="w-full h-full max-h-72 text-zinc-600 group-hover:text-zinc-500 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M50 220 L70 170 L140 160 L210 95 L390 95 L460 155 L550 165 L560 220 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M215 105 L310 105 L310 150 L165 150 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M320 105 L390 105 L445 150 L320 150 Z" />
                <line x1="315" y1="105" x2="315" y2="220" />
                <circle cx="140" cy="220" r="32" />
                <circle cx="460" cy="220" r="32" />
              </svg>
            )}

            {vistaActiva === "lateral_der" && (
              <svg className="w-full h-full max-h-72 text-zinc-600 group-hover:text-zinc-500 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M550 220 L530 170 L460 160 L390 95 L210 95 L140 155 L50 165 L40 220 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M385 105 L290 105 L290 150 L435 150 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M280 105 L210 105 L155 150 L280 150 Z" />
                <line x1="285" y1="105" x2="285" y2="220" />
                <circle cx="460" cy="220" r="32" />
                <circle cx="140" cy="220" r="32" />
              </svg>
            )}

            {vistaActiva === "superior" && (
              <svg className="w-full h-full max-h-72 text-zinc-600 group-hover:text-zinc-500 transition-colors" viewBox="0 0 600 320" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M180 50 Q300 35 420 50 Q480 80 480 160 Q480 240 420 270 Q300 285 180 270 Q120 240 120 160 Q120 80 180 50 Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M190 75 Q300 65 410 75" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M170 105 Q300 95 430 105" />
                <rect x="220" y="115" width="160" height="90" rx="8" strokeLinecap="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M170 215 Q300 225 430 215" />
              </svg>
            )}
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

      {/* ===================================================================
          PLANTILLAS DE INSPECCIÓN POR TIPO DE SERVICIO (EVALUACIÓN EN 1 TOQUE)
          =================================================================== */}
      <div className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] space-y-4">
        {/* Selector de Plantilla */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Plantillas de Inspección por Servicio
            </span>
            <p className="text-[11px] text-zinc-400">
              Evaluación táctil de 1 toque sin escribir texto.
            </p>
          </div>

          {/* Barra de progreso de la plantilla */}
          <div className="flex items-center gap-3">
            <div className="w-32 sm:w-44 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${porcentajeProgresoPlantilla}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
              {porcentajeProgresoPlantilla}%
            </span>
          </div>
        </div>

        {/* Chips de selección de plantilla deslizable */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PLANTILLAS_INSPECCION.map((p) => {
            const active = plantillaActivaId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlantillaActivaId(p.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  active
                    ? "bg-blue-500/15 border-blue-500/40 text-white shadow-md shadow-blue-500/10"
                    : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="text-base">{p.icon}</span>
                <div className="truncate">
                  <span className="text-xs font-semibold block truncate">{p.name}</span>
                  <span className="text-[10px] text-zinc-500 block truncate">{p.items.length} ítems</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Listado de ítems con los 4 modos de evaluación */}
        <div className="divide-y divide-white/5 pt-1">
          {plantillaSeleccionada.items.map((item) => {
            const val = evaluacionesPlantilla[item.id];
            return (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <span className="text-zinc-200 font-medium">{item.label}</span>

                {/* Controles de evaluación según el modo */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* a) MODO SEMÁFORO TÁCTIL: Bueno (verde) / Regular (ámbar) / Malo (rojo) */}
                  {item.modo === "semaforo" && (
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                      {[
                        { id: "BUENO", label: "Bueno", color: "bg-emerald-500/25 border-emerald-500/50 text-emerald-300" },
                        { id: "REGULAR", label: "Regular", color: "bg-amber-500/25 border-amber-500/50 text-amber-300" },
                        { id: "MALO", label: "Malo", color: "bg-rose-500/25 border-rose-500/50 text-rose-300" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleEvaluarItem(item.id, opt.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            val === opt.id
                              ? `${opt.color} shadow-sm font-bold scale-105`
                              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* b) MODO BINARIO: Sí / No */}
                  {item.modo === "binario" && (
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                      {[
                        { id: "SI", label: "Sí", color: "bg-emerald-500/25 border-emerald-500/50 text-emerald-300" },
                        { id: "NO", label: "No", color: "bg-rose-500/25 border-rose-500/50 text-rose-300" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleEvaluarItem(item.id, opt.id)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            val === opt.id
                              ? `${opt.color} shadow-sm font-bold scale-105`
                              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* c) MODO CUMPLIMIENTO: Cumple / No cumple */}
                  {item.modo === "cumplimiento" && (
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                      {[
                        { id: "CUMPLE", label: "Cumple", color: "bg-blue-500/25 border-blue-500/50 text-blue-300" },
                        { id: "NO_CUMPLE", label: "No cumple", color: "bg-amber-500/25 border-amber-500/50 text-amber-300" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleEvaluarItem(item.id, opt.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            val === opt.id
                              ? `${opt.color} shadow-sm font-bold scale-105`
                              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* d) MODO PUNTAJE VISUAL: Escala de 1 a 5 */}
                  {item.modo === "puntaje" && (
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const sel = val !== undefined && Number(val) >= num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleEvaluarItem(item.id, num)}
                            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                              sel
                                ? "bg-amber-500/25 border border-amber-500/50 text-amber-300"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                            }`}
                          >
                            ★ {num}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          CONFORMIDAD DE RECEPCIÓN (FIRMA DEL CLIENTE)
          =================================================================== */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
        <div
          onClick={() => setMostrarFirmaRecepcion(!mostrarFirmaRecepcion)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Conformidad de Recepción (Firma del Cliente)
            </span>
            {firmaRecepcionUrl && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                ✓ Firmada
              </span>
            )}
          </div>

          <span className="text-xs text-zinc-400">
            {mostrarFirmaRecepcion ? "Ocultar ▲" : "Desplegar Firma ▼"}
          </span>
        </div>

        {mostrarFirmaRecepcion && (
          <div className="pt-2 border-t border-white/5 space-y-3 animate-fade-in">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              El cliente declara conformidad con el estado inicial del vehículo y los daños registrados en los pines numerados de esta inspección previa al ingreso a garaje:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8">
                <div className="h-36 rounded-xl bg-black/60 border border-white/10 relative overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={canvasRecepcionRef}
                    width={400}
                    height={144}
                    onMouseDown={iniciarTrazo}
                    onMouseMove={moverTrazo}
                    onMouseUp={terminarTrazo}
                    onMouseLeave={terminarTrazo}
                    onTouchStart={iniciarTrazo}
                    onTouchMove={moverTrazo}
                    onTouchEnd={terminarTrazo}
                    className="w-full h-full cursor-crosshair touch-none select-none"
                  />
                  {!tieneTrazosRef.current && !firmaRecepcionUrl && (
                    <div className="absolute pointer-events-none text-zinc-600 text-xs font-mono">
                      [El cliente firma aquí con el dedo o puntero táctil]
                    </div>
                  )}
                  {firmaRecepcionUrl && !tieneTrazosRef.current && (
                    <img src={firmaRecepcionUrl} alt="Firma Recepción" className="max-h-24 object-contain pointer-events-none" />
                  )}
                </div>
              </div>

              <div className="sm:col-span-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={limpiarFirma}
                  className="h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
                >
                  Limpiar Firma
                </button>
                <button
                  type="button"
                  onClick={guardarFirmaRecepcion}
                  className="h-11 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-lg shadow-sky-500/20"
                >
                  Confirmar Firma ✓
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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

              {/* Resultados de la Plantilla de Inspección */}
              <div>
                <div className="flex items-center justify-between mb-2 border-b pb-1">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                    Evaluación de Servicio: {plantillaSeleccionada.name}
                  </h4>
                  <span className="text-xs font-mono font-bold text-zinc-700">
                    Conformidad: {porcentajeProgresoPlantilla}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {plantillaSeleccionada.items.map((it) => {
                    const res = evaluacionesPlantilla[it.id];
                    return (
                      <div
                        key={it.id}
                        className="p-2 rounded bg-zinc-50 border border-zinc-200 flex items-center justify-between"
                      >
                        <span className="text-zinc-700 truncate pr-2">{it.label}</span>
                        <span className="font-bold text-zinc-900 shrink-0 font-mono">
                          {res !== undefined ? String(res) : "N/E"}
                        </span>
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
            ← Anterior (Vehículo)
          </button>
        ) : <div />}

        {onContinuar && (
          <button
            type="button"
            onClick={onContinuar}
            className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Continuar a Catálogo / Presupuesto (Paso 4) →
          </button>
        )}
      </div>
    </div>
  );
}
