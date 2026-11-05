"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState } from "react";

export default function OrdenesCotizaciones() {
  const [view, setView] = useState<"ordenes" | "cotizaciones">("cotizaciones");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    docType: "cotizacion",
    clientName: "",
    vehicle: "",
    plate: "",
    status: "Pendiente Aprobación",
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
      console.error(e);
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
      status: view === "cotizaciones" ? "Pendiente Aprobación" : "En Taller",
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

  const handleDelete = async (id: string, docType: "cotizacion" | "orden") => {
    if (!confirm("¿Seguro que deseas eliminar este documento?")) return;
    await fetch(`/api/oficina/ordenes?id=${id}&docType=${docType}`, { method: "DELETE" });
    await loadData();
  };

  const filteredQuotes = quotes.filter((q) =>
    `${q.quoteNumber} ${q.clientName} ${q.vehicle} ${q.plate || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = orders.filter((o) =>
    `${o.orderNumber} ${o.client} ${o.vehicle} ${o.plate || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const pendingQuotesCount = quotes.filter((q) => q.status.includes("Pendiente")).length;
  const activeOrdersCount = orders.filter((o) => o.status !== "Terminado" && o.status !== "Entregado").length;
  const finishedOrdersCount = orders.filter((o) => o.status === "Terminado" || o.status === "Entregado").length;
  const totalQuoted = quotes.reduce((acc, q) => acc + Number(q.total || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Breadcrumb & Header */}
        <div className="order-1 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/oficina"
              title="Volver a Oficina"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-1 sm:mb-1.5">
                <Link href="/oficina" className="hover:text-blue-600 transition-colors">Oficina</Link>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Órdenes y Cotizaciones</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Gestión de Trabajos
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={openNewModal}
              className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              {view === "cotizaciones" ? "Nueva Cotización" : "Nueva Orden"}
            </button>
          </div>
        </div>

        {/* Resumen Cards Desplegable en Móvil */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg sm:text-xl flex-shrink-0">
                ⏳
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingQuotesCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Pendientes</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-lg sm:text-xl flex-shrink-0">
                🔧
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{activeOrdersCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">En Taller</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg sm:text-xl flex-shrink-0">
                ✅
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{finishedOrdersCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Terminados</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-lg sm:text-xl flex-shrink-0">
                💰
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">${totalQuoted.toFixed(0)}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Cotizado</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* View Switcher & Filtros */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mb-4 sm:mb-0 shadow-sm">
          <div className="grid grid-cols-2 md:flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setView("cotizaciones")}
              className={`px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${view === 'cotizaciones' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}
            >
              Cotizaciones ({quotes.length})
            </button>
            <button 
              onClick={() => setView("ordenes")}
              className={`px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${view === 'ordenes' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}
            >
              Órdenes ({orders.length})
            </button>
          </div>
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar placa, cliente o #ID..." 
              className="w-full h-11 sm:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-amber-500"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Tablas / Listados */}
        <div className="order-4">
          {/* Vista Móvil (Tarjetas adaptadas a facturas) */}
          <div className="md:hidden space-y-3.5">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                Cargando...
              </div>
            ) : view === "cotizaciones" ? (
              filteredQuotes.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  No hay cotizaciones registradas
                </div>
              ) : (
                filteredQuotes.map((row) => (
                  <div
                    key={row.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                          📋
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {row.clientName}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                              row.status.includes('Pendiente') ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                              row.status === 'Aprobada' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                              row.status === 'Facturada' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                              'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            }`}>
                              {row.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">#{row.quoteNumber}</span>
                            <span> • {row.vehicle} {row.plate ? `(${row.plate})` : ""}</span>
                          </p>
                        </div>
                      </div>

                      {/* Acciones Rápidas (Toque táctil >= 44px) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {row.status.includes('Pendiente') && (
                          <button
                            type="button"
                            onClick={() => handleApproveQuote(row)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer font-bold text-sm"
                            title="Aprobar Cotización"
                            aria-label="Aprobar Cotización"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(row, "cotizacion")}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-95 transition-all cursor-pointer"
                          title="Editar Cotización"
                          aria-label="Editar Cotización"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id, "cotizacion")}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                          title="Borrar Cotización"
                          aria-label="Borrar Cotización"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Datos secundarios (Total y Fecha) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold font-mono text-xs">
                        💰 ${Number(row.total || 0).toFixed(2)}
                      </span>

                      <span className="text-zinc-400 ml-auto text-[11px] whitespace-nowrap">
                        {row.date}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                No hay órdenes de trabajo registradas
              </div>
            ) : (
              filteredOrders.map((row) => (
                <div
                  key={row.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30">
                        🚗
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {row.client}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                            row.status.includes('Esperando') ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                            row.status === 'Terminado' || row.status === 'Entregado' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          }`}>
                            {row.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">#{row.orderNumber}</span>
                          <span> • {row.vehicle} ({row.plate})</span>
                        </p>
                      </div>
                    </div>

                    {/* Acciones Rápidas (Toque táctil >= 44px) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(row, "orden")}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-95 transition-all cursor-pointer"
                        title="Editar Orden"
                        aria-label="Editar Orden"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id, "orden")}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                        title="Borrar Orden"
                        aria-label="Borrar Orden"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Datos secundarios (Total) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-500/20 font-bold font-mono text-xs">
                      💰 ${Number(row.totalCost || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Desktop (Tabla Dinámica) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Documento</th>
                    <th className="py-3.5 px-4">Cliente / Vehículo</th>
                    <th className="py-3.5 px-4">Creado</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando...</td>
                    </tr>
                  ) : view === 'cotizaciones' ? (
                    filteredQuotes.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">#{row.quoteNumber}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.clientName}</p>
                          <p className="text-xs text-zinc-500">{row.vehicle} {row.plate ? `(${row.plate})` : ""}</p>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">{row.date}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            row.status.includes('Pendiente') ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                            row.status === 'Aprobada' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                            row.status === 'Facturada' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                            'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-zinc-100">
                          ${Number(row.total || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.status.includes('Pendiente') && (
                              <button
                                onClick={() => handleApproveQuote(row)}
                                className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 flex items-center justify-center shadow-xs"
                                title="Aprobar Cotización y Crear Orden en Taller"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(row, "cotizacion")}
                              className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all active:scale-95 flex items-center justify-center shadow-xs"
                              title="Editar Cotización"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(row.id, "cotizacion")}
                              className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredOrders.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-xs">#{row.orderNumber}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.client}</p>
                          <p className="text-xs text-zinc-500">{row.vehicle} ({row.plate})</p>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleDateString("es-EC")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            row.status.includes('Esperando') ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                            row.status === 'Terminado' || row.status === 'Entregado' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                            'bg-blue-50 text-blue-600 dark:bg-blue-500/10'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-zinc-100">
                          ${Number(row.totalCost || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(row, "orden")}
                              className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all active:scale-95 flex items-center justify-center shadow-xs"
                              title="Editar Orden"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(row.id, "orden")}
                              className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                              title="Eliminar Orden"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Documento" : form.docType === "cotizacion" ? "Nueva Cotización" : "Nueva Orden de Trabajo"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Cliente</label>
                <input
                  required
                  type="text"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Ej. Ricardo Montero"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
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
                    placeholder="Ej. Toyota Yaris"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Placa</label>
                  <input
                    type="text"
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value })}
                    placeholder="PCE-1234"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    {form.docType === "cotizacion" ? (
                      <>
                        <option value="Pendiente Aprobación">Pendiente Aprobación</option>
                        <option value="Aprobada">Aprobada</option>
                        <option value="Facturada">Facturada</option>
                        <option value="Rechazada">Rechazada</option>
                      </>
                    ) : (
                      <>
                        <option value="En Taller">En Taller</option>
                        <option value="En Diagnóstico">En Diagnóstico</option>
                        <option value="Esperando Repuestos">Esperando Repuestos</option>
                        <option value="Terminado">Terminado</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Total ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.total}
                    onChange={(e) => setForm({ ...form, total: e.target.value })}
                    placeholder="185.00"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Notas / Detalle del Trabajo</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Descripción del servicio..."
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
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
                  className="h-11 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <OficinaMobileNav />
    </div>
  );
}
