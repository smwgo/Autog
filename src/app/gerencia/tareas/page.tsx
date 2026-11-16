"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState, useMemo, useRef } from "react";

interface CeoTask {
  id: string;
  title: string;
  category: string;
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
    label: "Taller",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
    icon: "🔧",
  },
  FINANZAS: {
    label: "Finanzas",
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
    label: "Ventas",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
    icon: "🎯",
  },
  GENERAL: {
    label: "General",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800",
    icon: "📋",
  },
};

const getCategoryInfo = (cat: string) => {
  const upper = (cat || "").toUpperCase().trim();
  if (CATEGORY_CONFIG[upper]) return CATEGORY_CONFIG[upper];
  for (const key of Object.keys(CATEGORY_CONFIG)) {
    if (upper.includes(key)) return CATEGORY_CONFIG[key];
  }
  return {
    label: cat || "General",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800",
    icon: "📁",
  };
};

const PRIORITY_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  URGENTE: {
    label: "Urgente",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 font-semibold",
    dot: "bg-rose-500",
  },
  ALTA: {
    label: "Alta",
    badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50 font-medium",
    dot: "bg-orange-500",
  },
  MEDIA: {
    label: "Media",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 font-normal",
    dot: "bg-amber-500",
  },
  NORMAL: {
    label: "Normal",
    badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 font-normal",
    dot: "bg-zinc-400",
  },
};

function MinimalSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string; customLabel?: React.ReactNode }[];
  onChange: (val: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-zinc-500 mb-1">{label}</label>}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-11 sm:h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition flex items-center justify-between gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      >
        <span className="truncate">{selected?.customLabel || selected?.label}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 sm:left-0 sm:right-auto top-full z-50 mt-1.5 w-full min-w-[150px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#121824]/95 p-1.5 shadow-2xl shadow-zinc-900/15 dark:shadow-black/70 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in-95 duration-150"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-xl text-left transition ${
                  active
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <span className="truncate">{opt.customLabel || opt.label}</span>
                {active && <span className="text-amber-600 dark:text-amber-400 font-bold ml-2">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function toInputDateValue(dateStr?: string | null): string {
  if (!dateStr) return "";
  const cleaned = String(dateStr).trim();
  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }
  return cleaned.slice(0, 10);
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const cleaned = String(dateStr).trim();
  if (!cleaned) return "";

  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;

  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      day = Number(dmyMatch[1]);
      month = Number(dmyMatch[2]);
      year = Number(dmyMatch[3]);
    }
  }

  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    } else {
      return cleaned;
    }
  }

  const d = new Date(year, month - 1, day);
  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const dayName = daysOfWeek[d.getDay()];
  const monthName = months[d.getMonth()];
  const yy = String(year).slice(-2);
  return `${dayName} ${day} ${monthName} ${yy}`;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const WEEK_DAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function MinimalDatePicker({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    const cleaned = String(value || "").trim();
    const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]) - 1,
        day: Number(isoMatch[3]),
      };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }, [value]);

  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  useEffect(() => {
    if (open) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [open, parsed.year, parsed.month]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const firstDayIndex = (firstDayRaw + 6) % 7; // Monday = 0 ... Sunday = 6

  const prevDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevDays.push({
      day: daysInPrevMonth - i,
      month: viewMonth === 0 ? 11 : viewMonth - 1,
      year: viewMonth === 0 ? viewYear - 1 : viewYear,
      isCurrentMonth: false,
    });
  }

  const currentDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    currentDays.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
    });
  }

  const totalSlots = prevDays.length + currentDays.length;
  const nextDaysCount = (7 - (totalSlots % 7)) % 7;
  const nextDays = [];
  for (let d = 1; d <= nextDaysCount; d++) {
    nextDays.push({
      day: d,
      month: viewMonth === 11 ? 0 : viewMonth + 1,
      year: viewMonth === 11 ? viewYear + 1 : viewYear,
      isCurrentMonth: false,
    });
  }

  const calendarDays = [...prevDays, ...currentDays, ...nextDays];

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const selectedDateVal = toInputDateValue(value);

  const handleSelect = (y: number, m: number, d: number) => {
    const val = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    onChange(val);
    setOpen(false);
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-zinc-500">{label}</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                handleSelect(now.getFullYear(), now.getMonth(), now.getDate());
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                handleSelect(d.getFullYear(), d.getMonth(), d.getDate());
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition"
            >
              Mañana
            </button>
          </div>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium hover:border-zinc-300 dark:hover:border-zinc-600 transition flex items-center justify-between gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
            </svg>
          </div>
          <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
            {formatDisplayDate(value) || "Seleccionar fecha"}
          </span>
        </div>

        <svg
          className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180 text-amber-500" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Custom Minimalist Dark Dropdown Calendar */}
      {open && (
        <div
          role="dialog"
          aria-label="Calendario"
          className="absolute right-0 top-full z-50 mt-1.5 w-[280px] sm:w-[290px] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#121824]/95 p-3.5 shadow-2xl shadow-zinc-900/15 dark:shadow-black/70 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition"
              aria-label="Mes anterior"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-wide capitalize">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition"
              aria-label="Mes siguiente"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekdays Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEK_DAYS.map((wd) => (
              <span key={wd} className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-0.5">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((item, idx) => {
              const dateVal = `${item.year}-${String(item.month + 1).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
              const isSelected = dateVal === selectedDateVal;
              const isToday = dateVal === todayStr;

              return (
                <button
                  key={`${dateVal}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item.year, item.month, item.day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all relative ${
                    isSelected
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/30 scale-105 z-10"
                      : !item.isCurrentMonth
                      ? "text-zinc-400/40 dark:text-zinc-600/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:text-zinc-700 dark:hover:text-zinc-300"
                      : isToday
                      ? "text-amber-500 dark:text-amber-400 font-bold bg-amber-500/10 hover:bg-amber-500/20"
                      : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {item.day}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Select Shortcuts Footer */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 text-[11px]">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                handleSelect(now.getFullYear(), now.getMonth(), now.getDate());
              }}
              className="font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-500 px-2 py-0.5 rounded-lg hover:bg-amber-500/10 transition"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                handleSelect(d.getFullYear(), d.getMonth(), d.getDate());
              }}
              className="font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-0.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Mañana
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                handleSelect(d.getFullYear(), d.getMonth(), d.getDate());
              }}
              className="font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-0.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              +1 Semana
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    title: "",
    category: "Taller",
    priority: "MEDIA" as CeoTask["priority"],
    status: "PENDIENTE" as CeoTask["status"],
    dueDate: new Date().toISOString().slice(0, 10),
    assignedTo: "",
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
    fetch("/api/gerencia/personal")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data.map((e: any) => ({ id: e.id, name: e.name })));
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleStatus = async (task: CeoTask) => {
    setTogglingId(task.id);
    const nextStatus = task.status === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: nextStatus,
              completedAt: nextStatus === "COMPLETADA" ? new Date().toISOString() : null,
            }
          : t
      )
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
      category: "Taller",
      priority: "ALTA",
      status: "PENDIENTE",
      dueDate: new Date().toISOString().slice(0, 10),
      assignedTo: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (task: CeoTask) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      category: task.category || "Taller",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || new Date().toISOString().slice(0, 10),
      assignedTo: task.assignedTo || "",
      notes: task.notes || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
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

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const data = tasks.map((t) => ({
      Título: t.title,
      Área: getCategoryInfo(t.category).label,
      Prioridad: PRIORITY_CONFIG[t.priority]?.label || t.priority,
      Estado: t.status === "COMPLETADA" ? "Completada" : t.status === "EN_PROCESO" ? "Proceso" : "Pendiente",
      Fecha: formatDisplayDate(t.dueDate) || t.dueDate,
      Responsable: t.assignedTo,
      Notas: t.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tareas");
    XLSX.writeFile(workbook, `tareas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Metrics (Single words)
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "PENDIENTE" || t.status === "EN_PROCESO").length;
  const urgentCount = tasks.filter((t) => (t.priority === "URGENTE" || t.priority === "ALTA") && t.status !== "COMPLETADA").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETADA").length;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Status filter
      if (statusFilter !== "TODAS" && t.status !== statusFilter) return false;
      // Category filter
      if (categoryFilter !== "TODAS") {
        const catUpper = (t.category || "").toUpperCase();
        const filtUpper = categoryFilter.toUpperCase();
        if (!catUpper.includes(filtUpper) && !filtUpper.includes(catUpper)) return false;
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCategory = (t.category || "").toLowerCase().includes(q);
        const matchAssigned = t.assignedTo?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !matchAssigned && !matchNotes) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, categoryFilter, search]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header sin breadcrumbs */}
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Tareas
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={openNew}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-zinc-950 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nueva Tarea</span>
            </button>
            <button
              onClick={handleExport}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span>Exportar a Excel</span>
            </button>
          </div>
        </div>

        {/* Resumen Cards (4 KPIs con una sola palabra) */}
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
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{pendingCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Pendientes</h3>
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

        {/* Filtros de Tabla: Buscador primero y desplegables minimalistas */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-0 shadow-sm">
          {/* Buscador primero */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarea..."
              className="w-full h-11 sm:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-900 transition"
            />
            <svg
              className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filtros desplegables minimalistas */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:w-auto shrink-0">
            <div className="w-full sm:w-36">
              <MinimalSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: "TODAS", label: "Todas" },
                  {
                    value: "PENDIENTE",
                    label: "Pendientes",
                    customLabel: (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span>Pendientes</span>
                      </span>
                    ),
                  },
                  {
                    value: "EN_PROCESO",
                    label: "Proceso",
                    customLabel: (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <span>Proceso</span>
                      </span>
                    ),
                  },
                  {
                    value: "COMPLETADA",
                    label: "Completadas",
                    customLabel: (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>Completadas</span>
                      </span>
                    ),
                  },
                ]}
              />
            </div>
            <div className="w-full sm:w-36">
              <MinimalSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={[
                  { value: "TODAS", label: "Áreas" },
                  { value: "TALLER", label: "Taller" },
                  { value: "FINANZAS", label: "Finanzas" },
                  { value: "PROVEEDORES", label: "Proveedores" },
                  { value: "NOMINA", label: "Nómina" },
                  { value: "VENTAS", label: "Ventas" },
                  { value: "GENERAL", label: "General" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="order-4 space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-12 text-center text-zinc-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-3" />
              <p className="text-sm">Cargando tareas...</p>
            </div>
          ) : filteredTasks.length === 0 ? null : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === "COMPLETADA";
              const catConfig = getCategoryInfo(task.category);
              const prioConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.NORMAL;

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
                      title={isCompleted ? "Marcar pendiente" : "Marcar completada"}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm sm:text-base font-semibold transition-colors ${
                            isCompleted
                              ? "line-through text-zinc-400 dark:text-zinc-500"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {task.title}
                        </h3>

                        {/* Priority Badge */}
                        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md border ${prioConfig.badge}`}>
                          {prioConfig.label}
                        </span>

                        {/* Category Badge */}
                        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 ${catConfig.badge}`}>
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
                        {task.assignedTo ? (
                          <span className="flex items-center gap-1 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {task.assignedTo}
                          </span>
                        ) : null}

                        {task.dueDate && (
                          <span className="flex items-center gap-1 font-medium text-zinc-500 dark:text-zinc-400">
                            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                            </svg>
                            {formatDisplayDate(task.dueDate)}
                          </span>
                        )}

                        {isCompleted && task.completedAt && (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            ✓ Completada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions (touch-friendly 44px on mobile) */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      aria-label="Editar Tarea"
                      className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors active:scale-95"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(task.id)}
                      aria-label="Eliminar Tarea"
                      className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors active:scale-95"
                      title="Eliminar"
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl pb-8 sm:pb-6 relative">
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
                {editingTask ? "Editar Tarea" : "Nueva Tarea"}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Descripción de la tarea"
                    className="w-full h-11 px-3 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Área y Prioridad */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">
                      Área
                    </label>
                    <input
                      type="text"
                      required
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Taller"
                      className="w-full h-11 px-3 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <MinimalSelect
                    label="Prioridad"
                    value={form.priority}
                    onChange={(val) => setForm({ ...form, priority: val as CeoTask["priority"] })}
                    options={[
                      {
                        value: "URGENTE",
                        label: "Urgente",
                        customLabel: (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                            <span>Urgente</span>
                          </span>
                        ),
                      },
                      {
                        value: "ALTA",
                        label: "Alta",
                        customLabel: (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                            <span>Alta</span>
                          </span>
                        ),
                      },
                      {
                        value: "MEDIA",
                        label: "Media",
                        customLabel: (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                            <span>Media</span>
                          </span>
                        ),
                      },
                      {
                        value: "NORMAL",
                        label: "Normal",
                        customLabel: (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />
                            <span>Normal</span>
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>

                {/* Estado y Fecha */}
                <div className="grid grid-cols-2 gap-3">
                  <MinimalSelect
                    label="Estado"
                    value={form.status}
                    onChange={(val) => setForm({ ...form, status: val as CeoTask["status"] })}
                    options={[
                      {
                        value: "PENDIENTE",
                        label: "Pendiente",
                        customLabel: (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                            <span>Pendiente</span>
                          </span>
                        ),
                      },
                      {
                        value: "EN_PROCESO",
                        label: "Proceso",
                        customLabel: (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                            <span>Proceso</span>
                          </span>
                        ),
                      },
                      {
                        value: "COMPLETADA",
                        label: "Completada",
                        customLabel: (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>Completada</span>
                          </span>
                        ),
                      },
                    ]}
                  />

                  <MinimalDatePicker
                    label="Fecha"
                    value={form.dueDate}
                    onChange={(val) => setForm({ ...form, dueDate: val })}
                  />
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    placeholder="Opcional"
                    className="w-full h-11 px-3 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Notas
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Observaciones o detalles adicionales..."
                    className="w-full p-3 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-11 rounded-xl bg-amber-500 text-zinc-950 font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {saving ? "Guardando..." : editingTask ? "Actualizar" : "Guardar"}
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
