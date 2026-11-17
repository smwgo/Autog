"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { parsearModulos } from "@/components/pos/SelectorModulos";
import { BranchTabs } from "@/components/pos/BranchTabs";

interface WorkshopService {
  id: string;
  code: string;
  name: string;
  category: string;
  tipo?: string | null;
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
  const [filtroMovilAbierto, setFiltroMovilAbierto] = useState(false);
  const [mostrarMetricasMovil, setMostrarMetricasMovil] = useState(false);

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
        setCategories(Array.from(new Set(data.categories)));
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

  const hayFiltroActivo = selectedCategory !== "TODAS" || selectedEstado !== "TODOS";

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-0">
      <Header />

      <main className="flex-grow px-3.5 py-4 sm:p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header - Móvil y Escritorio en una sola fila */}
        <div className="order-1 mb-3 sm:mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link 
              href="/pos"
              title="Volver a POS"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              Servicios
            </h1>
            <span className="inline-flex items-center justify-center px-2 min-w-6 h-6 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20 shrink-0">
              {cargando ? "..." : serviciosFiltrados.length}
            </span>
          </div>

          <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0 ml-auto">
            <BranchTabs size="sm" />
            <Link
              href="/pos/servicios/nuevo"
              title="Nuevo Servicio"
              aria-label="Nuevo Servicio"
              className="h-9 w-9 sm:w-auto sm:h-10 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nuevo Servicio</span>
            </Link>
          </div>
        </div>

