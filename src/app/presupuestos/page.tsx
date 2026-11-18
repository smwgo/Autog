"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { isProtectedAdminEmail } from "@/lib/admin-accounts";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Paginacion, paginarLista } from "@/components/Paginacion";

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
  pedidosCount?: number;
  respuestasCount?: number;
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
  { id: "PENDIENTE", label: "En Espera", short: "En Espera", icon: "⏳", dot: "bg-amber-400" },
  { id: "PAUSADA", label: "Pausa", short: "Pausa", icon: "⏸️", dot: "bg-rose-400" },
  { id: "APROBADO", label: "Trabajando", short: "Trabajando", icon: "🔧", dot: "bg-emerald-400" },
  { id: "PAGADO", label: "Pagado", short: "Pagado", icon: "✓", dot: "bg-blue-400" },
];

function limpiarNumeroOrden(val?: string | number | null): string {
  if (!val) return "";
  const limpio = String(val)
    .replace(/\b(OT|ORD)\b[-\s#]*/gi, "")
    .replace(/#+/g, "")
    .trim();
  return limpio || String(val).replace(/#+/g, "").trim();
}

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_CORTOS = ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."];

function formatearFechaHora(createdAt?: string | null, dateIn?: string | null): { fecha: string; hora: string } {
  const raw = createdAt || dateIn;
  if (!raw) return { fecha: "-", hora: "" };
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return { fecha: String(raw), hora: "" };
  }
  const diaSemana = DIAS_SEMANA[d.getDay()];
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = MESES_CORTOS[d.getMonth()];
  const anio = String(d.getFullYear()).slice(-2);
  const fecha = `${diaSemana} ${dia} ${mes} ${anio}`;
  const hora = d.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { fecha, hora };
}

function getEstadoTallerPropuesta(orden: OrdenResumen, _estaTrabajandoManual?: boolean) {
  const statusLower = (orden.status || "").trim().toLowerCase();
  const quoteStatusLower = (orden.quoteStatus || "").trim().toLowerCase();
  const esPagado =
    quoteStatusLower === "pagado" ||
    statusLower === "pagado" ||
    statusLower.includes("factur") ||
    statusLower.includes("pagad");

  if (esPagado) {
    return {
      tipo: "pagado" as const,
      label: "✓ Pagado",
      badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
      dotClass: "bg-sky-500",
    };
  }

  const esPausada = statusLower === "pausada" || statusLower === "pausa";
  if (esPausada) {
    return {
      tipo: "pausa" as const,
      label: "Pausa",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      dotClass: "bg-amber-500",
    };
  }

  const esTrabajando =
    quoteStatusLower === "aprobado" ||
    quoteStatusLower === "aceptado" ||
    quoteStatusLower.includes("aprob") ||
    statusLower === "en proceso" ||
    statusLower === "reparando" ||
    statusLower === "trabajando" ||
    statusLower.includes("reparac") ||
    statusLower === "en_caja";

  if (esTrabajando) {
    return {
      tipo: "trabajando" as const,
      label: "Trabajando",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      dotClass: "bg-emerald-500",
    };
  }

  return {
    tipo: "espera" as const,
    label: "En espera",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-500/70",
  };
}

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
  const [metricasMovilAbiertas, setMetricasMovilAbiertas] = useState(false);
  const menuEstadoRef = useRef<HTMLDivElement>(null);
  const [isPanelSelectorAdmin, setIsPanelSelectorAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("currentUser");
        if (local) {
          const parsed = JSON.parse(local);
          if (
            isProtectedAdminEmail(parsed?.email) &&
            (parsed?.role?.toUpperCase() === "ROOT" || parsed?.isSuperAdmin)
          ) {
            setIsPanelSelectorAdmin(true);
          }
        }
      } catch { }
    }
  }, []);

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

  const metricasExtra = useMemo(() => {
    let utilidadTotal = 0;
    let ventaTotal = 0;
    let enCajaPagadas = 0;
    let pedidosTotal = 0;
    let respuestasTotal = 0;
    for (const o of ordenes) {
      utilidadTotal += Number(o.utilidadEstimada || 0);
      ventaTotal += Number(o.totalVentaEstimada || 0);
      pedidosTotal += Number(o.pedidosCount || 0);
      respuestasTotal += Number(o.respuestasCount || 0);
      const st = String(o.status || "").toLowerCase();
      const qs = String(o.quoteStatus || "").toLowerCase();
      if (o.posRequestId || st === "pagado" || qs === "pagado" || qs.includes("caja")) {
        enCajaPagadas += 1;
      }
    }
    const margenPromedio = ventaTotal > 0 ? Math.round((utilidadTotal / ventaTotal) * 100) : 0;
    return { utilidadTotal, margenPromedio, enCajaPagadas, pedidosTotal, respuestasTotal };
  }, [ordenes]);

  // Casillero de verificación múltiple: órdenes marcadas en trabajo
  const [ordenesTrabajandoIds, setOrdenesTrabajandoIds] = useState<string[]>([]);
  const [menuTallerFilaId, setMenuTallerFilaId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const rawLista = localStorage.getItem("taller_ordenes_trabajando_ids");
        if (rawLista) {
          const parsed = JSON.parse(rawLista);
          if (Array.isArray(parsed)) {
            setOrdenesTrabajandoIds(parsed.map(String));
            return;
          }
        }
        const guardada = localStorage.getItem("taller_orden_activa_id");
        if (guardada) setOrdenesTrabajandoIds([guardada]);
      } catch {}
    }
  }, []);

  const toggleOrdenTrabajando = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ordenObjetivo = ordenes.find((o) => o.id === id || o.orderNumber === id);
    const yaAprobada = String(ordenObjetivo?.quoteStatus || "").toLowerCase() === "aprobado";
    const estabaMarcada = ordenesTrabajandoIds.includes(id) || yaAprobada;
    const nuevoMarcado = !estabaMarcada;

    setOrdenesTrabajandoIds((prev) => {
      const next = nuevoMarcado
        ? Array.from(new Set([...prev, id]))
        : prev.filter((item) => item !== id && item !== ordenObjetivo?.orderNumber);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("taller_ordenes_trabajando_ids", JSON.stringify(next));
          if (nuevoMarcado) {
            localStorage.setItem("taller_orden_activa_id", id);
          } else if (localStorage.getItem("taller_orden_activa_id") === id) {
            if (next.length > 0) localStorage.setItem("taller_orden_activa_id", next[next.length - 1]);
            else localStorage.removeItem("taller_orden_activa_id");
          }
        } catch {}
      }
      return next;
    });
    void handleCambiarEstadoPropuesta(id, nuevoMarcado ? "Aprobado" : "Pendiente");
  };

  // Cambiar estado directo de propuesta (Aprobar / Pausar / Esperar) para que impacte en Taller
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null);

  const handleCambiarEstadoPropuesta = async (
    orderId: string,
    nuevoEstado: "Aprobado" | "Pendiente" | "Pagado" | "Pausada"
  ) => {
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
        if (nuevoEstado === "Pagado" && ordenesTrabajandoIds.includes(orderId)) {
          setOrdenesTrabajandoIds((prev) => {
            const next = prev.filter((item) => item !== orderId);
            try {
              localStorage.setItem("taller_ordenes_trabajando_ids", JSON.stringify(next));
              if (localStorage.getItem("taller_orden_activa_id") === orderId) {
                localStorage.removeItem("taller_orden_activa_id");
              }
            } catch { }
            return next;
          });
        }
        // Actualizar estado local inmediatamente solo para la orden modificada
        setOrdenes((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                ...o,
                status:
                  nuevoEstado === "Pagado"
                    ? "Pagado"
                    : nuevoEstado === "Pausada"
                      ? "Pausada"
                      : nuevoEstado === "Aprobado"
                        ? "En Proceso"
                        : "Pendiente",
                quoteStatus: nuevoEstado === "Pausada" ? o.quoteStatus : nuevoEstado,
                quoteApprovedAt:
                  nuevoEstado === "Aprobado"
                    ? new Date().toISOString()
                    : nuevoEstado === "Pendiente"
                      ? null
                      : o.quoteApprovedAt,
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

  // Estado para eliminar propuesta con confirmación
  const [ordenAEliminar, setOrdenAEliminar] = useState<OrdenResumen | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const handleConfirmarEliminar = async () => {
    if (!ordenAEliminar) return;
    const targetId = ordenAEliminar.id;
    const targetNum = ordenAEliminar.orderNumber;
    try {
      setEliminandoId(targetId || targetNum);
      const url = `/api/taller/ordenes?id=${encodeURIComponent(targetId || "")}&orderNumber=${encodeURIComponent(targetNum || "")}`;
      const res = await fetch(url, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        mostrarToast("Propuesta eliminada.", "ok");
      } else {
        mostrarToast(data.error || "No se pudo eliminar la propuesta.", "err");
      }

      const idsEliminar = new Set([targetId, targetNum, ordenAEliminar.id, ordenAEliminar.orderNumber].filter(Boolean));
      if (ordenesTrabajandoIds.some((tid) => idsEliminar.has(tid))) {
        setOrdenesTrabajandoIds((prev) => {
          const next = prev.filter((tid) => !idsEliminar.has(tid));
          try {
            localStorage.setItem("taller_ordenes_trabajando_ids", JSON.stringify(next));
            const active = localStorage.getItem("taller_orden_activa_id");
            if (active && idsEliminar.has(active)) {
              localStorage.removeItem("taller_orden_activa_id");
            }
          } catch { }
          return next;
        });
      }

      // Remover inmediatamente del estado local de la tabla
      setOrdenes((prev) =>
        prev.filter((o) => {
          const mId = o.id && (o.id === targetId || o.id === ordenAEliminar.id);
          const mNum = o.orderNumber && (o.orderNumber === targetNum || o.orderNumber === ordenAEliminar.orderNumber);
          return !mId && !mNum;
        })
      );
      setOrdenAEliminar(null);
      void cargarOrdenes(true);
    } catch (err: any) {
      mostrarToast("Error de conexión al eliminar: " + (err.message || ""), "err");
    } finally {
      setEliminandoId(null);
    }
  };

  // Navegación a la página de expediente / propuesta dedicada (sin alterar el estado)
  const irAPropuesta = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    router.push(`/presupuestos/${id}`);
  };

  // ============================================================================
  // CARGA DE DATOS DESDE NEON
  // ============================================================================

  const cargarOrdenes = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setCargando(true);
      const params = new URLSearchParams();
      if (busqueda) params.set("busqueda", busqueda);
      if (filtroEstado !== "TODOS") params.set("estado", filtroEstado);
      if (filtroTipo !== "TODOS") params.set("tipo", filtroTipo);

      const res = await fetch(`/api/presupuestos/ordenes?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (!isSilent) {
          let errText = `Error al consultar órdenes (${res.status})`;
          try {
            const isJson = res.headers.get("content-type")?.includes("application/json");
            if (isJson) {
              const errData = await res.json();
              errText = errData.error || errText;
            }
          } catch { }
          mostrarToast(errText, "err");
        }
        return;
      }
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        if (!isSilent) mostrarToast("Respuesta inválida del servidor al listar órdenes", "err");
        return;
      }

      if (data.success) {
        const rawList = Array.isArray(data.ordenes) ? data.ordenes : [];
        const seenIds = new Set<string>();
        const ordenesUnicas = rawList.filter((o: OrdenResumen) => {
          if (!o?.id || seenIds.has(o.id)) return false;
          seenIds.add(o.id);
          return true;
        });
        setOrdenes(ordenesUnicas);
        if (data.kpis) setKpis(data.kpis);
      } else if (!isSilent) {
        mostrarToast(data.error || "Error al cargar órdenes", "err");
      }
    } catch (err: any) {
      console.error(err);
      if (!isSilent) mostrarToast("Error de conexión al cargar órdenes", "err");
    } finally {
      if (!isSilent) setCargando(false);
    }
  }, [busqueda, filtroEstado, filtroTipo]);

  useEffect(() => {
    cargarOrdenes(false);
  }, [cargarOrdenes]);

  useRealtimeSync({
    channels: ["presupuestos", "taller", "ordenes"],
    onEvent: (ev) => {
      if (ev.action === "deleted" && ev.entityId) {
        setOrdenes((prev) =>
          prev.filter((o) => o.id !== ev.entityId && o.orderNumber !== ev.entityId)
        );
      }
    },
    onRefresh: () => cargarOrdenes(true),
  });

  const [paginaActual, setPaginaActual] = useState(1);
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroEstado]);

  const { itemsPaginados: ordenesPaginadas, paginaValida } = paginarLista(
    ordenes,
    paginaActual
  );

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-8 text-zinc-900 dark:text-white selection:bg-blue-500/30">
      <Header />

      {/* Toast Notificaciones */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 animate-bounce ${toast.tipo === "ok"
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
                href={isPanelSelectorAdmin ? "/modulos" : "/taller"}
                title={isPanelSelectorAdmin ? "Volver a los paneles" : "Volver a Taller"}
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
          </div>

          {/* KPIs / Exactamente 3 Métricas (en escritorio siempre, en móvil controlado por el botón Métrica) */}
          <div className={`order-3 sm:order-2 mb-2 sm:mb-8 ${metricasMovilAbiertas ? "block animate-in fade-in duration-200" : "hidden sm:block"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
              {/* Métrica 1: Total Propuestas & Valorizado + Utilidad */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-500 dark:text-purple-400 flex items-center justify-center text-xl shrink-0">
                  💰
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white truncate">
                    ${kpis.totalValorizado.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium truncate">
                    Total ({kpis.total})
                  </h3>
                </div>
              </div>

              {/* Métrica 2: Pedidos */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                  🚚
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {metricasExtra.pedidosTotal}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium truncate">
                    Pedidos
                  </h3>
                </div>
              </div>

              {/* Métrica 3: Respuesta del proveedor */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                  ✅
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {metricasExtra.respuestasTotal}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium truncate">
                    Respuestas
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros y Buscador (en móvil: buscador + 2 iconos Filtro y Métrica en la misma fila) */}
          <div className="order-2 sm:order-3 flex flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
                🔍
              </span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-zinc-400 shadow-sm"
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

            {/* Dropdown Filtro Estado (en móvil: ícono compacto; en escritorio: botón completo) */}
            <div className="relative shrink-0 sm:w-36" ref={menuEstadoRef}>
              <button
                type="button"
                onClick={() => setMenuEstadoAbierto(!menuEstadoAbierto)}
                aria-label="Filtrar propuestas"
                title="Filtrar propuestas"
                className={`sm:hidden w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                  filtroEstado !== "TODAS"
                    ? "bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-300"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.9}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-6.75 7.5v5.25l-4.5 2.25V12L3 4.5Z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setMenuEstadoAbierto(!menuEstadoAbierto)}
                className="hidden sm:flex w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span>
                  {filtroEstado === "PENDIENTE"
                    ? "En Espera"
                    : filtroEstado === "PAUSADA"
                      ? "Pausa"
                      : filtroEstado === "APROBADO"
                        ? "Trabajando"
                        : filtroEstado === "PAGADO"
                          ? "Pagado"
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
                  <div className="absolute right-0 mt-1.5 w-44 sm:w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {OPCIONES_ESTADO.map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        onClick={() => {
                          setFiltroEstado(opcion.id);
                          setMenuEstadoAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${filtroEstado === opcion.id
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

            {/* Botón Métrica en móvil al lado del buscador */}
            <button
              type="button"
              onClick={() => setMetricasMovilAbiertas((v) => !v)}
              aria-label="Mostrar u ocultar métricas"
              title="Métricas"
              className={`sm:hidden w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                metricasMovilAbiertas
                  ? "bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-300"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.9}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </button>
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
                {/* Vista Móvil Compacta (optimizada iOS y Android) */}
                <div className="md:hidden space-y-2.5">
                  {ordenesPaginadas.map((orden, idx) => {
                    const estaTrabajando =
                      ordenesTrabajandoIds.includes(orden.id) ||
                      ordenesTrabajandoIds.includes(orden.orderNumber) ||
                      String(orden.quoteStatus || "").toLowerCase() === "aprobado";
                    const stTaller = getEstadoTallerPropuesta(orden, estaTrabajando);
                    const { fecha, hora } = formatearFechaHora(orden.createdAt, orden.dateIn);
                    return (
                      <div
                        key={`movil-${orden.id || idx}`}
                        onClick={() => irAPropuesta(orden.id)}
                        className={`rounded-2xl border p-3.5 space-y-2.5 shadow-xs transition-all cursor-pointer active:scale-[0.99] ${estaTrabajando
                          ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/30"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => toggleOrdenTrabajando(orden.id, e)}
                              title={estaTrabajando ? "Orden en trabajo (clic para desmarcar)" : "Marcar como orden en trabajo"}
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${estaTrabajando
                                ? "bg-purple-600 border-purple-500 text-white"
                                : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-transparent"
                                }`}
                            >
                              <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 shrink-0">
                                  #{limpiarNumeroOrden(orden.orderNumber)}
                                </span>
                                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">
                                  {orden.client}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300 mt-1 min-w-0">
                                <span className="truncate font-medium">{orden.vehicle}</span>
                                <span className="shrink-0 text-zinc-300 dark:text-zinc-600">·</span>
                                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                                  {fecha}{hora ? ` ${hora}` : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="font-bold text-base tabular-nums text-zinc-900 dark:text-white shrink-0 pt-0.5">
                            ${orden.totalVentaEstimada.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 text-sm gap-2">
                          <div onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={cambiandoEstadoId === orden.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                const siguienteEstado =
                                  stTaller.tipo === "pagado"
                                    ? "Pendiente"
                                    : stTaller.tipo === "espera"
                                      ? "Aprobado"
                                      : stTaller.tipo === "trabajando"
                                        ? "Pausada"
                                        : "Pagado";
                                handleCambiarEstadoPropuesta(orden.id, siguienteEstado);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50 ${stTaller.badgeClass}`}
                              title="Clic para cambiar estado (En espera → Trabajando → Pausa → Pagado)"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${stTaller.dotClass}`} />
                              <span>{stTaller.label}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrdenAEliminar(orden);
                              }}
                              className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-normal flex items-center justify-center transition-all cursor-pointer active:scale-95"
                              title="Eliminar propuesta"
                              aria-label="Eliminar propuesta"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => irAPropuesta(orden.id)}
                              className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-semibold flex items-center justify-center transition-all cursor-pointer active:scale-95"
                              title="Abrir propuesta"
                              aria-label="Abrir propuesta"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="md:hidden bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
                  <Paginacion
                    paginaActual={paginaValida}
                    totalElementos={ordenes.length}
                    onCambiarPagina={setPaginaActual}
                    className="border-t-0"
                  />
                </div>

                {/* Vista Escritorio Minimalista */}
                <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-normal">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-normal">
                        <tr>
                          <th className="py-3 px-3 w-10 text-center font-normal">✓</th>
                          <th className="py-3 px-4 font-normal">Orden</th>
                          <th className="py-3 px-4 font-normal">Fecha / Hora</th>
                          <th className="py-3 px-4 font-normal">Cliente</th>
                          <th className="py-3 px-4 font-normal">Vehículo</th>
                          <th className="py-3 px-4 text-right font-normal">Total</th>
                          <th className="py-3 px-4 text-center font-normal">Estado</th>
                          <th className="py-3 px-4 text-right font-normal">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs font-normal">
                        {ordenesPaginadas.map((orden, idx) => {
                          const estaTrabajando =
                            ordenesTrabajandoIds.includes(orden.id) ||
                            ordenesTrabajandoIds.includes(orden.orderNumber) ||
                            String(orden.quoteStatus || "").toLowerCase() === "aprobado";
                          const stTaller = getEstadoTallerPropuesta(orden, estaTrabajando);
                          const { fecha, hora } = formatearFechaHora(orden.createdAt, orden.dateIn);
                          return (
                            <tr
                              key={`desk-${orden.id || idx}`}
                              onClick={() => irAPropuesta(orden.id)}
                              className={`transition-colors cursor-pointer ${estaTrabajando
                                ? "bg-purple-500/[0.06] dark:bg-purple-500/[0.08] hover:bg-purple-500/[0.12] border-l-2 border-l-purple-500/70"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                }`}
                            >
                              <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => toggleOrdenTrabajando(orden.id, e)}
                                  title={estaTrabajando ? "Orden en trabajo actual (clic para desmarcar)" : "Marcar como orden en trabajo"}
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer mx-auto ${estaTrabajando
                                    ? "bg-purple-600 border-purple-500 text-white shadow-xs"
                                    : "border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/60 hover:border-purple-400 text-transparent"
                                    }`}
                                >
                                  <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              </td>
                              <td className="py-3 px-4 text-xs font-normal text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                #{limpiarNumeroOrden(orden.orderNumber)}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap text-xs font-normal text-zinc-700 dark:text-zinc-300">
                                {fecha}{hora ? ` · ${hora}` : ""}
                              </td>
                              <td className="py-3 px-4 text-xs font-normal text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {orden.client}
                              </td>
                              <td className="py-3 px-4 text-xs font-normal text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                {orden.vehicle}
                              </td>
                              <td className="py-3 px-4 text-right text-xs font-normal text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                ${orden.totalVentaEstimada.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  disabled={cambiandoEstadoId === orden.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const siguienteEstado =
                                      stTaller.tipo === "pagado"
                                        ? "Pendiente"
                                        : stTaller.tipo === "espera"
                                          ? "Aprobado"
                                          : stTaller.tipo === "trabajando"
                                            ? "Pausada"
                                            : "Pagado";
                                    handleCambiarEstadoPropuesta(orden.id, siguienteEstado);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal border transition-all hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50 ${stTaller.badgeClass}`}
                                  title="Clic para cambiar estado (En espera → Trabajando → Pausa → Pagado)"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${stTaller.dotClass}`} />
                                  <span>{stTaller.label}</span>
                                </button>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrdenAEliminar(orden);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-normal flex items-center justify-center transition-all cursor-pointer"
                                    title="Eliminar propuesta"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => irAPropuesta(orden.id)}
                                    className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-normal flex items-center justify-center transition-all cursor-pointer"
                                    title="Abrir propuesta"
                                  >
                                    →
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Paginacion
                    paginaActual={paginaValida}
                    totalElementos={ordenes.length}
                    onCambiarPagina={setPaginaActual}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {ordenAEliminar && (
        <div
          onClick={() => !eliminandoId && setOrdenAEliminar(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 text-lg">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm sm:text-base">
                  ¿Eliminar propuesta?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  #{limpiarNumeroOrden(ordenAEliminar.orderNumber)} · {ordenAEliminar.client || "Cliente"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-white/5">
              <button
                type="button"
                disabled={Boolean(eliminandoId)}
                onClick={() => setOrdenAEliminar(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(eliminandoId)}
                onClick={handleConfirmarEliminar}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {eliminandoId ? (
                  <>
                    <span className="animate-spin inline-block">⏳</span>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
