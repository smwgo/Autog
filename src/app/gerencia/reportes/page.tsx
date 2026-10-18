"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState } from "react";

export default function ReportesFinancieros() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
      reference: `F-001-${Math.floor(100 + Math.random() * 900)}`,
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
    if (!confirm("¿Eliminar este movimiento financiero de Neon DB?")) return;
    await fetch(`/api/gerencia/finanzas?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const handleExport = () => {
    const csv = [
      "Fecha,Descripcion,Categoria,Referencia,Tipo,Monto",
      ...transactions.map((t) =>
        `"${t.dateLabel}","${t.description}","${t.category}","${t.reference}","${t.isIncome ? "INGRESO" : "EGRESO"}",${t.amount}`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "estados-financieros-neon.csv";
    a.click();
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
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-1.5 sm:mb-2">
              <Link href="/gerencia" className="hover:text-blue-600 transition-colors">Gerencia</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Reportes Financieros</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Estados Financieros
            </h1>
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
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex sm:block items-center justify-between">
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Total Ingresos</h3>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">${totalIncome.toFixed(2)}</p>
              </div>
              <div className="sm:mt-4 text-[11px] sm:text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 inline-block px-2.5 py-1 rounded-lg">
                En vivo (Neon)
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex sm:block items-center justify-between">
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Total Egresos</h3>
                <p className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">${totalExpense.toFixed(2)}</p>
              </div>
              <div className="sm:mt-4 text-[11px] sm:text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 inline-block px-2.5 py-1 rounded-lg">
                Compras / Gastos
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex sm:block items-center justify-between">
              <div>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Flujo Neto</h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">${netFlow.toFixed(2)}</p>
              </div>
              <div className="sm:mt-4 text-[11px] sm:text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 inline-block px-2.5 py-1 rounded-lg">
                {netFlow >= 0 ? "Margen Saludable" : "Déficit"}
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Filtros de Tabla */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mb-4 sm:mb-0 shadow-sm">
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {["Todos", "Ventas", "Compras", "Operativos", "Impuestos SRI"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  catFilter === cat
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar transacción..." 
              className="w-full h-11 sm:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-blue-500"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Tablas / Listados */}
        <div className="order-4">
          {/* Vista Móvil (Tarjetas nativas Android / iOS) */}
          <div className="md:hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 sm:border-x sm:border-b rounded-2xl sm:rounded-b-2xl divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm">
          {loading ? (
            <div className="p-6 text-center text-sm text-zinc-500">Cargando finanzas desde Neon DB...</div>
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
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando finanzas desde Neon DB...</td>
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
            <span>Mostrando {filtered.length} de {transactions.length} transacciones en Neon DB</span>
          </div>
        </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Movimiento Financiero" : "Nueva Transacción Financiera"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Tipo</label>
                  <select
                    value={form.isIncome ? "INGRESO" : "EGRESO"}
                    onChange={(e) => setForm({ ...form, isIncome: e.target.value === "INGRESO" })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option value="INGRESO">Ingreso (+)</option>
                    <option value="EGRESO">Egreso (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option>Ventas</option>
                    <option>Compras</option>
                    <option>Operativos</option>
                    <option>Impuestos SRI</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Descripción</label>
                <input
                  required
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej. Pago Orden de Reparación #1045"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
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
                    placeholder="F-001-045"
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
                    placeholder="450.00"
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
                  {saving ? "Guardando..." : "Guardar en Neon"}
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