        {/* Métricas: 4 recuadros pequeños en fila en móvil (ocultas por defecto), visibles en escritorio */}
        <div className={`order-3 sm:order-2 mb-3 sm:mb-8 ${mostrarMetricasMovil ? "block" : "hidden"} sm:block`}>
          <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {[
              { icono: "⚙️", valor: servicios.length, label: "Totales", cls: "bg-blue-500/15 border-blue-500/25 text-blue-500 dark:text-blue-400", valCls: "text-zinc-900 dark:text-white" },
              { icono: "✅", valor: totalActivos, label: "Activos", cls: "bg-emerald-500/15 border-emerald-500/25 text-emerald-500 dark:text-emerald-400", valCls: "text-emerald-600 dark:text-emerald-400" },
              { icono: "⏱️", valor: `${promedioMinutos}m`, label: "Promedio", cls: "bg-amber-500/15 border-amber-500/25 text-amber-500 dark:text-amber-400", valCls: "text-amber-600 dark:text-amber-400" },
              { icono: "🚗", valor: bahiaCount, label: "Bahía", cls: "bg-purple-500/15 border-purple-500/25 text-purple-500 dark:text-purple-400", valCls: "text-purple-600 dark:text-purple-400" },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white dark:bg-zinc-900/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 text-center sm:text-left"
              >
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center text-base sm:text-xl shrink-0 ${m.cls}`}>
                  {m.icono}
                </div>
                <div className="min-w-0">
                  <p className={`text-lg sm:text-2xl font-bold leading-tight tabular-nums ${m.valCls}`}>
                    {cargando ? "..." : m.valor}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm font-medium truncate">{m.label}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buscador y Filtros en una sola fila */}
        <div className="order-2 sm:order-3 flex flex-row items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
          <div className="relative min-w-0 flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
              🔍
            </span>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm [&::-webkit-search-cancel-button]:hidden"
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

          {/* Botones Móvil: Filtro + Métricas */}
          <div className="relative sm:hidden flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMovilAbierto(!filtroMovilAbierto)}
              title="Filtrar"
              aria-label="Filtrar"
              className={`relative w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                hayFiltroActivo
                  ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-7 8.25V19.5l-4 1.5v-8.25L3 4.5Z" />
              </svg>
              {hayFiltroActivo && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-zinc-950" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMostrarMetricasMovil((v) => !v)}
              title="Métricas"
              aria-label="Métricas"
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                mostrarMetricasMovil
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M8 17v-5m4 5V8m4 9v-3" />
              </svg>
            </button>

            {filtroMovilAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setFiltroMovilAbierto(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1.5 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Estado
                  </div>
                  {[
                    { id: "TODOS", label: "Todos" },
                    { id: "ACTIVOS", label: "Activos" },
                    { id: "PAUSADOS", label: "Pausados" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setSelectedEstado(opcion.id);
                        setFiltroMovilAbierto(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        selectedEstado === opcion.id
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
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

                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Categoría
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("TODAS");
                      setFiltroMovilAbierto(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                      selectedCategory === "TODAS"
                        ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                    }`}
                  >
                    <span>Todas las categorías</span>
                    {selectedCategory === "TODAS" && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  {Array.from(new Set(categories.map((c) => String(c).trim()).filter(Boolean))).map((cat, idx) => (
                    <button
                      key={`srv-cat-mov-${cat}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setFiltroMovilAbierto(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
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

          <div className="hidden sm:flex items-center gap-3 w-auto shrink-0">
            {/* Filtro Categorías */}
            <div className="relative w-full sm:w-44 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCatMenuAbierto(!catMenuAbierto);
                  setEstadoMenuAbierto(false);
                }}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
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
                  <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("TODAS");
                        setCatMenuAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCategory === "TODAS"
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>Categorías</span>
                      {selectedCategory === "TODAS" && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    {Array.from(new Set(categories.map((c) => String(c).trim()).filter(Boolean))).map((cat, idx) => (
                      <button
                        key={`srv-cat-${cat}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCatMenuAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
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
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
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
                  <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
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
                        className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                          selectedEstado === opcion.id
                            ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
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
        <div className="order-4">
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
          <div>
            {/* Vista Móvil (md:hidden): Tarjetas estructuradas idénticas a Clientes y Productos */}
            <div className="md:hidden space-y-3.5">
              {serviciosFiltrados.map((s) => (
                <div
                  key={s.id}
                  className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden active:bg-zinc-50 dark:active:bg-zinc-800/40 transition-colors ${
                    !s.active ? "opacity-60 bg-zinc-50/50 dark:bg-zinc-950/50" : ""
                  }`}
                >
                  {/* Fila 1: Icono + Nombre + Estado + Código/Categoría */}
                  <div className="p-3.5 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 border bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400 border-teal-200 dark:border-teal-500/30">
                      🔧
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-[15px] leading-tight text-zinc-900 dark:text-zinc-100 truncate">
                          {s.name}
                        </p>
                        <span
                          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${
                            s.active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                          }`}
                        >
                          {s.active ? "Activo" : "Pausado"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                          #{s.code}
                        </span>
                        <span className="truncate">• {s.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Dos recuadros ordenados (Tarifa / Tiempo y Bahía) */}
                  <div className="px-3.5 pb-3 grid grid-cols-2 gap-2">
                    <div className="min-w-0 rounded-xl bg-teal-50/70 dark:bg-teal-500/10 border border-teal-200/70 dark:border-teal-500/20 px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600/80 dark:text-teal-400/80">
                        Tarifa PVP
                      </p>
                      <p className="text-[14px] font-mono font-bold text-teal-700 dark:text-teal-300 truncate">
                        ${Number(s.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        Tiempo / Área
                      </p>
                      <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        ⏱️ {s.estimatedMinutes}m • {s.requiresBay ? "Bahía" : "Taller"}
                      </p>
                    </div>
                  </div>

                  {/* Fila 3: Módulos y Descripción */}
                  {(s.tipo || s.description) && (
                    <div className="px-3.5 pb-3 space-y-2">
                      {s.tipo && (
                        <div className="flex gap-1.5 overflow-x-auto -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {parsearModulos(s.tipo).map((t) => (
                            <span
                              key={t}
                              className="shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg text-[11px] font-medium border border-blue-200 dark:border-blue-500/20"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {s.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          {s.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Fila 4: Botones grandes abajo (Editar y Eliminar) */}
                  <div className="flex items-stretch border-t border-zinc-100 dark:border-zinc-800 divide-x divide-zinc-100 dark:divide-zinc-800">
                    <Link
                      href={`/pos/servicios/editar?id=${s.id}`}
                      className="flex-1 h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 active:bg-blue-50 dark:active:bg-blue-500/10 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Editar</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setServicioAEliminar(s)}
                      className="flex-1 h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 active:bg-rose-50 dark:active:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Servicio</th>
                      <th className="py-3.5 px-4">Categoría</th>
                      <th className="py-3.5 px-4">Tiempo / Bahía</th>
                      <th className="py-3.5 px-4 text-right">Tarifa</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {serviciosFiltrados.map((s) => (
                      <tr
                        key={s.id}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                          !s.active ? "opacity-60 bg-zinc-50/50 dark:bg-zinc-950/50" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {s.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {s.name}
                          </div>
                          {s.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-xs mt-0.5">
                              {s.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {s.category && s.category !== "General" && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/40">
                                {s.category}
                              </span>
                            )}
                            {s.tipo ? (
                              <div className="flex flex-wrap gap-1 max-w-[170px]">
                                {parsearModulos(s.tipo).map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/40">
                                {s.category || "General"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-500">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              ⏱️ {s.estimatedMinutes} min
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {s.requiresBay ? "🚗 Elevador/Bahía" : "🧰 Mano de Obra"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-white">
                          ${Number(s.price).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
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
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/pos/servicios/editar?id=${s.id}`}
                              className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all active:scale-95 flex items-center justify-center shadow-xs"
                              title="Editar servicio"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setServicioAEliminar(s)}
                              className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                              title="Eliminar servicio"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
          </div>
        )}
        </div>
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
