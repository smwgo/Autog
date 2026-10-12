"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";

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

  // Modales
  const [modalNuevo, setModalNuevo] = useState(false);
  const [servicioAEditar, setServicioAEditar] = useState<WorkshopService | null>(null);
  const [servicioAEliminar, setServicioAEliminar] = useState<WorkshopService | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Form State
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "Mantenimiento Rápido",
    price: "",
    estimatedMinutes: "30",
    description: "",
    requiresBay: true,
  });

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
      params.set("activos", "false"); // Mostrar todos para poder gestionar inactivos

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

  const abrirModalCrear = () => {
    setForm({
      code: `SRV-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "",
      category: "Mantenimiento Rápido",
      price: "",
      estimatedMinutes: "30",
      description: "",
      requiresBay: true,
    });
    setModalNuevo(true);
  };

  const abrirModalEditar = (s: WorkshopService) => {
    setServicioAEditar(s);
    setForm({
      code: s.code,
      name: s.name,
      category: s.category,
      price: String(s.price),
      estimatedMinutes: String(s.estimatedMinutes),
      description: s.description || "",
      requiresBay: s.requiresBay,
    });
  };

  const handleGuardarNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      alert("Por favor completa el nombre y precio.");
      return;
    }

    try {
      setGuardando(true);
      const res = await fetch("/api/servicios-taller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          category: form.category,
          price: form.price,
          estimatedMinutes: form.estimatedMinutes,
          description: form.description,
          requiresBay: form.requiresBay,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el servicio");
      }

      setModalNuevo(false);
      cargarServicios();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicioAEditar) return;

    try {
      setGuardando(true);
      const res = await fetch("/api/servicios-taller", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: servicioAEditar.id,
          code: form.code,
          name: form.name,
          category: form.category,
          price: form.price,
          estimatedMinutes: form.estimatedMinutes,
          description: form.description,
          requiresBay: form.requiresBay,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar el servicio");
      }

      setServicioAEditar(null);
      cargarServicios();
    } catch (err: any) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (s: WorkshopService) => {
    try {
      const res = await fetch("/api/servicios-taller", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: s.id,
          active: !s.active,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        cargarServicios();
      }
    } catch (err: any) {
      alert("Error al cambiar estado: " + err.message);
    }
  };

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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header idéntico a las otras páginas de POS */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Link href="/pos" className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium">
                <span>&larr;</span> POS
              </Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Servicios</span>
            </div>
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
                {cargando ? "..." : servicios.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/taller/ordenes"
              className="h-10 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
            >
              <span>🚗</span> Órdenes de Taller
            </Link>
            <button
              onClick={abrirModalCrear}
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>+</span> Nuevo Servicio
            </button>
          </div>
        </div>

        {/* Resumen Cards con una sola palabra en cada métrica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              ⚙️
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando ? "..." : servicios.length}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Totales</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              ✅
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando ? "..." : totalActivos}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Activos</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⏱️
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando ? "..." : `${promedioMinutos} min`}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Promedio</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-xl flex-shrink-0">
              🚗
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando ? "..." : bahiaCount}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Bahía</h3>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center">
          {/* Buscador a la izquierda (flex-1) */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Buscar servicio por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
            <span className="absolute left-3.5 top-3 text-zinc-400">🔍</span>
          </div>

          {/* Desplegable de Categoría a la derecha */}
          <div className="w-full md:w-64 flex-shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer"
            >
              <option value="TODAS">Categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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
        ) : servicios.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-5xl">🛠️</span>
            <p className="text-lg font-bold mt-3">No se encontraron servicios</p>
            <p className="text-sm text-zinc-500 mt-1">Prueba con otro término o agrega uno nuevo.</p>
            <button
              onClick={abrirModalCrear}
              className="mt-4 px-4 py-2 bg-teal-600 text-white font-medium text-xs rounded-xl hover:bg-teal-700"
            >
              Crear Nuevo Servicio
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Servicio
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Tiempo / Bahía
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Tarifa
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
                  {servicios.map((s) => (
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/pos/venta?servicio=${encodeURIComponent(s.code)}`}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                            title="Facturar en Mostrador POS"
                          >
                            <span>🛒</span> Facturar
                          </Link>

                          <button
                            onClick={() => abrirModalEditar(s)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                            title="Editar servicio"
                          >
                            ✏️
                          </button>

                          <button
                            onClick={() => handleToggleEstado(s)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                            title={s.active ? "Pausar servicio" : "Activar servicio"}
                          >
                            {s.active ? "⏸️" : "▶️"}
                          </button>

                          <button
                            onClick={() => setServicioAEliminar(s)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Eliminar servicio"
                          >
                            🗑️
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

      {/* Modal Nuevo Servicio */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>➕</span> Nuevo Servicio de Taller
              </h2>
              <button
                onClick={() => setModalNuevo(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarNuevo} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Código Único *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Categoría *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Lavado y Estética">Lavado y Estética</option>
                    <option value="Mantenimiento Rápido">Mantenimiento Rápido</option>
                    <option value="Frenos">Frenos</option>
                    <option value="Suspensión y Dirección">Suspensión y Dirección</option>
                    <option value="Diagnóstico">Diagnóstico</option>
                    <option value="Climatización">Climatización</option>
                    <option value="Mecánica General">Mecánica General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Nombre del Servicio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lavado Integral con Chasis y Motor"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Tarifa / Precio ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="25.00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Tiempo Estimado (Minutos)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={form.estimatedMinutes}
                    onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Descripción / Qué incluye
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalla lo que cubre este servicio al cliente..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="requiresBayNew"
                  checked={form.requiresBay}
                  onChange={(e) => setForm({ ...form, requiresBay: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="requiresBayNew" className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  Requiere bahía o elevador físico en taller
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Registrar Servicio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Servicio */}
      {servicioAEditar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>✏️</span> Editar Servicio
              </h2>
              <button
                onClick={() => setServicioAEditar(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActualizar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Código Único
                  </label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Categoría
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Lavado y Estética">Lavado y Estética</option>
                    <option value="Mantenimiento Rápido">Mantenimiento Rápido</option>
                    <option value="Frenos">Frenos</option>
                    <option value="Suspensión y Dirección">Suspensión y Dirección</option>
                    <option value="Diagnóstico">Diagnóstico</option>
                    <option value="Climatización">Climatización</option>
                    <option value="Mecánica General">Mecánica General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Nombre del Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Tarifa / Precio ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Tiempo Estimado (Minutos)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={form.estimatedMinutes}
                    onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                  Descripción / Qué incluye
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="requiresBayEdit"
                  checked={form.requiresBay}
                  onChange={(e) => setForm({ ...form, requiresBay: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="requiresBayEdit" className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                  Requiere bahía o elevador físico en taller
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setServicioAEditar(null)}
                  className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-50"
                >
                  {guardando ? "Actualizando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      {servicioAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-2xl mx-auto mb-4">
              🗑️
            </div>
            <h3 className="text-lg font-bold text-center text-zinc-900 dark:text-white">
              ¿Eliminar este servicio?
            </h3>
            <p className="text-sm text-center text-zinc-500 mt-2">
              Se eliminará <strong className="text-zinc-800 dark:text-zinc-200">{servicioAEliminar.name}</strong> ({servicioAEliminar.code}) permanentemente del sistema.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setServicioAEliminar(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={eliminando}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {eliminando ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
