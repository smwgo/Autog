"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useEffect, useState } from "react";

export default function AuditoriaSistema() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modFilter, setModFilter] = useState("Todos los eventos");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    userName: "Juan Pérez (Gerente)",
    ipAddress: "192.168.1.10",
    module: "Facturación",
    action: "",
    details: "",
    level: "INFO",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gerencia/auditoria");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/gerencia/auditoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({
          userName: "Juan Pérez (Gerente)",
          ipAddress: "192.168.1.10",
          module: "Facturación",
          action: "",
          details: "",
          level: "INFO",
        });
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro de auditoría?")) return;
    await fetch(`/api/gerencia/auditoria?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const handleDownloadLogs = () => {
    const csv = [
      "Fecha,Usuario,IP,Modulo,Accion,Detalles,Nivel",
      ...logs.map((l) =>
        `"${l.dateLabel}","${l.userName}","${l.ipAddress}","${l.module}","${l.action}","${l.details}","${l.level}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auditoria-neon-logs.csv";
    a.click();
  };

  const filtered = logs.filter((l) => {
    if (modFilter === "Críticos") return l.level === "CRÍTICO";
    if (modFilter !== "Todos los eventos" && l.module !== modFilter) return false;
    return true;
  });

  const warningCount = logs.filter((l) => l.level === "ADVERTENCIA").length;
  const criticalCount = logs.filter((l) => l.level === "CRÍTICO").length;
  const loginCount = logs.filter((l) => l.module === "Inicios de sesión" || l.action.includes("Sesión")).length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Link href="/gerencia" className="hover:text-blue-600 transition-colors">Gerencia</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Auditoría de Sistema</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Registro de Actividades
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              + Registrar Evento
            </button>
            <button
              onClick={handleDownloadLogs}
              className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
              Descargar Logs
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              📝
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{logs.length}</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Eventos Registrados</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⚠️
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{warningCount}</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Advertencias</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-xl flex-shrink-0">
              ⛔
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{criticalCount}</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Alertas Críticas</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              🔐
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{loginCount}</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Inicios de Sesión</h3>
            </div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            {["Todos los eventos", "Inicios de sesión", "Facturación", "Inventario", "Taller", "Críticos"].map((tab) => (
              <button
                key={tab}
                onClick={() => setModFilter(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                  modFilter === tab
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                {tab === "Críticos" && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Auditoría */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                  <th className="px-6 py-4 font-medium">Usuario / IP</th>
                  <th className="px-6 py-4 font-medium">Módulo</th>
                  <th className="px-6 py-4 font-medium">Acción Realizada</th>
                  <th className="px-6 py-4 font-medium">Detalles (Antes &rarr; Después)</th>
                  <th className="px-6 py-4 font-medium text-center">Nivel</th>
                  <th className="px-6 py-4 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">Cargando auditoría desde Neon DB...</td>
                  </tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{row.dateLabel}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.userName}</p>
                      <p className="text-xs text-zinc-500">{row.ipAddress}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                        {row.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-800 dark:text-zinc-200">{row.action}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs max-w-xs truncate" title={row.details}>
                      {row.details}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.level === 'CRÍTICO' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                        row.level === 'ADVERTENCIA' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                        'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      }`}>
                        {row.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Eliminar evento"
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
            <span>Mostrando {filtered.length} eventos en Neon DB</span>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Registrar Evento de Auditoría
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Usuario</label>
                  <input
                    required
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Nivel</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option>INFO</option>
                    <option>ADVERTENCIA</option>
                    <option>CRÍTICO</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Módulo</label>
                <select
                  value={form.module}
                  onChange={(e) => setForm({ ...form, module: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                >
                  <option>Facturación</option>
                  <option>Inventario</option>
                  <option>Taller</option>
                  <option>Inicios de sesión</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Acción Realizada</label>
                <input
                  required
                  type="text"
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  placeholder="Ej. Modificación de Precio"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Detalles</label>
                <textarea
                  required
                  rows={2}
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="Descripción detallada del cambio..."
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                />
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
                  className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50"
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
