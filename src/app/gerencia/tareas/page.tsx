"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState, useMemo } from "react";

interface CeoTask {
  id: string;
  title: string;
  category: "TALLER" | "FINANZAS" | "PROVEEDORES" | "NOMINA" | "VENTAS" | "GENERAL";
  priority: "URGENTE" | "ALTA" | "MEDIA" | "NORMAL";
  status: "PENDIENTE" | "EN_PROCESO" | "COMPLETADA";
  dueDate: string;
  assignedTo: string;
  notes?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; badge: string; icon: string }> = {
  TALLER: {
    label: "Taller y Bahías",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
    icon: "🔧",
  },
  FINANZAS: {
    label: "Finanzas y Caja",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    icon: "💰",
  },
  PROVEEDORES: {
    label: "Proveedores",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
    icon: "📦",
  },
  NOMINA: {
    label: "Nómina",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50",
    icon: "👥",
  },
  VENTAS: {
    label: "Ventas y Clientes",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
    icon: "🎯",
  },
  GENERAL: {
    label: "General CEO",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800",
    icon: "📋",
  },
};

const PRIORITY_BADGES: Record<string, string> = {
  URGENTE: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 font-semibold",
  ALTA: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50 font-medium",
  MEDIA: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 font-normal",
  NORMAL: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 font-normal",
};

