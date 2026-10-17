"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState } from "react";

export default function FacturacionSRI() {
  const [tab, setTab] = useState<"facturas" | "notas">("facturas");
  const [facturas, setFacturas] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    docType: "factura",
    clientName: "",
    clientRfc: "",
    concept: "",
    amount: "",
    status: "Autorizado",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oficina/facturacion");
      if (res.ok) {
        const data = await res.json();
        setFacturas(data.facturas || []);
        setNotas(data.notas || []);
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
      docType: tab === "facturas" ? "factura" : "nota",
      clientName: "",
      clientRfc: "",
      concept: tab === "facturas" ? "Servicio Automotriz" : "Aplica a F-1042",
      amount: "",
      status: "Autorizado",
    });
    setModalOpen(true);
  };

  const openEdit = (row: any, docType: "factura" | "nota") => {
    setEditingItem({ ...row, docType });
    setForm({
      docType,
      clientName: row.clientName || "",
      clientRfc: docType === "factura" ? (row.clientRfc || "") : (row.clientRuc || ""),
      concept: docType === "factura" ? (row.concept || "") : (row.invoiceRef || ""),
      amount: String(docType === "factura" ? row.amount : row.total),
      status: row.status || "Autorizado",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = editingItem
        ? {
            id: editingItem.id,
            docType: form.docType,
            clientName: form.clientName,
            clientRfc: form.clientRfc,
            concept: form.concept,
            invoiceRef: form.concept,
            amount: form.amount,
            total: form.amount,
            status: form.status,
          }
        : {
            docType: form.docType,
            clientName: form.clientName,
            clientRfc: form.clientRfc,
            clientRuc: form.clientRfc,
            concept: form.concept,
            invoiceRef: form.concept,
            amount: form.amount,
            total: form.amount,
            status: form.status,
          };

      const res = await fetch("/api/oficina/facturacion", {
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

  const handleDelete = async (id: string, docType: "factura" | "nota") => {
    if (!confirm("¿Eliminar este comprobante electrónico de Neon DB?")) return;
    await fetch(`/api/oficina/facturacion?id=${id}&docType=${docType}`, { method: "DELETE" });
    await loadData();
  };

  const filteredFacturas = facturas.filter((f) =>
    `${f.invoiceNumber} ${f.clientName} ${f.clientRfc}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNotas = notas.filter((n) =>
    `${n.noteNumber} ${n.clientName} ${n.invoiceRef}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalFacturado = facturas
    .filter((f) => f.status === "Autorizado" || f.status === "Pagada")
    .reduce((acc, f) => acc + Number(f.amount || 0), 0);
  const pendientesCount = facturas.filter((f) => f.status === "Pendiente").length;
  const rechazadosCount = facturas.filter((f) => f.status === "Rechazado").length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-1.5">
              <Link href="/oficina" className="hover:text-blue-600 transition-colors">Oficina</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Facturación y SRI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Documentos Electrónicos
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={openNew}
              className="w-full sm:w-auto h-11 px-4 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              {tab === "facturas" ? "Emitir Factura Manual" : "Emitir Nota de Crédito"}
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <CollapsibleMetrics
          title="Resumen de Facturación SRI"
          subtitle={`$${totalFacturado.toFixed(2)} autorizados • ${pendientesCount} pendientes`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 md:mb-8">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg sm:text-xl flex-shrink-0">
                💵
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">${totalFacturado.toFixed(2)}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Autorizado</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg sm:text-xl flex-shrink-0">
                ⏳
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{pendientesCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Pendientes</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-lg sm:text-xl flex-shrink-0">
                ❌
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400">{rechazadosCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Rechazados</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-lg sm:text-xl flex-shrink-0">
                🧾
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">{notas.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Notas Créd.</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* View Switcher & Filtros */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setTab("facturas")}
              className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${tab === 'facturas' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Facturas ({facturas.length})
            </button>
            <button 
              onClick={() => setTab("notas")}
              className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${tab === 'notas' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Notas de Crédito ({notas.length})
            </button>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:w-72">
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente o # documento..." 
                className="w-full h-11 md:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-purple-500"
              />
              <svg className="w-4 h-4 absolute left-3.5 top-3.5 md:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </div>

        {/* Contenedor de Documentos */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-2xl sm:rounded-b-3xl overflow-hidden shadow-sm">
          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading ? (
              <div className="p-6 text-center text-sm text-zinc-500">Cargando documentos desde Neon DB...</div>
            ) : tab === "facturas" ? (
              filteredFacturas.map((row) => (
                <div key={row.id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {row.invoiceNumber}
                      </span>
                      <span className="text-xs text-zinc-400">{row.date}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                      row.status === 'Pendiente' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                      row.status === 'Autorizado' || row.status === 'Pagada' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                      'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{row.clientName}</p>
                      <p className="text-xs text-zinc-500 truncate">{row.clientRfc} — {row.concept}</p>
                    </div>
                    <p className="font-bold text-base text-zinc-900 dark:text-zinc-100 shrink-0">
                      ${Number(row.amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/70">
                    <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[160px]">{row.uuid}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(row, "factura")}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold active:scale-95 transition-transform"
                      >
                        Editar / SRI
                      </button>
                      <button
                        onClick={() => handleDelete(row.id, "factura")}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-xs font-semibold active:scale-95 transition-transform"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              filteredNotas.map((row) => (
                <div key={row.id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {row.noteNumber}
                      </span>
                      <span className="text-xs text-zinc-400">{row.date}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                      {row.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{row.clientName}</p>
                      <p className="text-xs text-zinc-500 truncate">{row.invoiceRef}</p>
                    </div>
                    <p className="font-bold text-base text-rose-600 dark:text-rose-400 shrink-0">
                      - ${Number(row.total || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/70">
                    <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[160px]">{row.accessKey}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(row, "nota")}
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold active:scale-95 transition-transform"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(row.id, "nota")}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-xs font-semibold active:scale-95 transition-transform"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium"># Documento</th>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium text-right">Total</th>
                  <th className="px-6 py-4 font-medium text-center">Estado SRI</th>
                  <th className="px-6 py-4 font-medium text-right">Clave / Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando documentos desde Neon DB...</td>
                  </tr>
                ) : tab === 'facturas' ? (
                  filteredFacturas.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{row.invoiceNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.date}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.clientName}</p>
                        <p className="text-xs text-zinc-500">{row.clientRfc} — {row.concept}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        ${Number(row.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          row.status === 'Pendiente' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                          row.status === 'Autorizado' || row.status === 'Pagada' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                          'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-mono text-zinc-400">{row.uuid}</span>
                          <button
                            onClick={() => openEdit(row, "factura")}
                            className="p-1.5 text-zinc-400 hover:text-purple-600 transition-colors"
                            title="Editar / Autorizar SRI"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(row.id, "factura")}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="Eliminar Factura"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredNotas.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{row.noteNumber}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.date}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.clientName}</p>
                        <p className="text-xs text-zinc-500">{row.invoiceRef}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        - ${Number(row.total || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-mono text-zinc-400">{row.accessKey}</span>
                          <button
                            onClick={() => openEdit(row, "nota")}
                            className="p-1.5 text-zinc-400 hover:text-purple-600 transition-colors"
                            title="Editar Nota de Crédito"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(row.id, "nota")}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="Eliminar Nota de Crédito"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs sm:text-sm text-zinc-500">
            <span>Mostrando {tab === 'facturas' ? filteredFacturas.length : filteredNotas.length} documentos en Neon DB</span>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Comprobante SRI" : form.docType === "factura" ? "Emitir Factura SRI" : "Emitir Nota de Crédito"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Razón Social / Cliente</label>
                <input
                  required
                  type="text"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Ej. Logística Express S.A."
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">RUC / Cédula</label>
                <input
                  required
                  type="text"
                  value={form.clientRfc}
                  onChange={(e) => setForm({ ...form, clientRfc: e.target.value })}
                  placeholder="1792345678001"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  {form.docType === "factura" ? "Concepto" : "Factura Referencia"}
                </label>
                <input
                  required
                  type="text"
                  value={form.concept}
                  onChange={(e) => setForm({ ...form, concept: e.target.value })}
                  placeholder={form.docType === "factura" ? "Mantenimiento General" : "Aplica a F-1042"}
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Monto Total ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="350.00"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Estado SRI</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option>Autorizado</option>
                    <option>Pendiente</option>
                    <option>Rechazado</option>
                  </select>
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
                  className="h-11 px-5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar en Neon"}
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
