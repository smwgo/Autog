"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { getClientUserBranch, getClientActiveBranch } from "@/lib/branch";

interface CotizacionItem {
  id?: string;
  productId?: string;
  code?: string;
  name?: string;
  price?: number | string;
  qty?: number;
  discount?: number;
  total?: number | string;
  product?: {
    name?: string;
    code?: string;
  };
}

interface Cotizacion {
  id: string;
  requestNumber: string;
  type: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  itemsSummary: string;
  itemsJson: string | CotizacionItem[];
  totalEstimated: number | string;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

function parseItems(itemsJson: any): CotizacionItem[] {
  if (!itemsJson) return [];
  if (Array.isArray(itemsJson)) return itemsJson;
  try {
    const parsed = typeof itemsJson === "string" ? JSON.parse(itemsJson) : itemsJson;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CotizacionesPosPage() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODAS" | "PENDIENTE" | "APROBADA" | "ANULADA">("TODAS");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);

  // Modales
  const [cotizacionDetalle, setCotizacionDetalle] = useState<Cotizacion | null>(null);
  const [cotizacionAEliminar, setCotizacionAEliminar] = useState<{ id: string; folio: string; total: number } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // Notificaciones
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  // Datos de Empresa para Impresión A4
  const [negocio, setNegocio] = useState({
    nombre: "Lubricentro González",
    razonSocial: "Lubricentro González",
    ruc: "1792345678001",
    direccion: "Matriz - Quito, Ecuador",
    telefono: "0991234567",
    iva: 15,
  });

  const ticketRef = useRef<HTMLDivElement>(null);

  // Cargar configuración de negocio desde Gerencia
  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        const res = await fetch("/api/gerencia/configuracion");
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setNegocio({
              nombre: data.config.nombreComercial || data.config.razonSocial || "Lubricentro González",
              razonSocial: data.config.razonSocial || "Lubricentro González",
              ruc: data.config.ruc || "1792345678001",
              direccion: data.config.direccion || "Matriz - Quito, Ecuador",
              telefono: data.config.telefono || "0991234567",
              iva: Number(data.config.iva) || 15,
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar ajustes de gerencia:", err);
      }
    }
    cargarConfiguracion();
  }, []);

