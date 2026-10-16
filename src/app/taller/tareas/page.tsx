"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

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
      console.error("Error al cargar tareas desde Neon:", err);
    } finally {
      setCargando(false);
    }
  }, [searchTerm, filterMechanic]);

  useEffect(() => {
    cargarTareas();
  }, [cargarTareas]);

  useEffect(() => {
    fetch("/api/taller/ordenes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.orders)) {
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
      alert(err.message || "Error al guardar tarea en Neon.");
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
      alert(err.message || "Error al actualizar estado en Neon.");
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
        className={`bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group ${
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
              className="text-zinc-400 hover:text-rose-500 p-1 rounded-lg transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        <h4 className="font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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

        <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
            <span>⏱️</span> {task.timeEst}
          </span>

          <div className="flex items-center gap-1.5">
            <select
              value={task.status}
              onChange={(e) =>
                handleCambiarEstado(task, e.target.value as "pending" | "in-progress" | "done")
              }
              className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="pending">Por Hacer</option>
              <option value="in-progress">En Progreso</option>
              <option value="done">Completada</option>
            </select>

            <button
              type="button"
              onClick={() => handleCambiarEstado(task, nextStatus)}
              title={nextLabel}
              className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/taller"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500 flex items-center gap-1 w-fit"
          >
            &larr; Volver al Panel de Taller
          </Link>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>+</span> Nueva Tarea
          </button>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 bg-opacity-10 flex items-center justify-center text-2xl">
                🔧
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Mis Tareas
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {tasks.length} tareas registradas en Neon DB
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={filterMechanic}
              onChange={(e) => setFilterMechanic(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los Mecánicos</option>
              <option value="Carlos Rodríguez">Carlos Rodríguez</option>
              <option value="Luis Martínez">Luis Martínez</option>
              <option value="Andrés Castro">Andrés Castro</option>
              <option value="Ana Torres">Ana Torres</option>
            </select>

            <div className="relative flex-grow md:flex-grow-0">
              <input
                type="text"
                placeholder="Buscar tarea o placa..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow dark:text-white text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-3 text-zinc-400 text-sm">🔍</span>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-medium text-zinc-500">Cargando tareas desde Neon...</p>
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

        {/* Modal Nueva Tarea */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🔧</span> Asignar Nueva Tarea (Neon DB)
                </h3>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-xs cursor-pointer"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 block mb-1">
                      Mecánico Asignado
                    </label>
                    <select
                      value={mechanic}
                      onChange={(e) => setMechanic(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {guardando ? "Guardando..." : "Crear Tarea"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
