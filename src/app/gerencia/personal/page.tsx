"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

const departmentOptions = [
  { value: "Todos", label: "Todos" },
  { value: "Taller", label: "Taller" },
  { value: "Ventas / POS", label: "Ventas" },
  { value: "Administración", label: "Administración" },
];

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
        className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition flex items-center justify-between gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
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
          className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#121824]/95 p-1.5 shadow-2xl shadow-zinc-900/15 dark:shadow-black/70 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in-95 duration-150"
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
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition ${
                  active
                    ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                }`}
              >
                <span>{opt.customLabel || opt.label}</span>
                {active && (
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.26a1 1 0 0 1-1.42.003L3.294 9.17a1 1 0 1 1 1.412-1.416l4.086 4.078 6.498-6.548a1 1 0 0 1 1.414.006Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GestionPersonal() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const deptMenuRef = useRef<HTMLDivElement>(null);
  const deptButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!deptMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (deptMenuRef.current && !deptMenuRef.current.contains(e.target as Node)) {
        setDeptMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeptMenuOpen(false);
        deptButtonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [deptMenuOpen]);

  const handleExport = () => {
    const data = employees.map((e) => ({
      Nombre: e.name || "",
      Email: e.email || "",
      Cargo: e.role || "",
      Departamento: e.department || "",
      Ubicación: e.location || "",
      Estado: e.status || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empleados");
    XLSX.writeFile(workbook, `directorio-empleados-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Mecánico",
    department: "Taller",
    location: "Principal",
    status: "Activo",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gerencia/personal");
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNew = () => {
    setEditingItem(null);
    setForm({
      name: "",
      email: "",
      role: "Mecánico",
      department: "Taller",
      location: "Principal",
      status: "Activo",
    });
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingItem(row);
    setForm({
      name: row.name || "",
      email: row.email || "",
      role: row.role || "",
      department: row.department || "Taller",
      location: row.location?.includes("Principal") ? "Principal" : (row.location?.includes("Sucursal") || row.location?.includes("Norte")) ? "Sucursal" : (row.location || "Principal"),
      status: row.status || "Activo",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload: any = editingItem ? { id: editingItem.id, ...form } : { ...form };
      if (!payload.email) delete payload.email;
      const res = await fetch("/api/gerencia/personal", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModalOpen(false);
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este empleado?")) return;
    await fetch(`/api/gerencia/personal?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const filtered = employees.filter((emp) => {
    const d = (emp.department || "").toUpperCase();
    if (deptFilter === "Taller" && !d.includes("TALLER")) return false;
    if (deptFilter === "Ventas / POS" && !d.includes("POS") && !d.includes("VENTAS")) return false;
    if (deptFilter === "Administración" && !d.includes("OFICINA") && !d.includes("GERENCIA") && !d.includes("ADMIN")) return false;
    if (search && !`${emp.name} ${emp.email} ${emp.role} ${emp.department} ${emp.location}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = employees.filter((e) => e.status === "Activo").length;
  const inactiveCount = employees.length - activeCount;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
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
                Empleados
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={openNew}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-xl bg-purple-600 text-white font-semibold text-xs sm:text-sm hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>+</span>
              <span>Nuevo Empleado</span>
            </button>
            <button
              onClick={handleExport}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
              <span>Exportar a Excel</span>
            </button>
          </div>
        </div>

        {/* Resumen Cards: 2x2 on mobile */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-lg sm:text-xl flex-shrink-0">
                👥
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{employees.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Total</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg sm:text-xl flex-shrink-0">
                ✅
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{activeCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Activos</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-lg sm:text-xl flex-shrink-0">
                ⏸️
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{inactiveCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Vacaciones</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg sm:text-xl flex-shrink-0">
                🏢
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">2</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Sucursales</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Filtros de Tabla */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-0 shadow-sm">
          {/* Buscador primero */}
          <div className="relative flex-1">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empleado..." 
              className="w-full h-11 sm:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-purple-500 focus:bg-white dark:focus:bg-zinc-900 transition"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>

          {/* Filtro desplegable personalizado minimalista */}
          <div className="relative w-full sm:w-44 shrink-0" ref={deptMenuRef}>
            <button
              ref={deptButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={deptMenuOpen}
              onClick={() => setDeptMenuOpen((prev) => !prev)}
              className="w-full h-11 sm:h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition flex items-center justify-between gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              <span className="truncate">{deptFilter === "Todos" ? "Departamentos" : departmentOptions.find((o) => o.value === deptFilter)?.label || deptFilter}</span>
              <svg
                className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 ${deptMenuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {deptMenuOpen && (
              <div
                role="menu"
                aria-label="Seleccionar departamento"
                className="absolute right-0 z-30 mt-2 w-full sm:w-44 origin-top-right rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#121824]/95 p-1.5 shadow-xl shadow-zinc-900/10 dark:shadow-black/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/5"
              >
                {departmentOptions.map((opt) => {
                  const active = deptFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setDeptFilter(opt.value);
                        setDeptMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm transition ${
                        active
                          ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {active && (
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.26a1 1 0 0 1-1.42.003L3.294 9.17a1 1 0 1 1 1.412-1.416l4.086 4.078 6.498-6.548a1 1 0 0 1 1.414.006Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tablas / Listados */}
        <div className="order-4">
          {/* Vista Móvil (Tarjetas de Empleados) */}
          <div className="md:hidden space-y-3.5">
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm text-zinc-500">
              Cargando personal...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm text-zinc-500">
              No se encontraron empleados
            </div>
          ) : (
            filtered.map((row) => (
              <div 
                key={row.id} 
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Fila Superior: Avatar + Info Principal + Acciones 44px */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center font-bold text-base text-purple-600 dark:text-purple-400 shrink-0">
                      {(row.name || "E").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {row.name}
                        </h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                          row.status === 'Activo'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                        }`}>
                          {row.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                        {row.department}
                      </p>
                    </div>
                  </div>

                  {/* Acciones Móvil 44px */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(row)}
                      aria-label="Editar Empleado"
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      aria-label="Eliminar Empleado"
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>

                {/* Fila Inferior: Rol y Ubicación + Último Acceso */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                      {row.role}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      📍 {row.location}
                    </span>
                  </div>
                  <div className="text-zinc-400 dark:text-zinc-500 text-[11px] font-mono whitespace-nowrap ml-auto">
                    {row.lastLogin}
                  </div>
                </div>
              </div>
            ))
          )}
          </div>

          {/* Vista Desktop (Tabla de Personal) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Empleado</th>
                    <th className="py-3.5 px-4 font-semibold">Rol</th>
                    <th className="py-3.5 px-4 font-semibold">Ubicación</th>
                    <th className="py-3.5 px-4 font-semibold">Último Acceso</th>
                    <th className="py-3.5 px-4 font-semibold">Estado</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando personal...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No se encontraron empleados</td>
                    </tr>
                  ) : filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center font-bold text-sm text-purple-600 dark:text-purple-400 shrink-0">
                            {(row.name || "E").charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                          {row.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{row.location}</td>
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-xs">{row.lastLogin}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${
                          row.status === 'Activo'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(row)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            title="Editar Empleado"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                            title="Eliminar Empleado"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="py-3 px-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
              <span>Mostrando {filtered.length} de {employees.length} empleados</span>
            </div>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Empleado" : "Nuevo Empleado"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Nombre</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Carlos Ruiz"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Rol</label>
                  <input
                    required
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Mecánico"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Departamento</label>
                  <input
                    required
                    type="text"
                    list="dept-options"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="Taller, Ventas..."
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                  <datalist id="dept-options">
                    <option value="Taller" />
                    <option value="Ventas" />
                    <option value="Oficina" />
                    <option value="Gerencia" />
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MinimalSelect
                  label="Ubicación"
                  value={form.location?.includes("Principal") ? "Principal" : (form.location?.includes("Sucursal") || form.location?.includes("Norte")) ? "Sucursal" : (form.location || "Principal")}
                  onChange={(val) => setForm({ ...form, location: val })}
                  options={[
                    { value: "Principal", label: "Principal" },
                    { value: "Sucursal", label: "Sucursal" },
                    { value: "Ambas", label: "Ambas" },
                  ]}
                />
                <MinimalSelect
                  label="Estado"
                  value={form.status}
                  onChange={(val) => setForm({ ...form, status: val })}
                  options={[
                    {
                      value: "Activo",
                      label: "Activo",
                      customLabel: (
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>Activo</span>
                        </span>
                      ),
                    },
                    {
                      value: "Vacaciones",
                      label: "Vacaciones",
                      customLabel: (
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <span>Vacaciones</span>
                        </span>
                      ),
                    },
                    {
                      value: "Inactivo",
                      label: "Inactivo",
                      customLabel: (
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-zinc-400" />
                          <span>Inactivo</span>
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <GerenciaMobileNav />
    </div>
  );
}
