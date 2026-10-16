"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
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
    if (!confirm(isOpen ? "¿Confirmas el cierre y cuadre de caja en Neon DB?" : "¿Deseas abrir un nuevo turno de caja?")) return;
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Link href="/oficina" className="hover:text-blue-600 transition-colors">Oficina</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Caja y Liquidaciones</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
              Flujo de Caja Diaria
              <span className={`text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                isOpen
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                {isOpen ? "CAJA ABIERTA" : "CAJA CERRADA"}
              </span>
            </h1>
            <p className="text-sm text-zinc-500 mt-2">
              Sesión: {register?.sessionNumber || "CAJ-ACTUAL"} — {register?.notes || "Turno en Neon DB"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Ingreso / Egreso Manual
            </button>
            <button
              onClick={handleToggleRegister}
              className={`h-10 px-6 rounded-xl text-white font-bold text-sm transition-colors shadow-sm ${
                isOpen ? "bg-teal-600 hover:bg-teal-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isOpen ? "Cerrar Caja (Cuadre)" : "Abrir Nuevo Turno"}
            </button>
          </div>
        </div>

        {/* Resumen por Método de Pago */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg flex-shrink-0">
                💵
              </div>
              <span className="text-xs font-bold text-zinc-500">Saldo Actual</span>
            </div>
            <div>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-0.5">Efectivo en Caja</h3>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">${cashBalance.toFixed(2)}</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-lg flex-shrink-0">
                💳
              </div>
            </div>
            <div>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-0.5">Tarjetas (POS)</h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">${cardTotal.toFixed(2)}</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-lg flex-shrink-0">
                🏦
              </div>
            </div>
            <div>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-0.5">Transferencias</h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">${transferTotal.toFixed(2)}</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
          </div>

          <div className="bg-teal-600 p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between text-white border border-teal-500">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">
                📊
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-teal-100 text-sm font-medium mb-0.5">Total Ingresos del Turno</h3>
              <p className="text-3xl font-bold">${totalIncome.toFixed(2)}</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-full -mr-4 -mt-4"></div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${filter === "ALL" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500"}`}
            >
              Todas las Transacciones
            </button>
            <button
              onClick={() => setFilter("EFECTIVO")}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${filter === "EFECTIVO" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500"}`}
            >
              Solo Efectivo
            </button>
            <button
              onClick={() => setFilter("TARJETA")}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${filter === "TARJETA" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500"}`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setFilter("EGRESO")}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap text-rose-500 ${filter === "EGRESO" ? "bg-rose-50 dark:bg-rose-500/10" : ""}`}
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
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-teal-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Tabla Dinámica */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
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
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando caja desde Neon DB...</td>
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
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
                        (row.method || "").includes('Efectivo') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                        (row.method || "").includes('Tarjeta') ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                        'bg-purple-50 text-purple-600 dark:bg-purple-500/10'
                      }`}>
                        {(row.method || "").includes('Efectivo') ? '💵' : (row.method || "").includes('Tarjeta') ? '💳' : '🏦'}
                        {row.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.reference}</td>
                    <td className={`px-6 py-4 text-right font-bold ${
                      row.isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando {filtered.length} transacciones en Neon DB</span>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Registrar Movimiento de Caja
            </h2>
            <form onSubmit={handleMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
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
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
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
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Referencia</label>
                  <input
                    required
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Voucher #1024"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
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
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar en Neon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