  // Cargar cotizaciones desde Neon DB
  const cargarCotizaciones = useCallback(async (busqueda = "", silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);
      const activeBr = getClientActiveBranch();
      const uBr = getClientUserBranch();
      const params = new URLSearchParams();
      if (busqueda.trim()) params.set("busqueda", busqueda.trim());
      params.set("sede", activeBr);
      params.set("userBranch", uBr);
      const url = `/api/cotizaciones?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setCotizaciones(data.cotizaciones || []);
      } else {
        setErrorMensaje(data.error || "No se pudieron obtener las cotizaciones.");
      }
    } catch (err: any) {
      console.error("Error al cargar cotizaciones:", err);
      setErrorMensaje("Error de conexión al cargar las cotizaciones.");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCotizaciones();
  }, [cargarCotizaciones]);

  useEffect(() => {
    const handleBranch = () => {
      cargarCotizaciones(searchTerm, true);
    };
    window.addEventListener("autog-branch-change", handleBranch);
    return () => window.removeEventListener("autog-branch-change", handleBranch);
  }, [cargarCotizaciones, searchTerm]);

  // Manejo de búsqueda instantánea con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarCotizaciones(searchTerm, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, cargarCotizaciones]);

  // Cambiar estado de la cotización (Aprobar / Anular / Pendiente)
  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      setCambiandoEstado(true);
      const res = await fetch("/api/cotizaciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nuevoEstado }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`Estado actualizado a ${nuevoEstado}.`);
        setTimeout(() => setMensajeExito(null), 3000);
        if (cotizacionDetalle?.id === id) {
          setCotizacionDetalle((prev) => (prev ? { ...prev, status: nuevoEstado } : null));
        }
        await cargarCotizaciones(searchTerm, true);
      } else {
        alert(data.error || "No se pudo actualizar el estado.");
      }
    } catch (e) {
      console.error("Error al actualizar estado:", e);
      alert("Error de conexión al actualizar el estado.");
    } finally {
      setCambiandoEstado(false);
    }
  };

  // Cargar cotización directamente en Venta para cobrarla en el POS
  const handleCargarEnVenta = (cot: Cotizacion) => {
    try {
      sessionStorage.setItem("pos_despacho_solicitud", JSON.stringify(cot));
      router.push("/pos/venta");
    } catch (e) {
      console.error("Error al transferir cotización a venta:", e);
      router.push("/pos/venta");
    }
  };

  // Eliminar cotización de Neon DB
  const handleConfirmarEliminar = async () => {
    if (!cotizacionAEliminar) return;
    try {
      setEliminando(true);
      const res = await fetch(`/api/cotizaciones?id=${encodeURIComponent(cotizacionAEliminar.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`Cotización ${cotizacionAEliminar.folio} eliminada.`);
        setTimeout(() => setMensajeExito(null), 4000);
        if (cotizacionDetalle?.id === cotizacionAEliminar.id) {
          setCotizacionDetalle(null);
        }
        setCotizacionAEliminar(null);
        await cargarCotizaciones(searchTerm, true);
      } else {
        alert(data.error || "No se pudo eliminar la cotización.");
      }
    } catch (err) {
      console.error("Error al eliminar cotización:", err);
      alert("Error de conexión al eliminar la cotización.");
    } finally {
      setEliminando(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  // Filtrado por estado
  const cotizacionesFiltradas = cotizaciones.filter((c) => {
    const st = (c.status || "PENDIENTE").toUpperCase();
    if (filtroEstado === "PENDIENTE") return st === "PENDIENTE";
    if (filtroEstado === "APROBADA") return st === "APROBADA" || st === "COMPLETADA" || st === "FACTURADA";
    if (filtroEstado === "ANULADA") return st === "ANULADA" || st === "CANCELADA";
    return true;
  });

  // KPIs
  const totalCotizado = cotizaciones
    .filter((c) => (c.status || "").toUpperCase() !== "ANULADA")
    .reduce((acc, curr) => acc + Number(curr.totalEstimated || 0), 0);

  const totalPendientes = cotizaciones.filter(
    (c) => (c.status || "PENDIENTE").toUpperCase() === "PENDIENTE"
  ).length;

  const totalAprobadas = cotizaciones.filter(
    (c) => ["APROBADA", "COMPLETADA", "FACTURADA"].includes((c.status || "").toUpperCase())
  ).length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0">
        {/* Cabecera / Navegación */}
        <div className="print:hidden flex flex-col">
          {/* Fila de Título y Botón Nueva Cotización (idéntico al estilo Facturas) */}
          <div className="order-1 mb-4 sm:mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link 
                href="/pos"
                title="Volver a Panel POS"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                Cotizaciones
              </h1>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-purple-600 text-white shadow-sm shadow-purple-500/20 shrink-0">
                {cotizaciones.length}
              </span>
              <BranchTabs onChange={() => cargarCotizaciones(searchTerm, true)} size="sm" />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/pos/venta"
                title="Crear nueva cotización desde la terminal de Venta"
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-purple-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nueva Cotización</span>
              </Link>
            </div>
          </div>

          {/* Notificaciones */}
          {mensajeExito && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
              <span>✓ {mensajeExito}</span>
              <button
                onClick={() => setMensajeExito(null)}
                className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {errorMensaje && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
              <span>⚠️ {errorMensaje}</span>
              <button
                onClick={() => setErrorMensaje(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* KPIs / Resumen Desplegable en Móvil */}
          <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
              {/* Total Cotizado */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-400 flex items-center justify-center text-xl shrink-0">
                  💰
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    ${totalCotizado.toFixed(2)}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Total Cotizado</h3>
                </div>
              </div>

              {/* Pendientes */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center text-xl shrink-0">
                  📋
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {totalPendientes}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Pendientes</h3>
                </div>
              </div>

              {/* Aprobadas */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                  ✅
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {totalAprobadas}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Aprobadas</h3>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por folio, cliente o producto..."
                className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-zinc-400 shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-48 shrink-0">
              <button
                type="button"
                onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span>
                  {filtroEstado === "PENDIENTE"
                    ? "Pendientes"
                    : filtroEstado === "APROBADA"
                    ? "Aprobadas"
                    : filtroEstado === "ANULADA"
                    ? "Anuladas"
                    : "Estado: Todas"}
                </span>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {filtroMenuAbierto && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setFiltroMenuAbierto(false)} 
                  />
                  <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {[
                      { id: "TODAS", label: "Todas" },
                      { id: "PENDIENTE", label: "Pendientes" },
                      { id: "APROBADA", label: "Aprobadas" },
                      { id: "ANULADA", label: "Anuladas" },
                    ].map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        onClick={() => {
                          setFiltroEstado(opcion.id as any);
                          setFiltroMenuAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                          filtroEstado === opcion.id
                            ? "bg-purple-50 dark:bg-purple-600/15 text-purple-600 dark:text-purple-400 font-medium"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <span>{opcion.label}</span>
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
        </div>

        {/* Lista / Tabla de Cotizaciones */}
        <div className="order-4 print:hidden">
          {cargando ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Cargando cotizaciones...
            </div>
          ) : cotizacionesFiltradas.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              No se encontraron cotizaciones con los criterios seleccionados.
            </div>
          ) : (
            <>
              {/* Vista Móvil (Tarjetas táctiles >= 44px) */}
              <div className="md:hidden space-y-3.5">
                {cotizacionesFiltradas.map((c) => {
                  const estado = (c.status || "PENDIENTE").toUpperCase();
                  const esAnulada = estado === "ANULADA";
                  const esAprobada = estado === "APROBADA" || estado === "COMPLETADA";
                  const fecha = new Date(c.createdAt).toLocaleDateString("es-EC", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
                              esAnulada
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                                : esAprobada
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30"
                            }`}
                          >
                            📋
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {c.customerName || "Consumidor Final"}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                              <span className="font-semibold text-purple-600 dark:text-purple-400">
                                #{c.requestNumber}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Estado Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            esAnulada
                              ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                              : esAprobada
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                              : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                          }`}
                        >
                          {estado}
                        </span>
                      </div>

                      {c.itemsSummary && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                          {c.itemsSummary}
                        </p>
                      )}

                      {/* Datos y Botones de Acción */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <div>
                          <span className="font-bold font-mono text-sm text-zinc-900 dark:text-white">
                            ${Number(c.totalEstimated || 0).toFixed(2)}
                          </span>
                          <span className="text-zinc-400 block text-[11px]">{fecha}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Botón Cargar en Venta (Cobrar) */}
                          {!esAnulada && (
                            <button
                              type="button"
                              onClick={() => handleCargarEnVenta(c)}
                              className="h-10 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Cobrar en POS Venta"
                            >
                              <span>🛒</span>
                              <span>Cobrar</span>
                            </button>
                          )}

                          {/* Ver Detalle / Imprimir */}
                          <button
                            type="button"
                            onClick={() => setCotizacionDetalle(c)}
                            className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-purple-600 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            title="Ver Detalle"
                          >
                            👁️
                          </button>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() =>
                              setCotizacionAEliminar({
                                id: c.id,
                                folio: c.requestNumber,
                                total: Number(c.totalEstimated || 0),
                              })
                            }
                            className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-rose-600 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista Escritorio (Tabla completa y fluida) */}
              <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3.5 px-4">Folio</th>
                        <th className="py-3.5 px-4">Cliente</th>
                        <th className="py-3.5 px-4">Resumen Artículos</th>
                        <th className="py-3.5 px-4 text-center">Estado</th>
                        <th className="py-3.5 px-4 text-right">Total</th>
                        <th className="py-3.5 px-4 text-right">Fecha</th>
                        <th className="py-3.5 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {cotizacionesFiltradas.map((c) => {
                        const estado = (c.status || "PENDIENTE").toUpperCase();
                        const esAnulada = estado === "ANULADA";
                        const esAprobada = estado === "APROBADA" || estado === "COMPLETADA";
                        const fecha = new Date(c.createdAt).toLocaleDateString("es-EC", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });

                        return (
                          <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                              #{c.requestNumber}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-zinc-900 dark:text-white block">
                                {c.customerName || "Consumidor Final"}
                              </span>
                              {c.customerPhone && (
                                <span className="text-xs text-zinc-400 block font-mono">
                                  {c.customerPhone}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 max-w-sm truncate text-xs">
                              {c.itemsSummary || "Sin descripción"}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${
                                  esAnulada
                                    ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                                    : esAprobada
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                    : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                                }`}
                              >
                                {estado}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-white font-mono whitespace-nowrap">
                              ${Number(c.totalEstimated || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-xs text-zinc-500 whitespace-nowrap">
                              {fecha}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex justify-center items-center gap-1.5">
                                {/* Cargar a Venta / Cobrar */}
                                {!esAnulada && (
                                  <button
                                    onClick={() => handleCargarEnVenta(c)}
                                    className="px-2.5 h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
                                    title="Cargar al carrito de Venta y cobrar"
                                  >
                                    <span>🛒</span>
                                    <span>Cobrar</span>
                                  </button>
                                )}

                                {/* Ver Detalle / Imprimir */}
                                <button
                                  onClick={() => setCotizacionDetalle(c)}
                                  className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                  title="Ver detalle e imprimir A4"
                                >
                                  👁️
                                </button>

                                {/* Eliminar */}
                                <button
                                  onClick={() =>
                                    setCotizacionAEliminar({
                                      id: c.id,
                                      folio: c.requestNumber,
                                      total: Number(c.totalEstimated || 0),
                                    })
                                  }
                                  className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                  title="Eliminar cotización"
                                >
                                  🗑️
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

        {/* Modal de Detalle / Cotización Formato A4 (READ & PRINT) */}
        {cotizacionDetalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto print:static print:inset-auto print:p-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible print:block print:w-full">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm 12mm 12mm 12mm;
                }
                body {
                  background: white !important;
                  color: black !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
              }
            `}} />

            <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-w-4xl w-full shadow-2xl relative my-auto flex flex-col max-h-[94vh] border border-zinc-200 dark:border-zinc-800 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:bg-white print:text-black print:rounded-none print:max-h-none print:overflow-visible">
              
              {/* Header Modal (Oculto al imprimir) */}
              <div className="flex items-center justify-between pb-3 px-2 print:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-purple-600/15 text-purple-500 flex items-center justify-center text-sm font-bold">
                    📋
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                      Cotización #{cotizacionDetalle.requestNumber}
                    </h3>
                    <p className="text-[11px] text-zinc-500">Vista previa para revisión e impresión A4</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Selector rápido de estado */}
                  <select
                    value={cotizacionDetalle.status || "PENDIENTE"}
                    onChange={(e) => handleCambiarEstado(cotizacionDetalle.id, e.target.value)}
                    disabled={cambiandoEstado}
                    className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer outline-none"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="APROBADA">APROBADA</option>
                    <option value="ANULADA">ANULADA</option>
                  </select>

                  <button
                    onClick={() => setCotizacionDetalle(null)}
                    className="w-8 h-8 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
                    title="Cerrar vista previa"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Hoja de Cotización A4 Imprimible */}
              <div className="overflow-y-auto flex-grow rounded-xl bg-white text-zinc-900 shadow-sm print:shadow-none print:overflow-visible print:h-auto">
                <div
                  ref={ticketRef}
                  className="w-full bg-white text-zinc-900 p-6 sm:p-8 font-sans print:p-0 print:m-0 text-xs"
                >
                  {/* 1. Encabezado A4 (Emisor + Recuadro Cotización) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pb-6 border-b border-zinc-200">
                    {/* Emisor */}
                    <div className="sm:col-span-7 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                          ⚙️
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-zinc-900 tracking-tight leading-tight uppercase">
                            {negocio.nombre}
                          </h2>
                          <p className="text-xs text-zinc-500 font-medium">{negocio.razonSocial}</p>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-600 pt-1 space-y-0.5">
                        <p>
                          <span className="font-semibold text-zinc-800">Dirección Matriz:</span> {negocio.direccion}
                        </p>
                        <p>
                          <span className="font-semibold text-zinc-800">Teléfono:</span> {negocio.telefono}
                        </p>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          PRESUPUESTOS Y COTIZACIONES AUTOMOTRICES
                        </p>
                      </div>
                    </div>

                    {/* Recuadro Cotización Formal */}
                    <div className="sm:col-span-5 border border-zinc-300 rounded-xl p-4 bg-zinc-50/60 print:bg-white flex flex-col justify-between space-y-2.5">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                          R.U.C.
                        </span>
                        <span className="text-sm font-bold font-mono text-zinc-900">
                          {negocio.ruc}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                            COTIZACIÓN No.
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              (cotizacionDetalle.status || "PENDIENTE").toUpperCase() === "ANULADA"
                                ? "bg-rose-100 text-rose-700 border border-rose-300"
                                : (cotizacionDetalle.status || "PENDIENTE").toUpperCase() === "APROBADA"
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                : "bg-amber-100 text-amber-700 border border-amber-300"
                            }`}
                          >
                            {(cotizacionDetalle.status || "PENDIENTE").toUpperCase()}
                          </span>
                        </div>
                        <span className="text-lg font-black font-mono text-purple-600 print:text-zinc-900 block">
                          #{cotizacionDetalle.requestNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-zinc-200">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Fecha de Emisión:</span>
                          <span className="font-medium text-zinc-800 text-[11px]">
                            {new Date(cotizacionDetalle.createdAt).toLocaleDateString("es-EC", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Hora:</span>
                          <span className="font-medium text-zinc-800 text-[11px]">
                            {new Date(cotizacionDetalle.createdAt).toLocaleTimeString("es-EC", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Datos del Cliente */}
                  <div className="my-5 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 print:bg-white grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[11px] font-medium">Cliente / Razón Social:</span>
                      <span className="font-bold text-zinc-900 text-sm">
                        {cotizacionDetalle.customerName || "Consumidor Final"}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[11px] font-medium">Teléfono / Celular:</span>
                      <span className="font-semibold text-zinc-800 font-mono">
                        {cotizacionDetalle.customerPhone || "Sin registro"}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[11px] font-medium">Correo Electrónico:</span>
                      <span className="font-medium text-zinc-700">
                        {cotizacionDetalle.customerEmail || "No especificado"}
                      </span>
                    </div>

                    {cotizacionDetalle.notes && (
                      <div className="sm:col-span-3 pt-2 border-t border-zinc-200 text-zinc-600">
                        <span className="font-medium text-zinc-800">Notas / Observaciones: </span>
                        {cotizacionDetalle.notes}
                      </div>
                    )}
                  </div>

                  {/* 3. Tabla de Artículos Cotizados */}
                  <div className="my-4 overflow-hidden rounded-xl border border-zinc-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-100 text-zinc-700 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-200">
                        <tr>
                          <th className="py-2.5 px-3 w-14 text-center">Cant.</th>
                          <th className="py-2.5 px-3">Descripción del Producto / Servicio</th>
                          <th className="py-2.5 px-3 w-28 text-right">Precio Unit.</th>
                          <th className="py-2.5 px-3 w-28 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-zinc-800">
                        {parseItems(cotizacionDetalle.itemsJson).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 px-3 text-center text-zinc-500 italic">
                              {cotizacionDetalle.itemsSummary || "Artículos sin desglose"}
                            </td>
                          </tr>
                        ) : (
                          parseItems(cotizacionDetalle.itemsJson).map((item, idx) => {
                            const pNum = Number(item.price || 0);
                            const qNum = Number(item.qty || 1);
                            const tot = Number(item.total || pNum * qNum);
                            const nombre = item.name || item.product?.name || "Artículo";
                            const codigo = item.code || item.product?.code;

                            return (
                              <tr key={idx} className="hover:bg-zinc-50/50">
                                <td className="py-2.5 px-3 text-center font-bold text-zinc-900">
                                  {qNum}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-zinc-900 block">{nombre}</span>
                                  {codigo && (
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      Código: {codigo}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-zinc-600">
                                  ${pNum.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">
                                  ${tot.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Totales y Términos */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3">
                    <div className="sm:col-span-7 text-[11px] text-zinc-500 space-y-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <p className="font-semibold text-zinc-700">Términos y Condiciones:</p>
                      <p>• Los precios cotizados están sujetos a disponibilidad de inventario.</p>
                      <p>• Validez de la cotización: 15 días a partir de la fecha de emisión.</p>
                      <p>• Este documento es un presupuesto estimativo y no constituye una factura fiscal.</p>
                    </div>

                    <div className="sm:col-span-5 border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200 text-xs">
                      {(() => {
                        const totalVal = Number(cotizacionDetalle.totalEstimated || 0);
                        const subtotalVal = totalVal / (1 + (negocio.iva || 15) / 100);
                        const ivaVal = totalVal - subtotalVal;

                        return (
                          <>
                            <div className="flex justify-between py-2 px-3.5 bg-zinc-50/50">
                              <span className="text-zinc-600 font-medium">SUBTOTAL:</span>
                              <span className="font-mono font-semibold text-zinc-900">
                                ${subtotalVal.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 px-3.5 bg-zinc-50/50">
                              <span className="text-zinc-600 font-medium">IVA ({negocio.iva}%):</span>
                              <span className="font-mono font-semibold text-zinc-900">
                                ${ivaVal.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between py-2.5 px-3.5 bg-zinc-100 font-bold text-sm">
                              <span className="text-zinc-900">VALOR TOTAL:</span>
                              <span className="font-mono text-base text-purple-600 print:text-zinc-900">
                                ${totalVal.toFixed(2)}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 5. Pie de Página A4 */}
                  <div className="mt-8 pt-3 border-t border-zinc-200 text-center text-[10px] text-zinc-400">
                    Documento generado electrónicamente • Sistema AutoG POS • Formato A4
                  </div>
                </div>
              </div>

              {/* Botones de acción del Modal (Ocultos al imprimir) */}
              <div className="flex flex-wrap items-center gap-3 pt-3 px-1 print:hidden">
                {/* Botón Cargar a Venta (Cobrar en POS) */}
                <button
                  type="button"
                  onClick={() => handleCargarEnVenta(cotizacionDetalle)}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🛒</span>
                  <span>Cobrar en POS Venta</span>
                </button>

                <button
                  type="button"
                  onClick={handleImprimir}
                  className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🖨️</span>
                  <span>Imprimir Cotización A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCotizacionDetalle(null)}
                  className="px-5 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 font-semibold text-xs cursor-pointer flex items-center justify-center transition-colors"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        {cotizacionAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  ¿Eliminar Cotización?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Se eliminará definitivamente la cotización{" "}
                  <span className="font-mono font-bold text-purple-600">
                    #{cotizacionAEliminar.folio}
                  </span>{" "}
                  por un valor de{" "}
                  <span className="font-bold text-zinc-900 dark:text-white">
                    ${cotizacionAEliminar.total.toFixed(2)}
                  </span>.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCotizacionAEliminar(null)}
                  disabled={eliminando}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEliminar}
                  disabled={eliminando}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {eliminando ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Eliminar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="print:hidden">
        <PosMobileNav />
      </div>
    </div>
  );
}
