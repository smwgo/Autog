"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

interface EvidenciaItem {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number | null;
  transcriptionText?: string | null;
  transcriptionStatus?: string;
  uploadedBy?: string | null;
  createdAt?: string | null;
}

interface RepuestoPresupuesto {
  id: string;
  productId?: string | null;
  code: string;
  name: string;
  qty: number;
  costPrice: number;
  price: number;
  subtotalVenta: number;
  subtotalCosto: number;
  margin: number;
  marginPercent: number;
  supplierId?: string | null;
  supplierName?: string;
  supplierPhone?: string;
  purchaseStatus: "POR_PEDIR" | "PEDIDO_WHATSAPP" | "COMPRADO" | "RECIBIDO";
  notes?: string;
}

interface ServicioPresupuesto {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  estimatedMinutes: number;
  mechanic?: string;
}

interface OrdenResumen {
  id: string;
  orderNumber: string;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone?: string | null;
  mechanic: string;
  status: string;
  progress: number;
  mileage?: number | null;
  fuelLevel?: string | null;
  notes?: string | null;
  dateIn: string;
  createdAt: string;
  tipoNegocio: "Taller" | "Lubricentro" | "Carwash" | "Tecnicentro";
  quoteNumber: string;
  quoteStatus: string;
  quoteApprovedAt?: string | null;
  posRequestId?: string | null;
  itemsCount: number;
  servicesCount: number;
  findingsCount: number;
  totalVentaEstimada: number;
  totalCostoEstimado: number;
  utilidadEstimada: number;
  margenPercent: number;
  evidencias: {
    total: number;
    fotos: number;
    audios: number;
    videos: number;
    transcripciones: number;
  };
}

interface ProveedorItem {
  id: string;
  name: string;
  contact: string;
  phone?: string | null;
  email?: string | null;
}

const OPCIONES_TIPO = [
  { id: "TODOS", label: "Todos los Tipos", short: "Todos", icon: "🏢" },
  { id: "Taller", label: "Taller Mecánico", short: "Taller", icon: "🔧" },
  { id: "Lubricentro", label: "Lubricentro Express", short: "Lubricentro", icon: "🛢️" },
  { id: "Carwash", label: "Carwash / Lavado", short: "Carwash", icon: "🚿" },
  { id: "Tecnicentro", label: "Tecnicentro", short: "Tecnicentro", icon: "⚙️" },
];

const OPCIONES_ESTADO = [
  { id: "TODOS", label: "Todas", short: "Todas", icon: "📋", dot: "bg-zinc-400" },
  { id: "PENDIENTE", label: "Pendientes", short: "Pendientes", icon: "⏳", dot: "bg-amber-400" },
  { id: "APROBADO", label: "Aprobadas", short: "Aprobadas", icon: "✅", dot: "bg-emerald-400" },
  { id: "EN_CAJA", label: "Caja", short: "Caja", icon: "💳", dot: "bg-sky-400" },
];

