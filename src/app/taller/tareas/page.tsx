"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface TaskItem {
  id: string;
  dbId: string;
  taskNumber: string;
  title: string;
  vehicle: string;
  plate?: string;
  orderNumber?: string;
  mechanic: string;
  status: "pending" | "in-progress" | "done" | string;
  priority: "Alta" | "Media" | "Baja" | string;
  timeEst: string;
  notes?: string;
}

interface ActiveOrderRef {
  id: string;
  vehicle: string;
  plate: string;
  mechanic: string;
}

export default function MisTareasPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMechanic, setFilterMechanic] = useState("");
  const [filtroMecanicoAbierto, setFiltroMecanicoAbierto] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Modal Nueva Tarea
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ordenesActivas, setOrdenesActivas] = useState<ActiveOrderRef[]>([]);
  const [title, setTitle] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [mechanic, setMechanic] = useState("Carlos Rodríguez");
  const [priority, setPriority] = useState("Media");
  const [timeEst, setTimeEst] = useState("1h 00m");
  const [notes, setNotes] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarTareas = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("busqueda", searchTerm.trim());
      if (filterMechanic) params.set("mecanico", filterMechanic);

      const res = await fetch(`/api/taller/tareas?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Error al cargar tareas desde base de datos:", err);
    } finally {
      setCargando(false);
    }
  }, [searchTerm, filterMechanic]);

  useEffect(() => {
    cargarTareas();
  }, [cargarTareas]);

  useEffect(() => {
    fetch("/api/taller/ordenes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && Array.isArray(d.orders)) {
          setOrdenesActivas(d.orders);
        }
      })
      .catch(() => {});
  }, []);

  const handleSeleccionarOrden = (ordId: string) => {
    setOrderNumber(ordId);
    const found = ordenesActivas.find((o) => o.id === ordId);
    if (found) {
      setVehicle(`${found.vehicle} (${found.plate})`);
      setPlate(found.plate);
      if (found.mechanic) setMechanic(found.mechanic);
    }
  };

  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !vehicle.trim()) {
      alert("Completa el título de la tarea y el vehículo.");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/taller/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          vehicle: vehicle.trim(),
          plate: plate.trim(),
          orderNumber: orderNumber.trim() || undefined,
          mechanic,
          priority,
          timeEst: timeEst.trim() || "1h 00m",
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al crear tarea");
      }

      setModalAbierto(false);
      setTitle("");
      setVehicle("");
      setPlate("");
      setOrderNumber("");
      setNotes("");
      await cargarTareas();
    } catch (err: any) {
      alert(err.message || "Error al guardar tarea.");
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (task: TaskItem, nuevoEstado: "pending" | "in-progress" | "done") => {
    try {
      const id = task.dbId || task.id;
      setProcesandoId(id);

      const res = await fetch("/api/taller/tareas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: nuevoEstado,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar la tarea");
      }

      setTasks((prev) =>
        prev.map((t) => (t.dbId === id || t.id === id ? { ...t, status: nuevoEstado } : t))
      );
    } catch (err: any) {
      alert(err.message || "Error al actualizar estado.");
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEliminarTarea = async (task: TaskItem) => {
    if (!window.confirm(`¿Eliminar la tarea ${task.id} (${task.title})?`)) return;
    try {
      const id = task.dbId || task.id;
      setProcesandoId(id);
      const res = await fetch(`/api/taller/tareas?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo eliminar la tarea");
      }
      setTasks((prev) => prev.filter((t) => t.dbId !== id && t.id !== id));
    } catch (err: any) {
      alert(err.message || "Error al eliminar tarea.");
    } finally {
      setProcesandoId(null);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case "Alta":
        return "text-rose-600 bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400";
      case "Media":
        return "text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400";
      case "Baja":
        return "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400";
      default:
        return "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const TaskCard = ({ task }: { task: TaskItem }) => {
    const isBusy = procesandoId === task.dbId || procesandoId === task.id;
    const nextStatus =
      task.status === "pending"
        ? "in-progress"
        : task.status === "in-progress"
        ? "done"
        : "pending";
    const nextLabel =
      task.status === "pending"
        ? "Iniciar trabajo"
        : task.status === "in-progress"
        ? "Marcar completada"
        : "Reabrir tarea";

    return (
      <div
        className={`bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group ${
          isBusy ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
              {task.id}
            </span>
            {task.orderNumber && (
              <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                {task.orderNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${getPriorityColor(
                task.priority
              )}`}
            >
              {task.priority}
            </span>
            <button
              type="button"
              onClick={() => handleEliminarTarea(task)}
              title="Eliminar tarea"
              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-400 hover:text-rose-500 rounded-xl transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        <h4 className="font-bold text-zinc-900 dark:text-white mb-2 text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {task.title}
        </h4>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-2">
          <span>🚗</span> {task.vehicle}
        </p>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
          <span>👨‍🔧</span> {task.mechanic}
        </p>

        {task.notes && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl mb-3">
            {task.notes}
          </p>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
            <span>⏱️</span> {task.timeEst}
          </span>

          <div className="flex items-center gap-2">
            <select
              value={task.status}
              onChange={(e) =>
                handleCambiarEstado(task, e.target.value as "pending" | "in-progress" | "done")
              }
              className="h-11 text-xs font-semibold px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="pending">Por Hacer</option>
              <option value="in-progress">En Progreso</option>
              <option value="done">Completada</option>
            </select>

            <button
              type="button"
              onClick={() => handleCambiarEstado(task, nextStatus)}
              title={nextLabel}
              className="h-11 w-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800/50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col">
        {/* Navigation / Breadcrumb */}
        <div className="order-1 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/taller"
              title="Volver al Panel de Taller"
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Mis Tareas
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
              {cargando ? "..." : tasks.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
          >
            <span>+</span> Nueva Tarea
          </button>
        </div>

        {/* Resumen Cards Desplegable en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                🔧
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{cargando ? "..." : tasks.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Totales</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-zinc-500/15 border border-zinc-500/25 text-zinc-500 flex items-center justify-center text-xl shrink-0">
                ⏳
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-700 dark:text-zinc-300">
                  {cargando ? "..." : pendingTasks.length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Por Hacer</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 flex items-center justify-center text-xl shrink-0">
                ⚙️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {cargando ? "..." : inProgressTasks.length}
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
                  {cargando ? "..." : doneTasks.length}
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
              placeholder="Buscar tarea o placa..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400 shadow-sm"
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

          <div className="relative w-full sm:w-56 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMecanicoAbierto(!filtroMecanicoAbierto)}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <span className="truncate">{filterMechanic ? filterMechanic : "Mecánicos"}</span>
              <svg className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ml-1.5 ${filtroMecanicoAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMecanicoAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltroMecanicoAbierto(false)} />
                <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "", label: "Mecánicos" },
                    { id: "Carlos Rodríguez", label: "Carlos Rodríguez" },
                    { id: "Luis Martínez", label: "Luis Martínez" },
                    { id: "Andrés Castro", label: "Andrés Castro" },
                    { id: "Ana Torres", label: "Ana Torres" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setFilterMechanic(opcion.id);
                        setFiltroMecanicoAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        filterMechanic === opcion.id
                          ? "bg-emerald-50 dark:bg-emerald-600/15 text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="truncate">{opcion.label}</span>
                      {filterMechanic === opcion.id && (
                        <svg className="w-4 h-4 text-emerald-500 shrink-0 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Contenedor de Tareas */}
        <div className="order-4">
        {cargando ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-medium text-zinc-500">Cargando tareas...</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Column: Por Hacer */}
            <div className="flex-1 w-full bg-zinc-100/50 dark:bg-zinc-900/30 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800/50">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400"></span>
                  Por Hacer
                </h3>
                <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold px-2.5 py-1 rounded-full">
                  {pendingTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {pendingTasks.map((task) => (
                  <TaskCard key={task.dbId || task.id} task={task} />
                ))}
                {pendingTasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-zinc-500 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl">
                    No hay tareas pendientes
                  </div>
                )}
              </div>
            </div>

            {/* Column: En Progreso */}
            <div className="flex-1 w-full bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl p-4 border border-blue-100 dark:border-blue-900/30">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  En Progreso
                </h3>
                <span className="bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  {inProgressTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {inProgressTasks.map((task) => (
                  <TaskCard key={task.dbId || task.id} task={task} />
                ))}
                {inProgressTasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-blue-400/60 border-2 border-dashed border-blue-200 dark:border-blue-900/50 rounded-2xl">
                    Ninguna tarea en progreso
                  </div>
                )}
              </div>
            </div>

            {/* Column: Completadas */}
            <div className="flex-1 w-full bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl p-4 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Completadas
                </h3>
                <span className="bg-emerald-200 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  {doneTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {doneTasks.map((task) => (
                  <TaskCard key={task.dbId || task.id} task={task} />
                ))}
                {doneTasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-emerald-500/60 border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
                    Aún no hay tareas completadas
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Modal Nueva Tarea (Bottom-sheet on small screens) */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 pb-8 sm:pb-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🔧</span> Asignar Nueva Tarea
                </h3>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearTarea} className="space-y-4">
                {ordenesActivas.length > 0 && (
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                      Vincular a Orden Activa (Opcional)
                    </label>
                    <select
                      value={orderNumber}
                      onChange={(e) => handleSeleccionarOrden(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    >
                      <option value="">-- Seleccionar orden existente o ingresar manual --</option>
                      {ordenesActivas.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.id} • {o.vehicle} ({o.plate})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                    Descripción / Título de la Tarea *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cambio de Correa de Distribución"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                      Vehículo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Toyota Hilux (ABC-123)"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                      Mecánico Asignado
                    </label>
                    <select
                      value={mechanic}
                      onChange={(e) => setMechanic(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    >
                      <option value="Carlos Rodríguez">Carlos Rodríguez</option>
                      <option value="Luis Martínez">Luis Martínez</option>
                      <option value="Andrés Castro">Andrés Castro</option>
                      <option value="Ana Torres">Ana Torres</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                      Prioridad
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                      Tiempo Estimado
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 1h 30m"
                      value={timeEst}
                      onChange={(e) => setTimeEst(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                    Notas Técnicas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instrucciones o especificaciones para el mecánico..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white resize-y"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="h-11 px-5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center"
                  >
                    {guardando ? "Guardando..." : "Crear Tarea"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <TallerMobileNav />
    </div>
  );
}
