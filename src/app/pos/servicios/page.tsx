"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

interface WorkshopService {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number | string;
  estimatedMinutes: number;
  description?: string | null;
  requiresBay: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ServiciosPosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<WorkshopService[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODAS");
  const [selectedEstado, setSelectedEstado] = useState("TODOS");
  const [catMenuAbierto, setCatMenuAbierto] = useState(false);
  const [estadoMenuAbierto, setEstadoMenuAbierto] = useState(false);

  // Modales
  const [servicioAEliminar, setServicioAEliminar] = useState<WorkshopService | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargarServicios = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "TODAS") {
        params.set("categoria", selectedCategory);
      }
      if (searchTerm) {
        params.set("busqueda", searchTerm);
      }
      params.set("activos", "false");

      const res = await fetch(`/api/servicios-taller?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo conectar con el servidor. Reintentando...");
        return;
      }

      setServicios(data.servicios || []);
      if (data.categories) {
        setCategories(data.categories);
      }
      if (data.warning) {
        setWarningMessage(data.warning);
      } else {
        setWarningMessage(null);
      }
    } catch (err: any) {
      console.warn("Fallo en fetch a servicios:", err);
      setError("Reconectando con la base de datos...");
    } finally {
      setCargando(false);
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    cargarServicios();
  }, [cargarServicios]);

  const handleEliminar = async () => {
    if (!servicioAEliminar) return;

    try {
      setEliminando(true);
      const res = await fetch(`/api/servicios-taller?id=${servicioAEliminar.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar el servicio");
      }

      setServicioAEliminar(null);
      cargarServicios();
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setEliminando(false);
    }
  };

  // Filtrado local por Estado
  const serviciosFiltrados = servicios.filter((s) => {
    if (selectedEstado === "ACTIVOS") return s.active;
    if (selectedEstado === "PAUSADOS") return !s.active;
    return true;
  });

  // Métricas
  const totalActivos = servicios.filter((s) => s.active).length;
  const promedioMinutos =
    servicios.length > 0
      ? Math.round(
          servicios.reduce((acc, curr) => acc + (curr.estimatedMinutes || 0), 0) /
            servicios.length
        )
      : 0;
  const bahiaCount = servicios.filter((s) => s.requiresBay).length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link 
                href="/pos"
                title="Volver a POS"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Servicios
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                {cargando ? "..." : serviciosFiltrados.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/pos/servicios/nuevo"
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>+</span> Nuevo Servicio
            </Link>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center text-xl shrink-0">
              ⚙️
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando ? "..." : servicios.length}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Totales</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-xl shrink-0">
              ✅
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {cargando ? "..." : totalActivos}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Activos</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center text-xl shrink-0">
              ⏱️
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {cargando ? "..." : `${promedioMinutos} min`}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Promedio</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-400 flex items-center justify-center text-xl shrink-0">
              🚗
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                {cargando ? "..." : bahiaCount}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Bahía</h3>
            </div>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm"
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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Filtro Categorías */}
            <div className="relative w-full sm:w-44 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCatMenuAbierto(!catMenuAbierto);
                  setEstadoMenuAbierto(false);
                }}
                className="w-full h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-medium flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span className="truncate">{selectedCategory === "TODAS" ? "Categorías" : selectedCategory}</span>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ml-1.5 ${catMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {catMenuAbierto && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setCatMenuAbierto(false)} 
                  />
                  <div className="absolute right-0 mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("TODAS");
                        setCatMenuAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCategory === "TODAS"
                          ? "bg-blue-600/15 text-blue-400"
                          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                      }`}
                    >
                      <span>Categorías</span>
                      {selectedCategory === "TODAS" && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCatMenuAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-blue-600/15 text-blue-400"
                            : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {selectedCategory === cat && (
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

            {/* Filtro Estado */}
            <div className="relative w-full sm:w-40 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEstadoMenuAbierto(!estadoMenuAbierto);
                  setCatMenuAbierto(false);
                }}
                className="w-full h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-medium flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span>
                  {selectedEstado === "ACTIVOS"
                    ? "Activos"
                    : selectedEstado === "PAUSADOS"
                    ? "Pausados"
                    : "Estado"}
                </span>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ml-1.5 ${estadoMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {estadoMenuAbierto && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setEstadoMenuAbierto(false)} 
                  />
                  <div className="absolute right-0 mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {[
                      { id: "TODOS", label: "Estado" },
                      { id: "ACTIVOS", label: "Activos" },
                      { id: "PAUSADOS", label: "Pausados" },
                    ].map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        onClick={() => {
                          setSelectedEstado(opcion.id);
                          setEstadoMenuAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          selectedEstado === opcion.id
                            ? "bg-blue-600/15 text-blue-400"
                            : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                        }`}
                      >
                        <span>{opcion.label}</span>
                        {selectedEstado === opcion.id && (
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
        </div>

        {/* Lista de Servicios en Grid */}
        {cargando ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <div className="animate-spin text-4xl mb-3">⚙️</div>
            <p className="text-zinc-500 font-medium">Cargando servicios...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-center">
            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
            <button
              onClick={cargarServicios}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold"
            >
              Reintentar
            </button>
          </div>
        ) : serviciosFiltrados.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center">
            <span className="text-5xl mb-4">🛠️</span>
            <Link
              href="/pos/servicios/nuevo"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
            >
              <span>+</span> Crear Nuevo Servicio
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            {/* Mobile Cards (md:hidden) */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {serviciosFiltrados.map((s) => (
                <div
                  key={s.id}
                  className={`p-4 space-y-3 ${
                    !s.active ? "opacity-60 bg-zinc-50/50 dark:bg-zinc-950/50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700">
                          {s.code}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.active
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {s.active ? "Activo" : "Pausado"}
                        </span>
                      </div>
                      <div className="font-bold text-zinc-900 dark:text-white text-base">
                        {s.name}
                      </div>
                      {s.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-zinc-900 dark:text-white block">
                        ${Number(s.price).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-400">Tarifa</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800/40">
                      {s.category}
                    </span>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                      <span>⏱️ {s.estimatedMinutes} min</span>
                      <span>•</span>
                      <span>{s.requiresBay ? "🚗 Bahía" : "🧰 Mano de Obra"}</span>
                    </div>
                  </div>

                  {/* Botones de acción móvil (Touch target >= 44px) */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                    <Link
                      href={`/pos/servicios/editar?id=${s.id}`}
                      className="h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      <span>✏️</span> Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setServicioAEliminar(s)}
                      className="h-11 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <span>🗑️</span> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Servicio
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Categoría
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Tiempo / Bahía
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Tarifa
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-xs font-medium text-zinc-600 dark:text-zinc-400 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {serviciosFiltrados.map((s) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors group ${
                        !s.active ? "opacity-60 bg-zinc-50/50 dark:bg-zinc-950/50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700">
                            {s.code}
                          </span>
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {s.name}
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-md">
                            {s.description}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800/40">
                          {s.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-zinc-500">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                            ⏱️ {s.estimatedMinutes} min
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {s.requiresBay ? "🚗 Elevador/Bahía" : "🧰 Mano de Obra"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-lg font-black text-zinc-900 dark:text-white">
                          ${Number(s.price).toFixed(2)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            s.active
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {s.active ? "Activo" : "Pausado"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/pos/servicios/editar?id=${s.id}`}
                            className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium text-xs transition-all active:scale-95 inline-flex items-center gap-1.5 shadow-sm"
                            title="Editar servicio"
                          >
                            <span>✏️</span>
                            <span>Editar</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => setServicioAEliminar(s)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium text-xs transition-all active:scale-95 inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title="Eliminar servicio"
                          >
                            <span>🗑️</span>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
              <span>Mostrando {servicios.length} {servicios.length === 1 ? "servicio" : "servicios"}</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Catálogo de Servicios de Taller</span>
            </div>
          </div>
        )}
      </main>

      {/* Modal Flotante de Confirmación de Eliminación */}
      {servicioAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-xl mx-auto mb-3">
              🗑️
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
              ¿Eliminar servicio?
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              Se eliminará <strong className="text-zinc-900 dark:text-white font-medium">{servicioAEliminar.name}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setServicioAEliminar(null)}
                disabled={eliminando}
                className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={eliminando}
                className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-rose-500/20"
              >
                {eliminando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PosMobileNav />
    </div>
  );
}