export default function PanelPresupuestosPage() {
  const router = useRouter();

  // Estados principales de la vista
  const [ordenes, setOrdenes] = useState<OrdenResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [menuTipoAbierto, setMenuTipoAbierto] = useState(false);
  const [menuEstadoAbierto, setMenuEstadoAbierto] = useState(false);
  const menuEstadoRef = useRef<HTMLDivElement>(null);

  const estadoActivo = useMemo(
    () => OPCIONES_ESTADO.find((o) => o.id === filtroEstado) || OPCIONES_ESTADO[0],
    [filtroEstado]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuEstadoRef.current && !menuEstadoRef.current.contains(event.target as Node)) {
        setMenuEstadoAbierto(false);
      }
    }
    if (menuEstadoAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuEstadoAbierto]);
  const [kpis, setKpis] = useState({
    total: 0,
    pendientesCotizar: 0,
    aprobadas: 0,
    totalValorizado: 0,
  });

  // Casillero de verificación: orden con la que se está trabajando actualmente
  const [ordenTrabajandoId, setOrdenTrabajandoId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const guardada = localStorage.getItem("taller_orden_activa_id");
      if (guardada) setOrdenTrabajandoId(guardada);
    }
  }, []);

  const toggleOrdenTrabajando = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOrdenTrabajandoId((prev) => {
      const nuevo = prev === id ? null : id;
      if (typeof window !== "undefined") {
        if (nuevo) {
          localStorage.setItem("taller_orden_activa_id", nuevo);
        } else {
          localStorage.removeItem("taller_orden_activa_id");
        }
      }
      return nuevo;
    });
  };

  // Cambiar estado directo de propuesta (Aprobar / Esperar) para que impacte en Taller
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null);

  const handleCambiarEstadoPropuesta = async (orderId: string, nuevoEstado: "Aprobado" | "Pendiente") => {
    try {
      setCambiandoEstadoId(orderId);
      const res = await fetch("/api/presupuestos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, quoteStatus: nuevoEstado }),
      });
      if (!res.ok) {
        let errText = `Error (${res.status})`;
        try {
          const isJson = res.headers.get("content-type")?.includes("application/json");
          if (isJson) {
            const errData = await res.json();
            errText = errData.error || errText;
          }
        } catch {
          // El servidor devolvió HTML (404/500)
        }
        mostrarToast(errText, "err");
        return;
      }
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        mostrarToast("Respuesta inválida del servidor", "err");
        return;
      }
      if (data.success) {
        mostrarToast(data.message, "ok");
        // Actualizar estado local inmediatamente
        setOrdenes((prev) =>
          prev.map((o) =>
            o.id === orderId || o.orderNumber === orderId
              ? {
                  ...o,
                  quoteStatus: nuevoEstado,
                  quoteApprovedAt: nuevoEstado === "Aprobado" ? new Date().toISOString() : null,
                }
              : o
          )
        );
        void cargarOrdenes();
      } else {
        mostrarToast(data.error || "No se pudo cambiar el estado", "err");
      }
    } catch {
      mostrarToast("Error de conexión al cambiar estado", "err");
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  // Notificaciones Toast
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" | "info" } | null>(null);
  const mostrarToast = (msg: string, tipo: "ok" | "err" | "info" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  // Navegación a la página de expediente / propuesta dedicada
  const irAPropuesta = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOrdenTrabajandoId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("taller_orden_activa_id", id);
    }
    router.push(`/presupuestos/${id}`);
  };

  // ============================================================================
  // CARGA DE DATOS DESDE NEON
  // ============================================================================

  const cargarOrdenes = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (busqueda) params.set("busqueda", busqueda);
      if (filtroEstado !== "TODOS") params.set("estado", filtroEstado);
      if (filtroTipo !== "TODOS") params.set("tipo", filtroTipo);

      const res = await fetch(`/api/presupuestos/ordenes?${params.toString()}`);
      if (!res.ok) {
        let errText = `Error al consultar órdenes (${res.status})`;
        try {
          const isJson = res.headers.get("content-type")?.includes("application/json");
          if (isJson) {
            const errData = await res.json();
            errText = errData.error || errText;
          }
        } catch {
          // El servidor devolvió HTML (404/500)
        }
        mostrarToast(errText, "err");
        return;
      }
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        mostrarToast("Respuesta inválida del servidor al listar órdenes", "err");
        return;
      }

      if (data.success) {
        setOrdenes(data.ordenes || []);
        if (data.kpis) setKpis(data.kpis);
      } else {
        mostrarToast(data.error || "Error al cargar órdenes", "err");
      }
    } catch (err: any) {
      console.error(err);
      mostrarToast("Error de conexión al cargar órdenes", "err");
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroEstado, filtroTipo]);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans pb-24 md:pb-0 text-zinc-900 dark:text-white selection:bg-blue-500/30">
      <Header />

      {/* Toast Notificaciones */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 animate-bounce ${
            toast.tipo === "ok"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : toast.tipo === "err"
              ? "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
              : "bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300"
          }`}
        >
          <span>{toast.tipo === "ok" ? "✓" : toast.tipo === "err" ? "✕" : "ℹ"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Contenido Principal con layout idéntico a POS Cotizaciones */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col">
          {/* Cabecera / Navegación */}
          <div className="order-1 mb-4 sm:mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link 
                href="/taller"
                title="Volver a Taller"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                Propuestas
              </h1>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm shadow-purple-500/20 shrink-0">
                {ordenes.length}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => cargarOrdenes()}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 active:scale-95 font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Actualizar propuestas"
              >
                <span className={cargando ? "animate-spin" : ""}>🔄</span>
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
          </div>

          {/* KPIs / Exactamente 3 Métricas con CollapsibleMetrics estilo POS Cotizaciones */}
          <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
              {/* Métrica 1: Total Propuestas & Valorizado */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-500 dark:text-purple-400 flex items-center justify-center text-xl shrink-0">
                  💰
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    ${kpis.totalValorizado.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                    Total Propuestas ({kpis.total})
                  </h3>
                </div>
              </div>

              {/* Métrica 2: Por Cotizar / Pendientes */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                  ⏳
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {kpis.pendientesCotizar}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                    Por Cotizar
                  </h3>
                </div>
              </div>

              {/* Métrica 3: Autorizadas */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                  ✅
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {kpis.aprobadas}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                    Autorizadas
                  </h3>
                </div>
              </div>
            </div>
          </CollapsibleMetrics>

          {/* Filtros y Buscador */}
          <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
            <div className="relative w-full flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
                🔍
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-zinc-400 shadow-sm"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Filtro Estado estilo POS */}
            <div className="relative w-full sm:w-36 shrink-0" ref={menuEstadoRef}>
              <button
                type="button"
                onClick={() => setMenuEstadoAbierto(!menuEstadoAbierto)}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span>
                  {filtroEstado === "PENDIENTE"
                    ? "Pendientes"
                    : filtroEstado === "APROBADO"
                    ? "Aprobadas"
                    : filtroEstado === "EN_CAJA"
                    ? "Caja"
                    : "Filtro"}
                </span>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform ${menuEstadoAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuEstadoAbierto && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setMenuEstadoAbierto(false)} 
                  />
                  <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {OPCIONES_ESTADO.map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        onClick={() => {
                          setFiltroEstado(opcion.id);
                          setMenuEstadoAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                          filtroEstado === opcion.id
                            ? "bg-purple-50 dark:bg-purple-600/15 text-purple-600 dark:text-purple-400 font-medium"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${opcion.dot || "bg-zinc-400"}`} />
                          <span>{opcion.label}</span>
                        </div>
                        {filtroEstado === opcion.id && (
                          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lista de Propuestas / Órdenes */}
          <div className="order-4">
            {cargando ? (
              <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Cargando propuestas...
              </div>
            ) : ordenes.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                Sin propuestas
              </div>
            ) : (
              <>
                {/* Vista Móvil (Tarjetas táctiles estilo POS con casillero de verificación) */}
                <div className="md:hidden space-y-3.5">
                  {ordenes.map((orden) => {
                    const esAprobado = orden.quoteStatus === "Aprobado" || orden.status === "EN_CAJA";
                    const estaTrabajando = ordenTrabajandoId === orden.id || ordenTrabajandoId === orden.orderNumber;
                    return (
                      <div
                        key={orden.id}
                        onClick={() => irAPropuesta(orden.id)}
                        className={`rounded-2xl border p-4 space-y-3 shadow-xs transition-all cursor-pointer ${
                          estaTrabajando
                            ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/30"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Casillero de verificación móvil */}
                            <button
                              type="button"
                              onClick={(e) => toggleOrdenTrabajando(orden.id, e)}
                              title={estaTrabajando ? "Orden en trabajo (clic para desmarcar)" : "Marcar como orden con la que estoy trabajando"}
                              className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                estaTrabajando
                                  ? "bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/40 ring-2 ring-purple-500/30 scale-105"
                                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:border-purple-400 text-transparent"
                              }`}
                            >
                              <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>

                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
                                esAprobado
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                                  : "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30"
                              }`}
                            >
                              📋
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {orden.vehicle}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate flex items-center gap-1.5">
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  #{orden.orderNumber}
                                </span>
                                {estaTrabajando && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                    En trabajo
                                  </span>
                                )}
                                <span>• {orden.plate}</span>
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                              esAprobado
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                            }`}
                          >
                            {esAprobado ? "✓ Aprobado" : "En Espera"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="truncate">{orden.client} {orden.tipoNegocio ? `· ${orden.tipoNegocio}` : ""}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {orden.evidencias.fotos > 0 && <span>📸 {orden.evidencias.fotos}</span>}
                            {orden.evidencias.audios > 0 && <span>🎙️ {orden.evidencias.audios}</span>}
                            {orden.evidencias.videos > 0 && <span>🎥 {orden.evidencias.videos}</span>}
                            {orden.findingsCount > 0 && <span>📝 {orden.findingsCount}</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-xs gap-2">
                          <div>
                            <span className="font-bold font-mono text-base text-zinc-900 dark:text-white">
                              ${orden.totalVentaEstimada.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {esAprobado ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCambiarEstadoPropuesta(orden.id, "Pendiente");
                                }}
                                disabled={cambiandoEstadoId === orden.id}
                                className="h-9 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                                title="Propuesta Aprobada (clic para poner En Espera)"
                              >
                                <span>✓</span>
                                <span>{cambiandoEstadoId === orden.id ? "..." : "Aprobado"}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCambiarEstadoPropuesta(orden.id, "Aprobado");
                                }}
                                disabled={cambiandoEstadoId === orden.id}
                                className="h-9 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-700 dark:text-amber-400 font-semibold text-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Propuesta En Espera (clic para Aprobar)"
                              >
                                <span>⏸</span>
                                <span>{cambiandoEstadoId === orden.id ? "..." : "En Espera"}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                irAPropuesta(orden.id);
                              }}
                              className="h-9 px-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold text-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Abrir</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista Escritorio (Tabla completa idéntica a POS Cotizaciones con casillero de verificación) */}
                <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3.5 px-3 w-12 text-center" title="Casillero de verificación: Orden en trabajo">
                            <span className="sr-only">Seleccionar</span>
                            <div className="w-4 h-4 rounded border border-zinc-400 dark:border-zinc-600 flex items-center justify-center text-[10px] text-zinc-400 mx-auto">
                              ✓
                            </div>
                          </th>
                          <th className="py-3.5 px-4">Folio</th>
                          <th className="py-3.5 px-4">Vehículo / Placa</th>
                          <th className="py-3.5 px-4">Cliente</th>
                          <th className="py-3.5 px-4 text-center">Evidencias</th>
                          <th className="py-3.5 px-4 text-center">Estado</th>
                          <th className="py-3.5 px-4 text-right">Total Est.</th>
                          <th className="py-3.5 px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {ordenes.map((orden) => {
                          const esAprobado = orden.quoteStatus === "Aprobado" || orden.status === "EN_CAJA";
                          const estaTrabajando = ordenTrabajandoId === orden.id || ordenTrabajandoId === orden.orderNumber;
                          return (
                            <tr
                              key={orden.id}
                              onClick={() => irAPropuesta(orden.id)}
                              className={`transition-colors cursor-pointer ${
                                estaTrabajando
                                  ? "bg-purple-500/10 dark:bg-purple-500/15 hover:bg-purple-500/20 dark:hover:bg-purple-500/25 border-l-4 border-l-purple-500"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                              }`}
                            >
                              <td className="py-3.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => toggleOrdenTrabajando(orden.id, e)}
                                  title={estaTrabajando ? "Orden en trabajo actual (clic para desmarcar)" : "Marcar como orden con la que estoy trabajando"}
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer mx-auto ${
                                    estaTrabajando
                                      ? "bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/40 ring-2 ring-purple-500/30 scale-105"
                                      : "border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/60 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-500/10 text-transparent"
                                  }`}
                                >
                                  <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span>#{orden.orderNumber}</span>
                                  {estaTrabajando && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 animate-pulse">
                                      En trabajo
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-mono text-xs font-bold text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700">
                                    {orden.plate}
                                  </span>
                                  <span className="font-semibold text-zinc-900 dark:text-white truncate">
                                    {orden.vehicle}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-semibold text-zinc-900 dark:text-white block">
                                  {orden.client}
                                </span>
                                <span className="text-xs text-zinc-400 block">
                                  {orden.clientPhone || orden.tipoNegocio || `Mecánico: ${orden.mechanic}`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  {orden.evidencias.fotos > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20 text-[11px] font-medium flex items-center gap-0.5">
                                      📸 {orden.evidencias.fotos}
                                    </span>
                                  )}
                                  {orden.evidencias.audios > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-0.5">
                                      🎙️ {orden.evidencias.audios}
                                    </span>
                                  )}
                                  {orden.evidencias.videos > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 text-[11px] font-medium flex items-center gap-0.5">
                                      🎥 {orden.evidencias.videos}
                                    </span>
                                  )}
                                  {orden.findingsCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 text-[11px] font-medium flex items-center gap-0.5">
                                      📝 {orden.findingsCount}
                                    </span>
                                  )}
                                  {orden.evidencias.fotos === 0 && orden.evidencias.audios === 0 && orden.evidencias.videos === 0 && orden.findingsCount === 0 && (
                                    <span className="text-zinc-400 text-xs">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${
                                    esAprobado
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                      : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                                  }`}
                                >
                                  {esAprobado ? "✓ Aprobado" : "En Espera"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-white font-mono whitespace-nowrap">
                                ${orden.totalVentaEstimada.toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  {esAprobado ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCambiarEstadoPropuesta(orden.id, "Pendiente");
                                      }}
                                      disabled={cambiandoEstadoId === orden.id}
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                                      title="Propuesta Aprobada (clic para poner En Espera)"
                                    >
                                      <span>✓</span>
                                      <span>{cambiandoEstadoId === orden.id ? "..." : "Aprobado"}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCambiarEstadoPropuesta(orden.id, "Aprobado");
                                      }}
                                      disabled={cambiandoEstadoId === orden.id}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                      title="Propuesta En Espera (clic para Aprobar)"
                                    >
                                      <span>⏸</span>
                                      <span>{cambiandoEstadoId === orden.id ? "..." : "En Espera"}</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      irAPropuesta(orden.id);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all active:scale-95 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                    title="Abrir propuesta"
                                  >
                                    <span>Abrir</span>
                                    <span>→</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
