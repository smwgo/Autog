"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

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
        className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition flex items-center justify-between gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
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
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm transition cursor-pointer ${active
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                  }`}
              >
                <span>{opt.customLabel || opt.label}</span>
                {active && (
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
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

export default function OrdenesCotizaciones() {
  const [view, setView] = useState<"ordenes" | "cotizaciones">("ordenes");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    docType: "cotizacion",
    clientName: "",
    vehicle: "",
    plate: "",
    status: "Pendiente",
    total: "",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oficina/ordenes");
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes || []);
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error("Error al cargar órdenes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewModal = () => {
    setEditingItem(null);
    setForm({
      docType: view === "cotizaciones" ? "cotizacion" : "orden",
      clientName: "",
      vehicle: "",
      plate: "",
      status: view === "cotizaciones" ? "Pendiente" : "En Taller",
      total: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (item: any, docType: "cotizacion" | "orden") => {
    setEditingItem({ ...item, docType });
    setForm({
      docType,
      clientName: docType === "cotizacion" ? item.clientName : item.client,
      vehicle: item.vehicle || "",
      plate: item.plate || "",
      status: item.status || "",
      total: String(docType === "cotizacion" ? item.total : (item.totalCost || 0)),
      notes: item.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = editingItem ? { id: editingItem.id, ...form } : form;
      const res = await fetch("/api/oficina/ordenes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModalOpen(false);
        await loadData();
      }
    } catch (err) {
      console.error("Error al guardar:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveQuote = async (quote: any) => {
    await fetch("/api/oficina/ordenes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: quote.id,
        docType: "cotizacion",
        quoteNumber: quote.quoteNumber,
        clientName: quote.clientName,
        vehicle: quote.vehicle,
        plate: quote.plate,
        total: quote.total,
        status: "Aprobada",
        convertToOrder: true,
      }),
    });
    await loadData();
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; docType: "cotizacion" | "orden"; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = (id: string, docType: "cotizacion" | "orden", name: string) => {
    setDeleteConfirm({ id, docType, name });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/oficina/ordenes?id=${deleteConfirm.id}&docType=${deleteConfirm.docType}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await loadData();
    } catch (e) {
      console.error("Error al eliminar:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const isQuotes = view === "cotizaciones";
    const data = isQuotes
      ? quotes.map((q) => ({
        Documento: q.quoteNumber,
        Cliente: q.clientName,
        Vehículo: q.vehicle,
        Placa: q.plate || "",
        Fecha: q.date,
        Estado: q.status,
        Total: Number(q.total || 0),
      }))
      : orders.map((o) => ({
        Documento: o.orderNumber,
        Cliente: o.client,
        Vehículo: o.vehicle,
        Placa: o.plate || "",
        Fecha: new Date(o.createdAt).toLocaleDateString("es-EC"),
        Estado: o.status,
        Total: Number(o.totalCost || 0),
      }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isQuotes ? "Cotizaciones" : "Ordenes");
    XLSX.writeFile(workbook, `${isQuotes ? "cotizaciones" : "ordenes"}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== "TODOS" && q.status !== statusFilter) return false;
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return `${q.quoteNumber} ${q.clientName} ${q.vehicle} ${q.plate || ""}`.toLowerCase().includes(term);
    });
  }, [quotes, statusFilter, search]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "TODOS" && o.status !== statusFilter) return false;
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return `${o.orderNumber} ${o.client} ${o.vehicle} ${o.plate || ""}`.toLowerCase().includes(term);
    });
  }, [orders, statusFilter, search]);

  const pendingQuotesCount = quotes.filter((q) => (q.status || "").toLowerCase().includes("pendiente")).length;
  const activeOrdersCount = orders.filter((o) => o.status !== "Terminado" && o.status !== "Entregado").length;
  const finishedOrdersCount = orders.filter((o) => o.status === "Terminado" || o.status === "Entregado").length;
  const totalQuoted = quotes.reduce((acc, q) => acc + Number(q.total || 0), 0);

  const formatMoney = (amount: number) => {
    return "$" + Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-[#07090e] font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col space-y-6">

        {/* =====================================================================
            CABECERA EJECUTIVA ESTILO GERENCIA (Sin Breadcrumbs)
            ===================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
          <div className="flex items-center gap-3">
            <Link
              href="/oficina"
              title="Volver a Oficina"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white hover:bg-zinc-100 dark:bg-[#0d121c] dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-all flex items-center justify-center shrink-0 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Órdenes</span>
              </h1>
            </div>
          </div>

          {/* Acciones principales alineadas a la derecha */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={handleExport}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-white dark:bg-[#0d121c] hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            4 KPIS EJECUTIVOS ESTILO GERENCIA (ARRIBA DEL BUSCADOR)
            ===================================================================== */}
        <CollapsibleMetrics className="w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

            {/* KPI 1: PENDIENTES */}
            <div className="bg-white dark:bg-[#0d121c] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider truncate">
                  Pendientes
                </span>
              </div>
              <div className="relative z-10 pt-1">
                <p className="text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400 tracking-tight truncate">
                  {loading ? "..." : pendingQuotesCount}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 opacity-[0.04] dark:opacity-[0.06] rounded-bl-full pointer-events-none" />
            </div>

            {/* KPI 2: TALLER */}
            <div className="bg-white dark:bg-[#0d121c] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider truncate">
                  Taller
                </span>
              </div>
              <div className="relative z-10 pt-1">
                <p className="text-2xl sm:text-3xl font-black text-blue-500 dark:text-blue-400 tracking-tight truncate">
                  {loading ? "..." : activeOrdersCount}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-[0.04] dark:opacity-[0.06] rounded-bl-full pointer-events-none" />
            </div>

            {/* KPI 3: TERMINADOS */}
            <div className="bg-white dark:bg-[#0d121c] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider truncate">
                  Terminados
                </span>
              </div>
              <div className="relative z-10 pt-1">
                <p className="text-2xl sm:text-3xl font-black text-emerald-500 dark:text-emerald-400 tracking-tight truncate">
                  {loading ? "..." : finishedOrdersCount}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-[0.04] dark:opacity-[0.06] rounded-bl-full pointer-events-none" />
            </div>

            {/* KPI 4: COTIZADO */}
            <div className="bg-white dark:bg-[#0d121c] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <span className="font-bold text-sm">$</span>
                </div>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider truncate">
                  Cotizado
                </span>
              </div>
              <div className="relative z-10 pt-1">
                <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight truncate">
                  {loading ? "..." : formatMoney(totalQuoted)}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 opacity-[0.04] dark:opacity-[0.06] rounded-bl-full pointer-events-none" />
            </div>

          </div>
        </CollapsibleMetrics>

        {/* =====================================================================
            BARRA DE BUSCADOR (IZQUIERDA, MÁS LARGO) Y FILTROS/PESTAÑAS (DERECHA)
            ===================================================================== */}
        <div className="bg-white dark:bg-[#0d121c] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-2.5 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
          {/* Buscador a la izquierda (más largo) */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar placa, cliente o #ID..."
              className="w-full h-11 sm:h-10 pl-10 pr-10 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 transition shadow-xs"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 sm:top-2.5 text-zinc-400 hover:text-zinc-200 text-xs p-1 rounded-md"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros / Selector de Pestañas a la derecha */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900/90 p-1 rounded-xl shrink-0 w-full sm:w-auto">
            <button
              onClick={() => { setView("ordenes"); setStatusFilter("TODOS"); }}
              className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${view === 'ordenes'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
            >
              Órdenes ({orders.length})
            </button>
            <button
              onClick={() => { setView("cotizaciones"); setStatusFilter("TODOS"); }}
              className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${view === 'cotizaciones'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
            >
              Cotizaciones ({quotes.length})
            </button>
          </div>
        </div>

        {/* =====================================================================
            TABLA EJECUTIVA DESKTOP Y TARJETAS MÓVIL
            ===================================================================== */}
        <div>
          {/* Vista Móvil */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-[#0d121c] rounded-2xl border border-zinc-200 dark:border-zinc-800">
                Cargando...
              </div>
            ) : view === "cotizaciones" ? (
              filteredQuotes.length === 0 ? null : (
                filteredQuotes.map((row) => (
                  <div
                    key={row.id}
                    className="bg-white dark:bg-[#0d121c] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {row.clientName}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${row.status.includes('Pendiente') ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            row.status === 'Aprobada' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              row.status === 'Facturada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                            {row.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1 truncate">
                          <span className="font-bold text-amber-500">#{row.quoteNumber}</span>
                          <span> • {row.vehicle} {row.plate ? `(${row.plate})` : ""}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {row.status.includes('Pendiente') && (
                          <button
                            type="button"
                            onClick={() => handleApproveQuote(row)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 cursor-pointer font-bold"
                            title="Aprobar Cotización"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(row, "cotizacion")}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-blue-400 bg-zinc-100 dark:bg-zinc-800/80 active:scale-95 cursor-pointer"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(row.id, "cotizacion", row.quoteNumber)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-400 bg-zinc-100 dark:bg-zinc-800/80 active:scale-95 cursor-pointer"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                      <span className="font-bold font-mono text-sm text-zinc-900 dark:text-white">
                        ${Number(row.total || 0).toFixed(2)}
                      </span>
                      <span className="text-zinc-500 text-xs">{row.date}</span>
                    </div>
                  </div>
                ))
              )
            ) : filteredOrders.length === 0 ? null : (
              filteredOrders.map((row) => (
                <div
                  key={row.id}
                  className="bg-white dark:bg-[#0d121c] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {row.client}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${row.status.includes('Esperando') ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          row.status === 'Terminado' || row.status === 'Entregado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                          {row.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1 truncate">
                        <span className="font-bold text-blue-500">#{row.orderNumber}</span>
                        <span> • {row.vehicle} {row.plate ? `(${row.plate})` : ""}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(row, "orden")}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-blue-400 bg-zinc-100 dark:bg-zinc-800/80 active:scale-95 cursor-pointer"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(row.id, "orden", row.orderNumber)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-400 bg-zinc-100 dark:bg-zinc-800/80 active:scale-95 cursor-pointer"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <span className="font-bold font-mono text-sm text-zinc-900 dark:text-white">
                      ${Number(row.totalCost || 0).toFixed(2)}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      {new Date(row.createdAt).toLocaleDateString("es-EC")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Desktop (Tabla Ejecutiva estilo Gerencia) */}
          <div className="hidden md:block bg-white dark:bg-[#0d121c] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-4 px-5">DOCUMENTO</th>
                    <th className="py-4 px-5">CLIENTE / VEHÍCULO</th>
                    <th className="py-4 px-5">CREADO</th>
                    <th className="py-4 px-5">ESTADO</th>
                    <th className="py-4 px-5 text-right">TOTAL</th>
                    <th className="py-4 px-5 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                        Cargando registros...
                      </td>
                    </tr>
                  ) : view === "cotizaciones" ? (
                    filteredQuotes.length === 0 ? null : (
                      filteredQuotes.map((row) => (
                        <tr key={row.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-4 px-5">
                            <span className="font-bold text-amber-500 font-mono text-xs">#{row.quoteNumber}</span>
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.clientName}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.vehicle} {row.plate ? `(${row.plate})` : ""}</p>
                          </td>
                          <td className="py-4 px-5 text-zinc-500 text-xs whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.status.includes('Pendiente') ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              row.status === 'Aprobada' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                row.status === 'Facturada' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right font-black text-zinc-900 dark:text-white font-mono">
                            ${Number(row.total || 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {row.status.includes('Pendiente') && (
                                <button
                                  onClick={() => handleApproveQuote(row)}
                                  className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all active:scale-95 flex items-center justify-center cursor-pointer font-bold"
                                  title="Aprobar y Enviar a Taller"
                                >
                                  ✓
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(row, "cotizacion")}
                                className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-blue-500/10 text-zinc-500 hover:text-blue-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                title="Editar Cotización"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => confirmDelete(row.id, "cotizacion", row.quoteNumber)}
                                className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                title="Eliminar Cotización"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    filteredOrders.length === 0 ? null : (
                      filteredOrders.map((row) => (
                        <tr key={row.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-4 px-5">
                            <span className="font-bold text-blue-500 font-mono text-xs">#{row.orderNumber}</span>
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.client}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.vehicle} {row.plate ? `(${row.plate})` : ""}</p>
                          </td>
                          <td className="py-4 px-5 text-zinc-500 text-xs whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleDateString("es-EC")}
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.status.includes('Esperando') ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              row.status === 'Terminado' || row.status === 'Entregado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right font-black text-zinc-900 dark:text-white font-mono">
                            ${Number(row.totalCost || 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(row, "orden")}
                                className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-blue-500/10 text-zinc-500 hover:text-blue-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                title="Editar Orden"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => confirmDelete(row.id, "orden", row.orderNumber)}
                                className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                                title="Eliminar Orden"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer con conteo exacto */}
            <div className="p-4 sm:p-5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex justify-between items-center text-xs sm:text-sm text-zinc-500">
              <span>Mostrando {view === "cotizaciones" ? filteredQuotes.length : filteredOrders.length} de {view === "cotizaciones" ? quotes.length : orders.length} registros</span>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          MODAL CREAR / EDITAR (Estilo Gerencia Dark)
          ===================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#0d121c] rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                {editingItem ? "Editar Documento" : form.docType === "cotizacion" ? "Nueva Cotización" : "Nueva Orden de Trabajo"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Cliente</label>
                <input
                  required
                  type="text"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Nombre completo del cliente"
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-sm text-zinc-900 dark:text-white outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Vehículo</label>
                  <input
                    required
                    type="text"
                    value={form.vehicle}
                    onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                    placeholder="Marca y modelo"
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-sm text-zinc-900 dark:text-white outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Placa</label>
                  <input
                    type="text"
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                    placeholder="ABC-1234"
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <MinimalSelect
                    label="Estado"
                    value={form.status}
                    onChange={(val) => setForm({ ...form, status: val })}
                    options={
                      form.docType === "cotizacion"
                        ? [
                          { value: "Pendiente", label: "Pendiente" },
                          { value: "Aprobada", label: "Aprobada" },
                          { value: "Facturada", label: "Facturada" },
                          { value: "Rechazada", label: "Rechazada" },
                        ]
                        : [
                          { value: "En Taller", label: "En Taller" },
                          { value: "En Diagnóstico", label: "En Diagnóstico" },
                          { value: "Esperando Repuestos", label: "Esperando Repuestos" },
                          { value: "Terminado", label: "Terminado" },
                        ]
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Total ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.total}
                    onChange={(e) => setForm({ ...form, total: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-sm font-mono text-zinc-900 dark:text-white outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Notas / Detalle del Trabajo</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Detalles u observaciones..."
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/50 text-sm text-zinc-900 dark:text-white outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold active:scale-95 disabled:opacity-50 transition cursor-pointer shadow-sm shadow-amber-500/20"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f141d] border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Eliminar</h3>
            </div>

            <p className="text-sm text-zinc-300">
              ¿Eliminar <span className="font-bold text-white font-mono">#{deleteConfirm.name}</span>?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="h-10 rounded-xl border border-zinc-700 text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold active:scale-95 disabled:opacity-50 transition cursor-pointer"
              >
                {isDeleting ? "..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <OficinaMobileNav />
    </div>
  );
}