export default function CeoTareasPage() {
  const [tasks, setTasks] = useState<CeoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("TODAS");
  const [categoryFilter, setCategoryFilter] = useState<string>("TODAS");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CeoTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "TALLER" as CeoTask["category"],
    priority: "MEDIA" as CeoTask["priority"],
    status: "PENDIENTE" as CeoTask["status"],
    dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: "CEO - Dirección",
    notes: "",
  });

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gerencia/tareas");
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Quick toggle between completed and pending
  const handleToggleStatus = async (task: CeoTask) => {
    setTogglingId(task.id);
    const nextStatus = task.status === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus, completedAt: nextStatus === "COMPLETADA" ? new Date().toISOString() : null } : t))
    );

    try {
      const res = await fetch("/api/gerencia/tareas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setTasks(data.tasks);
        }
      }
    } catch (err) {
      console.error("Error toggling task:", err);
      loadTasks();
    } finally {
      setTogglingId(null);
    }
  };

  const openNew = () => {
    setEditingTask(null);
    setForm({
      title: "",
      category: "TALLER",
      priority: "ALTA",
      status: "PENDIENTE",
      dueDate: new Date().toISOString().slice(0, 10),
      assignedTo: "CEO - Dirección",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (task: CeoTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      category: task.category,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || new Date().toISOString().slice(0, 10),
      assignedTo: task.assignedTo || "CEO - Dirección",
      notes: task.notes || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea ejecutiva?")) return;
    try {
      const res = await fetch(`/api/gerencia/tareas?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setTasks(data.tasks);
        } else {
          setTasks((prev) => prev.filter((t) => t.id !== id));
        }
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      const method = editingTask ? "PUT" : "POST";
      const payload = editingTask ? { id: editingTask.id, ...form } : form;
      const res = await fetch("/api/gerencia/tareas", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setTasks(data.tasks);
        } else {
          loadTasks();
        }
        setModalOpen(false);
      }
    } catch (err) {
      console.error("Error saving task:", err);
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "PENDIENTE").length;
  const inProgressCount = tasks.filter((t) => t.status === "EN_PROCESO").length;
  const urgentCount = tasks.filter((t) => (t.priority === "URGENTE" || t.priority === "ALTA") && t.status !== "COMPLETADA").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETADA").length;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Status filter
      if (statusFilter !== "TODAS" && t.status !== statusFilter) return false;
      // Category filter
      if (categoryFilter !== "TODAS" && t.category !== categoryFilter) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchAssigned = t.assignedTo?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchAssigned && !matchNotes) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, categoryFilter, search]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Breadcrumb & Header */}
        <div className="order-1 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/gerencia"
              title="Volver a Gerencia"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-1 sm:mb-1.5">
                <Link href="/gerencia" className="hover:text-blue-600 transition-colors">
                  Gerencia
                </Link>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Tareas del CEO</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Gestión de Tareas
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Control ejecutivo de operaciones del taller, finanzas, proveedores y nómina
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={openNew}
              className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-zinc-950 font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Tarea
            </button>
          </div>
        </div>

        {/* Resumen Cards (4 KPIs ejecutivos) */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-lg sm:text-xl flex-shrink-0">
                📋
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{totalCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Total</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg sm:text-xl flex-shrink-0">
                ⏳
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{pendingCount + inProgressCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Por Realizar</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-lg sm:text-xl flex-shrink-0">
                ⚡
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">{urgentCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Urgentes</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg sm:text-xl flex-shrink-0">
                ✅
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{completedCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Completadas</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Filtros de Estado y Búsqueda */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 mb-4 shadow-sm flex flex-col gap-3">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "TODAS", label: "Todas" },
                { id: "PENDIENTE", label: "Pendientes" },
                { id: "EN_PROCESO", label: "En Proceso" },
                { id: "COMPLETADA", label: "Completadas" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    statusFilter === tab.id
                      ? "bg-amber-500 text-zinc-950 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Buscar por título, nota o responsable..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <svg
                className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Categorías Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-zinc-100 dark:border-zinc-800/60 scrollbar-none">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Área:
            </span>
            {[
              { id: "TODAS", label: "Todas las áreas", icon: "🏢" },
              { id: "TALLER", label: "Taller", icon: "🔧" },
              { id: "FINANZAS", label: "Finanzas", icon: "💰" },
              { id: "PROVEEDORES", label: "Proveedores", icon: "📦" },
              { id: "NOMINA", label: "Nómina", icon: "👥" },
              { id: "VENTAS", label: "Ventas", icon: "🎯" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors whitespace-nowrap border ${
                  categoryFilter === cat.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-medium"
                    : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="order-4 space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-12 text-center text-zinc-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-3" />
              <p className="text-sm">Cargando tareas ejecutivas...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-12 text-center">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No hay tareas en este criterio
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                No se encontraron tareas pendientes con los filtros aplicados. Puedes crear una nueva tarea ejecutiva en cualquier momento.
              </p>
              <button
                onClick={openNew}
                className="mt-4 px-4 py-2 bg-amber-500 text-zinc-950 rounded-xl text-xs sm:text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                + Crear Tarea
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === "COMPLETADA";
              const catConfig = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.GENERAL;

              return (
                <div
                  key={task.id}
                  className={`group bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCompleted
                      ? "border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10 opacity-75 hover:opacity-100"
                      : "border-zinc-200/80 dark:border-zinc-800 hover:border-amber-500/40 dark:hover:border-amber-500/40"
                  }`}
                >
                  {/* Left: Checkbox + Title + Meta */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Circle Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(task)}
                      disabled={togglingId === task.id}
                      className={`w-6 h-6 rounded-full border-2 mt-0.5 flex items-center justify-center transition-all flex-shrink-0 ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-zinc-300 dark:border-zinc-600 hover:border-amber-500 text-transparent"
                      }`}
                      title={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm sm:text-base font-medium transition-colors ${
                            isCompleted
                              ? "line-through text-zinc-400 dark:text-zinc-500"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {task.title}
                        </h3>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md border ${
                            PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.NORMAL
                          }`}
                        >
                          {task.priority}
                        </span>

                        {/* Category Badge */}
                        <span
                          className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 ${catConfig.badge}`}
                        >
                          <span>{catConfig.icon}</span>
                          <span>{catConfig.label}</span>
                        </span>
                      </div>

                      {/* Notes */}
                      {task.notes && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {task.notes}
                        </p>
                      )}

                      {/* Meta Footer */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {task.assignedTo || "CEO - Dirección"}
                        </span>

                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                            </svg>
                            {task.dueDate}
                          </span>
                        )}

                        {isCompleted && task.completedAt && (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            ✓ Completada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar tarea"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      title="Eliminar tarea"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Crear / Editar Tarea */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 relative">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg"
              >
                ✕
              </button>

              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                {editingTask ? "Editar Tarea Ejecutiva" : "Nueva Tarea Ejecutiva"}
              </h2>
              <p className="text-xs text-zinc-500 mb-5">
                Define acciones clave para el taller, caja, compras o personal
              </p>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Título de la Tarea *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ej. Arqueo de caja turno tarde / Aprobar repuestos"
                    className="w-full h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Área y Prioridad en 2 columnas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Área / Módulo
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as CeoTask["category"] })}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="TALLER">🔧 Taller y Bahías</option>
                      <option value="FINANZAS">💰 Finanzas y Caja</option>
                      <option value="PROVEEDORES">📦 Proveedores</option>
                      <option value="NOMINA">👥 Nómina</option>
                      <option value="VENTAS">🎯 Ventas y Clientes</option>
                      <option value="GENERAL">📋 General CEO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Prioridad
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as CeoTask["priority"] })}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="URGENTE">🚨 Urgente (Inmediata)</option>
                      <option value="ALTA">⚡ Alta (Hoy)</option>
                      <option value="MEDIA">⏳ Media</option>
                      <option value="NORMAL">📋 Normal</option>
                    </select>
                  </div>
                </div>

                {/* Estado y Fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Estado
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as CeoTask["status"] })}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="PENDIENTE">⏳ Pendiente</option>
                      <option value="EN_PROCESO">⚙️ En Proceso</option>
                      <option value="COMPLETADA">✅ Completada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Fecha Límite
                    </label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Responsable Asignado
                  </label>
                  <input
                    type="text"
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    placeholder="Ej. CEO - Dirección / Jefe de Taller / Cajera"
                    className="w-full h-10 px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Notas y Observaciones
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Detalles sobre números de orden, proveedores o instrucciones..."
                    className="w-full p-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {saving ? "Guardando..." : editingTask ? "Actualizar Tarea" : "Crear Tarea"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <GerenciaMobileNav />
    </div>
  );
}
