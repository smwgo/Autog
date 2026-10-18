"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface InspectionItem {
  id: string;
  dbId: string;
  vehicle: string;
  plate: string;
  client: string;
  type: string;
  status: string;
  assignedTo: string;
  date: string;
  fuelLevel?: string;
  mileage?: string;
  checklist?: Record<string, string>;
  notes?: string;
  color: string;
}

const STATUS_OPTIONS = [
  { label: "Pendiente", value: "Pendiente", color: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { label: "En Progreso", value: "En Progreso", color: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/10" },
  { label: "Completado", value: "Completado", color: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
];

export default function InspeccionesPage() {
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [detalleInsp, setDetalleInsp] = useState<InspectionItem | null>(null);

  const cargarInspecciones = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filterStatus) params.set("estado", filterStatus);
      if (searchTerm.trim()) params.set("busqueda", searchTerm.trim());

      const res = await fetch(`/api/taller/inspecciones?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (data.success && Array.isArray(data.inspections)) {
        setInspections(data.inspections);
      }
    } catch (err) {
      console.error("Error al cargar inspecciones:", err);
    } finally {
      setCargando(false);
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    cargarInspecciones();
  }, [cargarInspecciones]);

  const handleCambiarEstado = async (inspId: string, nuevoEstado: string) => {
    try {
      setGuardandoId(inspId);

      const res = await fetch("/api/taller/inspecciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: inspId,
          status: nuevoEstado,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al actualizar estado");
      }

      setInspections((prev) =>
        prev.map((item) => {
          if (item.id === inspId || item.dbId === inspId) {
            let color = "bg-amber-500";
            if (nuevoEstado === "En Progreso") color = "bg-blue-500";
            if (nuevoEstado === "Completado") color = "bg-emerald-500";
            return { ...item, status: nuevoEstado, color };
          }
          return item;
        })
      );
    } catch (err: any) {
      console.error("Error al cambiar estado:", err);
      alert(err.message || "No se pudo actualizar el estado.");
    } finally {
      setGuardandoId(null);
    }
  };

  const handleEliminar = async (inspId: string, inspNumber: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la inspección ${inspNumber}?`)) {
      return;
    }

    try {
      setEliminandoId(inspId);
      const res = await fetch(`/api/taller/inspecciones?id=${encodeURIComponent(inspId)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar inspección");
      }

      setInspections((prev) => prev.filter((i) => i.id !== inspId && i.dbId !== inspId));
    } catch (err: any) {
      console.error("Error al eliminar inspección:", err);
      alert(err.message || "No se pudo eliminar la inspección.");
    } finally {
      setEliminandoId(null);
    }
  };

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
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Inspecciones
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm shadow-amber-500/20">
              {cargando ? "..." : inspections.length}
            </span>
          </div>

          <Link
            href="/taller/inspecciones/nueva"
            className="h-11 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-5 rounded-xl font-bold text-sm transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer w-fit"
          >
            <span>+</span> Nueva Inspección
          </Link>
        </div>

        {/* Resumen Cards Desplegable en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 flex items-center justify-center text-xl shrink-0">
                📋
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{cargando ? "..." : inspections.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Totales</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 text-orange-500 flex items-center justify-center text-xl shrink-0">
                ⏳
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {cargando ? "..." : inspections.filter(i => i.status === "Pendiente").length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Pendientes</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 flex items-center justify-center text-xl shrink-0">
                ⚙️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {cargando ? "..." : inspections.filter(i => i.status === "En Progreso").length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">En Progreso</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                ✅
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {cargando ? "..." : inspections.filter(i => i.status === "Completado").length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Completadas</h3>
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
              placeholder="Buscar por placa, vehículo, cliente o ID..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-zinc-400 shadow-sm"
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
                {filterStatus ? filterStatus : "Estado"}
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
                    { id: "Pendiente", label: "Pendiente" },
                    { id: "En Progreso", label: "En Progreso" },
                    { id: "Completado", label: "Completado" },
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
                          ? "bg-amber-50 dark:bg-amber-600/15 text-amber-600 dark:text-amber-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opcion.label}</span>
                      {filterStatus === opcion.id && (
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Contenido de Inspecciones */}
        <div className="order-4">
        {/* Loading Indicator */}
        {cargando && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-medium text-zinc-500">Cargando inspecciones...</p>
          </div>
        )}

        {/* Inspections Mobile Cards View (md:hidden) adaptada a facturas */}
        {!cargando && (
          <div className="md:hidden space-y-3.5">
            {inspections.map((insp) => (
              <div
                key={insp.dbId || insp.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Fila Principal Superior: Icono, Vehículo/Cliente y Botones Rápidos */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                      📋
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {insp.vehicle}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">#{insp.id}</span>
                        <span> • {insp.plate}</span>
                        <span> • {insp.client}</span>
                      </p>
                    </div>
                  </div>

                  {/* Acciones Rápidas (Toque táctil >= 44px) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDetalleInsp(insp)}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-amber-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 active:scale-95 transition-all cursor-pointer"
                      title="Ver Checklist"
                      aria-label="Ver Checklist"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(insp.dbId || insp.id, insp.id)}
                      disabled={eliminandoId === insp.id || eliminandoId === insp.dbId}
                      title="Eliminar inspección"
                      aria-label="Eliminar inspección"
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Selector de Estado */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-zinc-500 font-medium shrink-0">Estado:</span>
                  <select
                    disabled={guardandoId === insp.id || guardandoId === insp.dbId}
                    value={insp.status}
                    onChange={(e) => handleCambiarEstado(insp.dbId || insp.id, e.target.value)}
                    className={`h-10 text-xs font-bold px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer flex-1 ${
                      guardandoId === insp.id || guardandoId === insp.dbId ? "opacity-50" : ""
                    }`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Datos secundarios (Tipo, Combustible, Responsable, Fecha) */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {insp.type}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 font-medium text-xs">
                    ⛽ {insp.fuelLevel || "N/A"}
                  </span>
                  {insp.mileage && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 font-mono text-xs">
                      {insp.mileage}
                    </span>
                  )}
                  <span className="text-zinc-400 ml-auto text-[11px] whitespace-nowrap">
                    👤 {insp.assignedTo}
                  </span>
                </div>
              </div>
            ))}

            {inspections.length === 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center shadow-sm">
                <span className="text-4xl mb-3 block">📋</span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                  No se encontraron inspecciones
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                  Intenta con otros términos o registra una nueva inspección.
                </p>
                <Link
                  href="/taller/inspecciones/nueva"
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all shadow-sm"
                >
                  <span>+</span> Crear Primera Inspección
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Inspections Desktop Table (hidden md:block) */}
        {!cargando && (
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Inspección & Vehículo</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Combustible / Km</th>
                    <th className="py-3.5 px-4">Responsable</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {inspections.map((insp) => (
                    <tr
                      key={insp.dbId || insp.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            #{insp.id}
                          </span>
                          <span className="text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-800 dark:text-zinc-200">
                            {insp.plate}
                          </span>
                        </div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm">
                          {insp.vehicle}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-white text-sm">
                          {insp.client}
                        </div>
                        {insp.date && (
                          <div className="text-xs text-zinc-400">{insp.date}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {insp.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200 mb-0.5">
                          <span>⛽</span> {insp.fuelLevel || "N/A"}
                        </div>
                        {insp.mileage && (
                          <div className="text-[11px] text-zinc-400">
                            {insp.mileage}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs">
                            👤
                          </div>
                          <span className="text-xs font-medium">{insp.assignedTo}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          disabled={guardandoId === insp.id || guardandoId === insp.dbId}
                          value={insp.status}
                          onChange={(e) => handleCambiarEstado(insp.dbId || insp.id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                            guardandoId === insp.id || guardandoId === insp.dbId ? "opacity-50" : ""
                          }`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetalleInsp(insp)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all active:scale-95 cursor-pointer shadow-xs"
                          >
                            Ver Checklist
                          </button>

                          <button
                            onClick={() => handleEliminar(insp.dbId || insp.id, insp.id)}
                            disabled={eliminandoId === insp.id || eliminandoId === insp.dbId}
                            title="Eliminar inspección"
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

                  {inspections.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <span className="text-4xl mb-3 block">📋</span>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                          No se encontraron inspecciones
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                          Intenta con otros términos o registra una nueva inspección.
                        </p>
                        <Link
                          href="/taller/inspecciones/nueva"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all"
                        >
                          <span>+</span> Crear Primera Inspección
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
              <span>Mostrando {inspections.length} {inspections.length === 1 ? "inspección" : "inspecciones"}</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Inspecciones de Taller</span>
            </div>
          </div>
        )}
        </div>

        {/* Modal Checklist Detalle (Bottom-sheet on small screens) */}
        {detalleInsp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 pb-8 sm:pb-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {detalleInsp.id} • {detalleInsp.plate}
                  </span>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {detalleInsp.vehicle} — Checklist Técnico
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetalleInsp(null)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-zinc-400 block">Cliente:</span>
                  <strong className="text-zinc-900 dark:text-white">{detalleInsp.client}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Combustible / Km:</span>
                  <strong className="text-zinc-900 dark:text-white">
                    ⛽ {detalleInsp.fuelLevel || "N/A"} • {detalleInsp.mileage || "S/N"}
                  </strong>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-zinc-500 mb-2">Puntos Evaluados</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(detalleInsp.checklist || {}).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs"
                    >
                      <span className="capitalize font-medium text-zinc-700 dark:text-zinc-300">
                        {key}
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          val === "OK"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : val === "Dañado"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                        }`}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {detalleInsp.notes && (
                <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl">
                  <strong>Observaciones:</strong> {detalleInsp.notes}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDetalleInsp(null)}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-bold cursor-pointer flex items-center justify-center"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <TallerMobileNav />
    </div>
  );
}
