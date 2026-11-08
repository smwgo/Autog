"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

const categoryOptions = [
  { value: "Todos", label: "Todas" },
  { value: "Ventas", label: "Ventas" },
  { value: "Compras", label: "Compras" },
  { value: "Operativos", label: "Operativos" },
  { value: "Impuestos SRI", label: "Impuestos" },
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
        className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition flex items-center justify-between gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
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

export default function ReportesFinancieros() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const catMenuRef = useRef<HTMLDivElement>(null);
  const catButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!catMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) {
        setCatMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCatMenuOpen(false);
        catButtonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [catMenuOpen]);

  const [form, setForm] = useState({
    dateLabel: "Hoy",
    description: "",
    category: "Ventas",
    reference: "",
    amount: "",
    isIncome: true,
    method: "Transferencia",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gerencia/finanzas");
      if (res.ok) {
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
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
      dateLabel: new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }),
      description: "",
      category: "Ventas",
      reference: "",
      amount: "",
      isIncome: true,
      method: "Transferencia",
    });
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingItem(row);
    setForm({
      dateLabel: row.dateLabel || "Hoy",
      description: row.description || "",
      category: row.category || "Ventas",
      reference: row.reference || "",
      amount: String(row.amount || 0),
      isIncome: Boolean(row.isIncome),
      method: row.method || "Efectivo",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = editingItem ? { id: editingItem.id, ...form } : form;
      const res = await fetch("/api/gerencia/finanzas", {
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
    if (!confirm("¿Eliminar este movimiento financiero?")) return;
    await fetch(`/api/gerencia/finanzas?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const handleExport = () => {
    const data = transactions.map((t) => ({
      Fecha: t.dateLabel || "",
      Descripción: t.description || "",
      Categoría: t.category || "",
      Referencia: t.reference || "",
      Tipo: t.isIncome ? "Ingreso" : "Egreso",
      Método: t.method || "—",
      Monto: Number(t.amount || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Finanzas");
    XLSX.writeFile(workbook, `estados-financieros-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalIncome = transactions.filter((t) => t.isIncome).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalExpense = transactions.filter((t) => !t.isIncome).reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const netFlow = totalIncome - totalExpense;

  const filtered = transactions.filter((t) => {
    if (catFilter !== "Todos" && t.category !== catFilter) return false;
    if (search && !`${t.description} ${t.reference} ${t.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Estados Financieros
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={openNew}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-xl bg-blue-600 text-white font-semibold text-xs sm:text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>+</span>
              <span>Nueva Transacción</span>
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

        {/* Resumen Cards */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex sm:block items-center justify-between">
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Ingresos</h3>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">${totalIncome.toFixed(2)}</p>
              </div>
              <div className="sm:mt-4 text-[11px] sm:text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 inline-block px-2.5 py-1 rounded-lg">
                En vivo
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex sm:block items-center justify-between">
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Egresos</h3>
                <p className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">${totalExpense.toFixed(2)}</p>
              </div>
              <div className="sm:mt-4 text-[11px] sm:text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 inline-block px-2.5 py-1 rounded-lg">
                Compras / Gastos
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex sm:block items-center justify-between">
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Neto</h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">${netFlow.toFixed(2)}</p>
              </div>
              <div className="sm:mt-4 text-[11px] sm:text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 inline-block px-2.5 py-1 rounded-lg">
                {netFlow >= 0 ? "Margen Saludable" : "Déficit"}
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
              placeholder="Buscar transacción..." 
              className="w-full h-11 sm:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>

          {/* Filtro desplegable personalizado minimalista */}
          <div className="relative w-full sm:w-44 shrink-0" ref={catMenuRef}>
            <button
              ref={catButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={catMenuOpen}
              onClick={() => setCatMenuOpen((prev) => !prev)}
              className="w-full h-11 sm:h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition flex items-center justify-between gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <span className="truncate">{catFilter === "Todos" ? "Categorías" : categoryOptions.find((o) => o.value === catFilter)?.label || catFilter}</span>
              <svg
                className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 ${catMenuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {catMenuOpen && (
              <div
                role="menu"
                aria-label="Seleccionar categoría"
                className="absolute right-0 z-30 mt-2 w-full sm:w-44 origin-top-right rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#121824]/95 p-1.5 shadow-xl shadow-zinc-900/10 dark:shadow-black/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/5"
              >
                {categoryOptions.map((opt) => {
                  const active = catFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCatFilter(opt.value);
                        setCatMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm transition ${
                        active
                          ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {active && (
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
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
          {/* Vista Móvil (Tarjetas nativas Android / iOS) */}
          <div className="md:hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 sm:border-x sm:border-b rounded-2xl sm:rounded-b-2xl divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm">
          {loading ? (
            <div className="p-6 text-center text-sm text-zinc-500">Cargando reportes...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">No se encontraron transacciones</div>
          ) : (
            filtered.map((row) => (
              <div key={row.id} className="p-4 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">{row.description}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{row.dateLabel} • Ref: {row.reference}</p>
                  </div>
                  <span className={`text-base font-extrabold whitespace-nowrap ${row.isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {row.isIncome ? "+" : "-"} ${Number(row.amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                    {row.category} ({row.method || "Efectivo"})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(row)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold active:scale-95"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold active:scale-95"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista Desktop (Tabla de Movimientos) */}
        <div className="hidden md:block bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Descripción</th>
                  <th className="px-6 py-4 font-medium">Categoría</th>
                  <th className="px-6 py-4 font-medium">Referencia</th>
                  <th className="px-6 py-4 font-medium text-right">Monto</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando reportes...</td>
                  </tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{row.dateLabel}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{row.description}</td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                        {row.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.reference}</td>
                    <td className={`px-6 py-4 text-right font-bold ${row.isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {row.isIncome ? "+" : "-"} ${Number(row.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Eliminar"
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
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando {filtered.length} de {transactions.length} transacciones</span>
          </div>
        </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Movimiento Financiero" : "Nueva Transacción Financiera"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MinimalSelect
                  label="Tipo"
                  value={form.isIncome ? "INGRESO" : "EGRESO"}
                  onChange={(val) => setForm({ ...form, isIncome: val === "INGRESO" })}
                  options={[
                    {
                      value: "INGRESO",
                      label: "Ingreso (+)",
                      customLabel: (
                        <span className="flex items-center gap-1.5">
                          <span>Ingreso</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">(+)</span>
                        </span>
                      ),
                    },
                    {
                      value: "EGRESO",
                      label: "Egreso (-)",
                      customLabel: (
                        <span className="flex items-center gap-1.5">
                          <span>Egreso</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">(-)</span>
                        </span>
                      ),
                    },
                  ]}
                />
                <MinimalSelect
                  label="Categoría"
                  value={form.category}
                  onChange={(val) => setForm({ ...form, category: val })}
                  options={[
                    { value: "Ventas", label: "Ventas" },
                    { value: "Compras", label: "Compras" },
                    { value: "Operativos", label: "Operativos" },
                    { value: "Impuestos SRI", label: "Impuestos SRI" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Descripción</label>
                <input
                  required
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción del movimiento"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Referencia</label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Opcional"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Monto ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
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
                  className="h-11 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
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
