"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface OrderItem {
  id: string;
  dbId: string;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone?: string;
  mechanic: string;
  status: string;
  progress: number;
  dateIn: string;
  estimatedOut: string;
  color: string;
  services: string[];
  notes?: string;
  totalCost?: number;
}

const STATUS_OPTIONS = [
  { label: "En Diagnóstico", value: "En Diagnóstico", color: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { label: "Reparando", value: "Reparando", color: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/10" },
  { label: "Espera de Repuestos", value: "Espera de Repuestos", color: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-500/10" },
  { label: "Listo para Entregar", value: "Listo para Entregar", color: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  { label: "Finalizado", value: "Finalizado", color: "bg-purple-500", text: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-500/10" },
];

function esOrdenEnHistorial(ord: OrderItem): boolean {
  const st = (ord.status || "").trim().toLowerCase();
  return (
    st === "finalizado" ||
    st === "terminado" ||
    st === "entregado" ||
    st === "entregada" ||
    st === "05 entregada" ||
    st === "historial"
  );
}

export default function ActiveOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState<"ACTIVAS" | "HISTORIAL">("ACTIVAS");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("seccion") === "historial") {
        setSeccionActiva("HISTORIAL");
      }
    }
  }, []);

  // Cargar órdenes en tiempo real desde la base de datos
  const cargarOrdenes = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set("estado", filterStatus);
      if (searchTerm.trim()) params.set("busqueda", searchTerm.trim());

      const res = await fetch(`/api/taller/ordenes?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
    } finally {
      setCargando(false);
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  // Actualizar estado de una orden (CRUD - Update)
  const handleCambiarEstado = async (orderId: string, nuevoEstado: string) => {
    try {
      setGuardandoId(orderId);

      // Calcular nuevo progreso aproximado según estado
      let nuevoProgreso = 25;
      if (nuevoEstado === "Reparando") nuevoProgreso = 60;
      if (nuevoEstado === "Espera de Repuestos") nuevoProgreso = 40;
      if (nuevoEstado === "Listo para Entregar") nuevoProgreso = 100;

      const res = await fetch("/api/taller/ordenes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: nuevoEstado,
          progress: nuevoProgreso,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al actualizar estado");
      }

      // Actualizar estado local inmediato
      setOrders(prev =>
        prev.map(ord => {
          if (ord.id === orderId || ord.dbId === orderId) {
            let color = "bg-blue-500";
            if (nuevoEstado.includes("Diagnóstico")) color = "bg-amber-500";
            if (nuevoEstado.includes("Reparando")) color = "bg-blue-500";
            if (nuevoEstado.includes("Repuestos")) color = "bg-rose-500";
            if (nuevoEstado.includes("Listo")) color = "bg-emerald-500";

            return {
              ...ord,
              status: nuevoEstado,
              progress: nuevoProgreso,
              color,
            };
          }
          return ord;
        })
      );
    } catch (err: any) {
      console.error("Error al cambiar estado:", err);
      alert(err.message || "No se pudo actualizar el estado.");
    } finally {
      setGuardandoId(null);
    }
  };

  // Eliminar orden (CRUD - Delete)
  const handleEliminarOrden = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la orden ${orderNumber}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setEliminandoId(orderId);
      const res = await fetch(`/api/taller/ordenes?id=${encodeURIComponent(orderId)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar orden");
      }

      setOrders(prev => prev.filter(ord => ord.id !== orderId && ord.dbId !== orderId));
    } catch (err: any) {
      console.error("Error al eliminar orden:", err);
      alert(err.message || "No se pudo eliminar la orden.");
    } finally {
      setEliminandoId(null);
    }
  };

  const ordenesActivasList = orders.filter((o) => !esOrdenEnHistorial(o));
  const ordenesHistorialList = orders.filter((o) => esOrdenEnHistorial(o));
  const ordenesMostradas = seccionActiva === "HISTORIAL" ? ordenesHistorialList : ordenesActivasList;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col">
        {/* Navigation / Breadcrumb */}
        <div className="order-1 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/taller"
              title="Volver al Panel de Taller"
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {seccionActiva === "HISTORIAL" ? "Historial de Órdenes" : "Órdenes"}
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              {cargando ? "..." : ordenesMostradas.length}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de Sección: Órdenes Activas vs Historial de Órdenes */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/60 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSeccionActiva("ACTIVAS")}
                className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  seccionActiva === "ACTIVAS"
                    ? "bg-blue-500/15 border border-blue-500/35 text-blue-600 dark:text-blue-300"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <span>🔧</span>
                <span>Activas ({cargando ? "..." : ordenesActivasList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSeccionActiva("HISTORIAL")}
                className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  seccionActiva === "HISTORIAL"
                    ? "bg-purple-500/15 border border-purple-500/35 text-purple-600 dark:text-purple-300"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <span>📋</span>
                <span>Historial de Órdenes ({cargando ? "..." : ordenesHistorialList.length})</span>
              </button>
            </div>

            <Link
              href="/pos/servicios"
              className="h-11 px-4 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-sm font-semibold hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center gap-2"
            >
              <span>⚙️</span> Servicios
            </Link>

            <Link
              href="/taller/ordenes/nueva"
              className="h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2"
            >
              <span>+</span> Nueva Orden
            </Link>
          </div>
        </div>

        {/* Resumen Cards Desplegable en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 flex items-center justify-center text-xl shrink-0">
                🚗
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{cargando ? "..." : orders.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Totales</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 flex items-center justify-center text-xl shrink-0">
                🔍
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {cargando ? "..." : orders.filter(o => o.status.toLowerCase().includes("diagnóstico") || o.status.toLowerCase().includes("diagnostico")).length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Diagnóstico</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-500 flex items-center justify-center text-xl shrink-0">
                ⚙️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {cargando ? "..." : orders.filter(o => o.status.toLowerCase().includes("reparando")).length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Reparación</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                ✅
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {cargando ? "..." : orders.filter(o => o.status.toLowerCase().includes("listo")).length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Listos</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Buscador y Filtros */}
        <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">🔍</span>
            <input
              type="text"
              placeholder="Buscar por placa, cliente o vehículo..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                {filterStatus === "diagnóstico"
                  ? "En Diagnóstico"
                  : filterStatus === "reparando"
                  ? "Reparando"
                  : filterStatus === "espera"
                  ? "En Espera"
                  : filterStatus === "listo"
                  ? "Listo"
                  : "Estado"}
              </span>
              <svg className={`w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMenuAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltroMenuAbierto(false)} />
                <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "", label: "Estado" },
                    { id: "diagnóstico", label: "En Diagnóstico" },
                    { id: "reparando", label: "Reparando" },
                    { id: "espera", label: "En Espera" },
                    { id: "listo", label: "Listo" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setFilterStatus(opcion.id);
                        setFiltroMenuAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        filterStatus === opcion.id
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opcion.label}</span>
                      {filterStatus === opcion.id && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Contenido de Órdenes */}
        <div className="order-4">
        {/* Loading Indicator */}
        {cargando && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-medium text-zinc-500">Cargando órdenes...</p>
          </div>
        )}

        {/* Orders Mobile Card View (md:hidden) adaptada al diseño de facturas */}
        {!cargando && (
          <div className="md:hidden space-y-3.5">
            {ordenesMostradas.map((order) => (
              <div
                key={order.dbId || order.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Fila Principal Superior: Icono, Vehículo/Cliente y Botón Acción */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30">
                      🚗
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {order.vehicle}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">#{order.id}</span>
                        <span> • {order.plate}</span>
                        <span> • {order.client}</span>
                      </p>
                    </div>
                  </div>

                  {/* Botón táctil eliminar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEliminarOrden(order.dbId || order.id, order.id)}
                      disabled={eliminandoId === order.id || eliminandoId === order.dbId}
                      title="Eliminar orden"
                      aria-label="Eliminar orden"
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Selector de Estado y Progreso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-medium shrink-0">Estado:</span>
                    <select
                      disabled={guardandoId === order.id || guardandoId === order.dbId}
                      value={order.status}
                      onChange={(e) => handleCambiarEstado(order.dbId || order.id, e.target.value)}
                      className={`h-10 text-xs font-bold px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex-1 ${
                        guardandoId === order.id || guardandoId === order.dbId ? "opacity-50" : ""
                      }`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barra de Avance */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-500 font-normal">Avance</span>
                      <span className="text-zinc-900 dark:text-white font-bold">{order.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${order.color} transition-all duration-500`}
                        style={{ width: `${order.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Servicios */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {order.services && order.services.length > 0 ? (
                    order.services.map((srv, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40 font-medium"
                      >
                        ⚙️ {srv}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400 italic">Revisión General</span>
                  )}
                </div>

                {/* Datos secundarios (Mecánico, Fechas y Botón Cobrar POS) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
                    <span>👨‍🔧</span> {order.mechanic}
                  </div>
                  <span className="text-zinc-400 text-[11px] ml-auto">
                    {order.dateIn} &rarr; {order.estimatedOut}
                  </span>
                </div>

                <Link
                  href={`/pos/venta?placa=${encodeURIComponent(order.plate)}`}
                  className="w-full h-11 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98 shadow-xs"
                  title="Cobrar en Mostrador POS"
                >
                  <span>🛒</span> Cobrar en POS
                </Link>
              </div>
            ))}

            {ordenesMostradas.length === 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center shadow-sm">
                <span className="text-4xl mb-3 block">🔍</span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                  {seccionActiva === "HISTORIAL" ? "No hay órdenes en el historial" : "No se encontraron órdenes activas"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                  Intenta con otros términos o registra una nueva orden.
                </p>
                <Link
                  href="/taller/ordenes/nueva"
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-semibold text-xs transition-all"
                >
                  <span>+</span> Crear Primera Orden
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Orders Desktop Table (hidden md:block) */}
        {!cargando && (
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Orden & Vehículo</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Servicios</th>
                    <th className="py-3.5 px-4">Mecánico / Fechas</th>
                    <th className="py-3.5 px-4">Progreso</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {ordenesMostradas.map((order) => (
                    <tr
                      key={order.dbId || order.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Orden & Vehículo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            #{order.id}
                          </span>
                          <span className="text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-800 dark:text-zinc-200">
                            {order.plate}
                          </span>
                        </div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm">
                          {order.vehicle}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-white text-sm">
                          {order.client}
                        </div>
                        {order.clientPhone && (
                          <div className="text-xs text-zinc-400">{order.clientPhone}</div>
                        )}
                      </td>

                      {/* Servicios */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {order.services && order.services.length > 0 ? (
                            order.services.map((srv, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800/40 font-medium"
                              >
                                ⚙️ {srv}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-400 italic">Revisión General</span>
                          )}
                        </div>
                      </td>

                      {/* Mecánico / Fechas */}
                      <td className="py-3.5 px-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200 mb-0.5">
                          <span>👨‍🔧</span> {order.mechanic}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {order.dateIn} &rarr; {order.estimatedOut}
                        </div>
                      </td>

                      {/* Progreso */}
                      <td className="py-3.5 px-4">
                        <div className="w-28">
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span className="text-zinc-500 font-normal">Taller</span>
                            <span className="text-zinc-900 dark:text-white font-bold">{order.progress}%</span>
                          </div>
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${order.color} transition-all duration-500`}
                              style={{ width: `${order.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        <select
                          disabled={guardandoId === order.id || guardandoId === order.dbId}
                          value={order.status}
                          onChange={(e) => handleCambiarEstado(order.dbId || order.id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                            guardandoId === order.id || guardandoId === order.dbId ? "opacity-50" : ""
                          }`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/pos/venta?placa=${encodeURIComponent(order.plate)}`}
                            className="bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 active:scale-95"
                            title="Cobrar en Mostrador POS"
                          >
                            <span>🛒</span> Cobrar
                          </Link>

                          <button
                            onClick={() => handleEliminarOrden(order.dbId || order.id, order.id)}
                            disabled={eliminandoId === order.id || eliminandoId === order.dbId}
                            title="Eliminar orden"
                            className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all flex items-center justify-center text-xs active:scale-95 cursor-pointer shadow-xs"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {ordenesMostradas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <span className="text-4xl mb-3 block">🔍</span>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                          {seccionActiva === "HISTORIAL" ? "No hay órdenes en el historial" : "No se encontraron órdenes activas"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                          Intenta con otros términos o registra una nueva orden.
                        </p>
                        <Link
                          href="/taller/ordenes/nueva"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all"
                        >
                          <span>+</span> Crear Primera Orden
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
              <span>Mostrando {ordenesMostradas.length} {ordenesMostradas.length === 1 ? "orden" : "órdenes"}</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {seccionActiva === "HISTORIAL" ? "Historial de Órdenes" : "Órdenes de Taller"}
              </span>
            </div>
          </div>
        )}
        </div>
      </main>

      <TallerMobileNav />
    </div>
  );
}
