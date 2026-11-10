"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface CashMovement {
  id: string;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface CashSession {
  id: string;
  sessionNumber: string;
  status: "ABIERTA" | "CERRADA" | string;
  cashier: string;
  branch: string;
  openedAt: string;
  closedAt: string | null;
  initialCash: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesTransfer: number;
  totalSales: number;
  totalExpenses: number;
  declaredCash: number | null;
  differenceCash: number | null;
  notes: string | null;
  movements: CashMovement[];
}

export default function OficinaCajaPage() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"todas" | "abiertas" | "cerradas">("todas");
  const [search, setSearch] = useState("");

  // Modales
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CashSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editModal, setEditModal] = useState<CashSession | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    sessionNumber: "",
    cashier: "",
    branch: "Principal",
    initialCash: "",
    status: "ABIERTA",
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oficina/caja");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Abrir editar
  const openEdit = (s: CashSession) => {
    setEditModal(s);
    setForm({
      sessionNumber: s.sessionNumber,
      cashier: s.cashier,
      branch: s.branch || "Principal",
      initialCash: s.initialCash !== undefined ? String(s.initialCash) : "",
      status: s.status || "ABIERTA",
      notes: s.notes || "",
    });
  };

  // Guardar cambios de edición
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/oficina/caja", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editModal.id, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Error al guardar en base de datos Neon.");
        return;
      }
      setEditModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error al conectar con Neon.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar (DELETE)
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/oficina/caja?id=${deleteConfirm.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Error al eliminar en Neon.");
        return;
      }
      setDeleteConfirm(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error al eliminar en Neon.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado
  const filteredSessions = sessions.filter((s) => {
    if (tab === "abiertas" && s.status !== "ABIERTA") return false;
    if (tab === "cerradas" && s.status !== "CERRADA") return false;
    if (
      search &&
      !`${s.sessionNumber} ${s.cashier} ${s.branch} ${s.notes || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Métricas
  const totalCajas = sessions.length;
  const abiertasCount = sessions.filter((s) => s.status === "ABIERTA").length;
  const cerradasCount = sessions.filter((s) => s.status === "CERRADA").length;
  const ventasTotal = sessions.reduce((acc, s) => acc + (s.totalSales || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Cabecera Principal */}
        <div className="order-1 mb-6 md:mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/oficina"
              title="Volver a Oficina"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Caja
              </h1>
            </div>
          </div>
        </div>

        {/* Métricas Resumen */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 md:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 text-lg sm:text-xl flex-shrink-0">
                💼
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">{totalCajas}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Cajas</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg sm:text-xl flex-shrink-0">
                🟢
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{abiertasCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Abiertas</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-lg sm:text-xl flex-shrink-0">
                🔒
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">{cerradasCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Cerradas</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-teal-200 dark:border-teal-900/40 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 text-lg sm:text-xl flex-shrink-0">
                💰
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-teal-600 dark:text-teal-400 truncate">
                  ${ventasTotal.toFixed(2)}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Ventas</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Barra de Controles: Buscador a la izquierda y Pestañas a la derecha */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-2.5 sm:p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4 shadow-sm">
          {/* Buscador expandido */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar caja o cajero..."
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/70 focus:bg-white dark:focus:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xs"
            />
            <svg
              className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center text-zinc-500 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 text-[10px] font-bold absolute right-3 top-2.5 transition cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selector de Pestañas a la derecha */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl self-end sm:self-auto w-full md:w-auto shrink-0">
            <button
              onClick={() => setTab("todas")}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === "todas"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Todas ({sessions.length})
            </button>
            <button
              onClick={() => setTab("abiertas")}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === "abiertas"
                  ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Abiertas ({abiertasCount})
            </button>
            <button
              onClick={() => setTab("cerradas")}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === "cerradas"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Cerradas ({cerradasCount})
            </button>
          </div>
        </div>

        {/* Contenedor Principal de Datos */}
        <div className="order-4 flex-grow flex flex-col">
          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                Cargando...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                0 registros
              </div>
            ) : (
              filteredSessions.map((row) => (
                <div
                  key={row.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 font-mono">
                          #{row.sessionNumber}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            row.status === "ABIERTA"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mt-1">
                        👤 {row.cashier} • <span className="text-zinc-400">{row.branch}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedSession(row)}
                        className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center cursor-pointer"
                        title="Ver Detalle"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center cursor-pointer"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(row)}
                        className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[11px] text-zinc-400">Apertura</p>
                      <p className="font-mono text-zinc-600 dark:text-zinc-300 truncate">{formatDate(row.openedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-400">Cierre</p>
                      <p className="font-mono text-zinc-600 dark:text-zinc-300 truncate">
                        {row.closedAt ? formatDate(row.closedAt) : <span className="text-emerald-500 font-semibold">En curso</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 font-mono">
                    <span className="text-zinc-500">Fondo: ${Number(row.initialCash || 0).toFixed(2)}</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      Ventas: ${Number(row.totalSales || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Caja</th>
                    <th className="py-3.5 px-4">Cajero</th>
                    <th className="py-3.5 px-4">Apertura</th>
                    <th className="py-3.5 px-4">Cierre</th>
                    <th className="py-3.5 px-4 text-right">Fondo</th>
                    <th className="py-3.5 px-4 text-right">Ventas</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                        Cargando...
                      </td>
                    </tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                        0 registros
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                            #{row.sessionNumber}
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{row.branch}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.cashier}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {formatDate(row.openedAt)}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {row.closedAt ? (
                            formatDate(row.closedAt)
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              En curso
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-zinc-600 dark:text-zinc-300">
                          ${Number(row.initialCash || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                          ${Number(row.totalSales || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              row.status === "ABIERTA"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedSession(row)}
                              className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95 inline-flex items-center justify-center cursor-pointer shadow-xs"
                              title="Ver Detalle"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all active:scale-95 inline-flex items-center justify-center cursor-pointer shadow-xs"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(row)}
                              className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 inline-flex items-center justify-center cursor-pointer shadow-xs"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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

          <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs sm:text-sm text-zinc-500">
            <span>{filteredSessions.length} registros</span>
          </div>
        </div>
      </main>

      {/* Modal Editar Caja */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Editar
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Cajero</label>
                <input
                  required
                  type="text"
                  value={form.cashier}
                  onChange={(e) => setForm({ ...form, cashier: e.target.value })}
                  placeholder="Nombre del cajero"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Sede</label>
                  <select
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option value="Principal">Principal</option>
                    <option value="Sucursal">Sucursal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option value="ABIERTA">ABIERTA</option>
                    <option value="CERRADA">CERRADA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Fondo ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.initialCash}
                  onChange={(e) => setForm({ ...form, initialCash: e.target.value })}
                  placeholder="0.00"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Notas</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observaciones..."
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Caja (Arqueo / Movimientos) */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">
                  💼
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Detalle
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  selectedSession.status === "ABIERTA"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {selectedSession.status}
              </span>
            </div>

            {/* Cabecera de la sesión */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                  #{selectedSession.sessionNumber}
                </span>
                <span className="text-zinc-500 font-medium">{selectedSession.branch}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Cajero:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedSession.cashier}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Apertura:</span>
                <span className="font-mono">{formatDate(selectedSession.openedAt)}</span>
              </div>
              {selectedSession.closedAt && (
                <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Cierre:</span>
                  <span className="font-mono">{formatDate(selectedSession.closedAt)}</span>
                </div>
              )}
            </div>

            {/* Desglose Financiero */}
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-zinc-500 uppercase tracking-wider text-[11px]">Resumen Financiero</p>
              <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 space-y-2 font-mono">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Fondo Inicial</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    ${Number(selectedSession.initialCash || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-zinc-600 dark:text-zinc-400">Ventas Efectivo</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ${Number(selectedSession.totalSalesCash || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-zinc-600 dark:text-zinc-400">Ventas Tarjeta</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    ${Number(selectedSession.totalSalesCard || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-zinc-600 dark:text-zinc-400">Ventas Transferencia</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">
                    ${Number(selectedSession.totalSalesTransfer || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">Total Ventas</span>
                  <span className="font-black text-teal-600 dark:text-teal-400">
                    ${Number(selectedSession.totalSales || 0).toFixed(2)}
                  </span>
                </div>
                {Number(selectedSession.totalExpenses || 0) > 0 && (
                  <div className="flex justify-between items-center pt-2 text-rose-600">
                    <span>Gastos / Retiros</span>
                    <span className="font-bold">-${Number(selectedSession.totalExpenses || 0).toFixed(2)}</span>
                  </div>
                )}
                {selectedSession.declaredCash !== null && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-600 dark:text-zinc-400">Efectivo Declarado</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      ${Number(selectedSession.declaredCash || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedSession.differenceCash !== null && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-zinc-600 dark:text-zinc-400">Diferencia / Arqueo</span>
                    <span
                      className={`font-bold ${
                        Number(selectedSession.differenceCash || 0) === 0
                          ? "text-emerald-600"
                          : Number(selectedSession.differenceCash || 0) < 0
                          ? "text-rose-600"
                          : "text-blue-600"
                      }`}
                    >
                      ${Number(selectedSession.differenceCash || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Movimientos */}
            {selectedSession.movements && selectedSession.movements.length > 0 && (
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-zinc-500 uppercase tracking-wider text-[11px]">Movimientos de Turno</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedSession.movements.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex justify-between items-center"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{m.reason}</p>
                        <p className="text-[10px] text-zinc-400">{m.type}</p>
                      </div>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          m.type === "INGRESO" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {m.type === "INGRESO" ? "+" : "-"}${m.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="h-10 px-5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 text-white dark:text-zinc-900 text-sm font-bold transition-all shadow-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar para Eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Eliminar
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                #{deleteConfirm.sessionNumber} ({deleteConfirm.cashier})
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-bold transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <OficinaMobileNav />
    </div>
  );
}
