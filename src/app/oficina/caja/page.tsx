"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState } from "react";

export default function CajaLiquidaciones() {
  const [register, setRegister] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "EFECTIVO" | "TARJETA" | "EGRESO">("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: "INGRESO",
    description: "",
    method: "Efectivo",
    reference: "",
    amount: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oficina/caja");
      if (res.ok) {
        const data = await res.json();
        setRegister(data.register || null);
        setTransactions(data.transactions || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/oficina/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "movement", ...form }),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ type: "INGRESO", description: "", method: "Efectivo", reference: "", amount: "" });
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRegister = async () => {
    const isOpen = register?.status === "ABIERTA";
    if (!confirm(isOpen ? "¿Confirmas el cierre y cuadre de caja?" : "¿Deseas abrir un nuevo turno de caja?")) return;
    await fetch("/api/oficina/caja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_register" }),
    });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta transacción de caja?")) return;
    await fetch(`/api/oficina/caja?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const cashBalance = transactions
    .filter((t) => (t.method || "").includes("Efectivo"))
    .reduce((acc, t) => acc + (t.isIncome ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);

  const cardTotal = transactions
    .filter((t) => (t.method || "").includes("Tarjeta") && t.isIncome)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const transferTotal = transactions
    .filter((t) => (t.method || "").includes("Transferencia") && t.isIncome)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalIncome = transactions
    .filter((t) => t.isIncome)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const filtered = transactions.filter((t) => {
    if (filter === "EFECTIVO" && !(t.method || "").includes("Efectivo")) return false;
    if (filter === "TARJETA" && !(t.method || "").includes("Tarjeta")) return false;
    if (filter === "EGRESO" && t.isIncome) return false;
    if (search && !`${t.description} ${t.reference} ${t.method}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isOpen = register?.status === "ABIERTA";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Breadcrumb & Header */}
        <div className="order-1 mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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
              <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-1">
                <Link href="/oficina" className="hover:text-blue-600 transition-colors">Oficina</Link>
                <span>/</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">Caja y Liquidaciones</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex flex-wrap items-center gap-2.5">
                Flujo de Caja Diaria
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isOpen
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                  {isOpen ? "CAJA ABIERTA" : "CAJA CERRADA"}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1.5">
                Sesión: {register?.sessionNumber || "CAJ-ACTUAL"} — {register?.notes || "Turno actual"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setModalOpen(true)}
              className="h-11 px-3 sm:px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs sm:text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              <span>Movimiento</span>
            </button>
            <button
              onClick={handleToggleRegister}
              className={`h-11 px-4 sm:px-6 rounded-xl text-white font-bold text-xs sm:text-sm active:scale-[0.99] transition-all shadow-sm flex items-center justify-center ${isOpen ? "bg-teal-600 hover:bg-teal-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
            >
              {isOpen ? "Cerrar Caja" : "Abrir Turno"}
            </button>
          </div>
        </div>

        {/* Resumen por Método de Pago */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 md:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-base sm:text-lg flex-shrink-0">
                  💵
                </div>
                <span className="text-[11px] font-bold text-zinc-500">Saldo</span>
              </div>
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 truncate">Efectivo en Caja</h3>
                <p className="text-xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate">${cashBalance.toFixed(2)}</p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-base sm:text-lg flex-shrink-0">
                  💳
                </div>
              </div>
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 truncate">Tarjetas (POS)</h3>
                <p className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white truncate">${cardTotal.toFixed(2)}</p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-base sm:text-lg flex-shrink-0">
                  🏦
                </div>
              </div>
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 truncate">Transferencias</h3>
                <p className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white truncate">${transferTotal.toFixed(2)}</p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            </div>

            <div className="bg-teal-600 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between text-white border border-teal-500">
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center text-base sm:text-lg flex-shrink-0">
                  📊
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-teal-100 text-xs sm:text-sm font-medium mb-0.5 truncate">Total Ingresos</h3>
                <p className="text-xl sm:text-3xl font-bold truncate">${totalIncome.toFixed(2)}</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-full -mr-4 -mt-4"></div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Filtros de Tabla */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col lg:flex-row justify-between items-center gap-3 mb-4 sm:mb-0 shadow-sm">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 no-scrollbar">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap ${filter === "ALL" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold" : "text-zinc-500"}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("EFECTIVO")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap ${filter === "EFECTIVO" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold" : "text-zinc-500"}`}
            >
              Efectivo
            </button>
            <button
              onClick={() => setFilter("TARJETA")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap ${filter === "TARJETA" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold" : "text-zinc-500"}`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setFilter("EGRESO")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap text-rose-500 ${filter === "EGRESO" ? "bg-rose-50 dark:bg-rose-500/10 font-bold" : ""}`}
            >
              Egresos / Salidas
            </button>
          </div>
          <div className="relative w-full lg:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar recibo o factura..."
              className="w-full h-11 md:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-teal-500"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 md:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Contenedor de Movimientos */}
        <div className="order-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 sm:border-x sm:border-b sm:border-t-0 rounded-2xl sm:rounded-b-3xl sm:rounded-t-none overflow-hidden shadow-sm">
          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading ? (
              <div className="p-6 text-center text-sm text-zinc-500">Cargando caja...</div>
            ) : filtered.map((row) => (
              <div key={row.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 ${(row.method || "").includes('Efectivo') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                    (row.method || "").includes('Tarjeta') ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                      'bg-purple-50 text-purple-600 dark:bg-purple-500/10'
                    }`}>
                    {(row.method || "").includes('Efectivo') ? '💵' : (row.method || "").includes('Tarjeta') ? '💳' : '🏦'}
                    {row.method}
                  </span>
                  <span className="text-xs text-zinc-400">{row.dateLabel}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{row.description}</p>
                    <p className="text-xs text-zinc-500">Ref: {row.reference}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold text-base ${row.isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                      {row.isIncome ? "+" : "-"} ${Number(row.amount || 0).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-xs font-semibold active:scale-95 transition-transform"
                      title="Eliminar movimiento"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Hora / Fecha</th>
                  <th className="px-6 py-4 font-medium">Concepto</th>
                  <th className="px-6 py-4 font-medium">Método de Pago</th>
                  <th className="px-6 py-4 font-medium">Referencia</th>
                  <th className="px-6 py-4 font-medium text-right">Monto</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando caja...</td>
                  </tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.dateLabel}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {row.description}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${(row.method || "").includes('Efectivo') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                        (row.method || "").includes('Tarjeta') ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                          'bg-purple-50 text-purple-600 dark:bg-purple-500/10'
                        }`}>
                        {(row.method || "").includes('Efectivo') ? '💵' : (row.method || "").includes('Tarjeta') ? '💳' : '🏦'}
                        {row.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.reference}</td>
                    <td className={`px-6 py-4 text-right font-bold ${row.isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                      {row.isIncome ? "+" : "-"} ${Number(row.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Eliminar movimiento"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs sm:text-sm text-zinc-500">
            <span>Mostrando {filtered.length} transacciones</span>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Registrar Movimiento de Caja
            </h2>
            <form onSubmit={handleMovement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option value="INGRESO">Ingreso (+)</option>
                    <option value="EGRESO">Egreso / Salida (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Método de Pago</label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta Crédito (POS)">Tarjeta Crédito (POS)</option>
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Concepto</label>
                <input
                  required
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej. Cobro Factura F-001-1045"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Referencia</label>
                  <input
                    required
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Voucher #1024"
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
                    placeholder="120.00"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-5 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50"
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
