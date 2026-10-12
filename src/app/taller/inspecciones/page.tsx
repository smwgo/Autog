"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

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
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link
            href="/taller"
            className="text-sm font-medium text-amber-600 hover:text-amber-500 flex items-center gap-1 w-fit"
          >
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl">
                📋
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Inspecciones</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {inspections.length} {inspections.length === 1 ? "inspección registrada" : "inspecciones registradas"}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/taller/inspecciones/nueva"
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Nueva Inspección
          </Link>
        </div>

        {/* Filters / Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Buscar por placa, vehículo, cliente o ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3 text-zinc-400">🔍</span>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white text-sm font-medium cursor-pointer"
            >
              <option value="">Estado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Progreso">En Progreso</option>
              <option value="Completado">Completado</option>
            </select>
          </div>
        </div>

        {/* Loading Indicator */}
        {cargando && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-medium text-zinc-500">Cargando inspecciones...</p>
          </div>
        )}

        {/* Inspections Table / List */}
        {!cargando && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Inspección & Vehículo
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Combustible / Km
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {inspections.map((insp) => (
                    <tr
                      key={insp.dbId || insp.id}
                      className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {insp.id}
                          </span>
                          <span className="text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-800 dark:text-zinc-200">
                            {insp.plate}
                          </span>
                        </div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm">
                          {insp.vehicle}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900 dark:text-white text-sm">
                          {insp.client}
                        </div>
                        {insp.date && (
                          <div className="text-xs text-zinc-400">{insp.date}</div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {insp.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200 mb-0.5">
                          <span>⛽</span> {insp.fuelLevel || "N/A"}
                        </div>
                        {insp.mileage && (
                          <div className="text-[11px] text-zinc-400">
                            {insp.mileage}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2 pt-6">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs">
                          👤
                        </div>
                        <span className="text-xs font-medium">{insp.assignedTo}</span>
                      </td>

                      <td className="px-6 py-4">
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

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEliminar(insp.dbId || insp.id, insp.id)}
                            disabled={eliminandoId === insp.id || eliminandoId === insp.dbId}
                            title="Eliminar inspección"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-xs"
                          >
                            ✕
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
      </main>
    </div>
  );
}
