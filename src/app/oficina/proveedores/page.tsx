"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState } from "react";

export default function ComprasProveedores() {
  const [tab, setTab] = useState<"proveedores" | "ordenes">("proveedores");
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    docType: "proveedor",
    name: "",
    ruc: "",
    contact: "",
    email: "",
    categories: "Lubricantes, Filtros",
    balance: "0",
    supplierName: "",
    expectedDate: "Mañana",
    total: "",
    status: "Solicitado",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oficina/proveedores");
      if (res.ok) {
        const data = await res.json();
        setProveedores(data.proveedores || []);
        setOrdenes(data.ordenes || []);
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
      docType: tab === "proveedores" ? "proveedor" : "orden",
      name: "",
      ruc: "",
      contact: "",
      email: "",
      categories: "Repuestos, Lubricantes",
      balance: "0",
      supplierName: proveedores[0]?.name || "Importadora AutoParts Cía. Ltda.",
      expectedDate: "Mañana",
      total: "",
      status: "Solicitado",
    });
    setModalOpen(true);
  };

  const openEdit = (row: any, docType: "proveedor" | "orden") => {
    setEditingItem({ ...row, docType });
    let catsStr = "General";
    try {
      const parsed = JSON.parse(row.categories || "[]");
      if (Array.isArray(parsed)) catsStr = parsed.join(", ");
    } catch {
      catsStr = row.categories || "General";
    }
    setForm({
      docType,
      name: row.name || "",
      ruc: row.ruc || "",
      contact: row.contact || "",
      email: row.email || "",
      categories: catsStr,
      balance: String(row.balance || 0),
      supplierName: row.supplierName || "",
      expectedDate: row.expectedDate || "Hoy",
      total: String(row.total || 0),
      status: row.status || "Solicitado",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = editingItem ? { id: editingItem.id, ...form } : form;
      const res = await fetch("/api/oficina/proveedores", {
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

  const handlePayBalance = async (sup: any) => {
    await fetch("/api/oficina/proveedores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sup.id, docType: "proveedor", balance: 0 }),
    });
    await loadData();
  };

  const handleMarkReceived = async (po: any) => {
    await fetch("/api/oficina/proveedores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: po.id, docType: "orden", status: "Recibido" }),
    });
    await loadData();
  };

  const handleDelete = async (id: string, docType: "proveedor" | "orden") => {
    if (!confirm("¿Eliminar este registro de Neon DB?")) return;
    await fetch(`/api/oficina/proveedores?id=${id}&docType=${docType}`, { method: "DELETE" });
    await loadData();
  };

  const filteredSuppliers = proveedores.filter((p) =>
    `${p.name} ${p.ruc} ${p.contact}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = ordenes.filter((o) =>
    `${o.orderNumber} ${o.supplierName} ${o.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayable = proveedores.reduce((acc, p) => acc + Number(p.balance || 0), 0);
  const transitOrders = ordenes.filter((o) => o.status === "En Tránsito" || o.status === "Solicitado").length;
  const totalPurchases = ordenes.reduce((acc, o) => acc + Number(o.total || 0), 0);

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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Compras y Proveedores</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Gestión de Abastecimiento
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {tab === 'proveedores' ? (
              <button
                onClick={openNew}
                className="w-full sm:w-auto h-11 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Nuevo Proveedor
              </button>
            ) : (
              <button
                onClick={openNew}
                className="w-full sm:w-auto h-11 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Crear Orden de Compra
              </button>
            )}
          </div>
        </div>

        {/* Resumen Cards */}
        <CollapsibleMetrics
          title="Resumen de Abastecimiento"
          subtitle={`${proveedores.length} proveedores • $${totalPayable.toFixed(2)} por pagar`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 md:mb-8">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 text-lg sm:text-xl flex-shrink-0">
                🤝
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">{proveedores.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Proveedores</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-lg sm:text-xl flex-shrink-0">
                💵
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 truncate">${totalPayable.toFixed(2)}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Por Pagar</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg sm:text-xl flex-shrink-0">
                ⏳
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{transitOrders}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">En Tránsito</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg sm:text-xl flex-shrink-0">
                📦
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">${totalPurchases.toFixed(2)}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Compras</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* View Switcher & Filtros */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setTab("proveedores")}
              className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${tab === 'proveedores' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Proveedores ({proveedores.length})
            </button>
            <button 
              onClick={() => setTab("ordenes")}
              className={`flex-1 md:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${tab === 'ordenes' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Órdenes de Compra ({ordenes.length})
            </button>
          </div>
          
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'proveedores' ? "Buscar proveedor o RUC..." : "Buscar orden OC-..."} 
              className="w-full h-11 md:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-indigo-500"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 md:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Contenedor Principal */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-2xl sm:rounded-b-3xl overflow-hidden shadow-sm">
          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading ? (
              <div className="p-6 text-center text-sm text-zinc-500">Cargando desde Neon DB...</div>
            ) : tab === "proveedores" ? (
              filteredSuppliers.map((row) => {
                let cats: string[] = [];
                try {
                  cats = JSON.parse(row.categories || "[]");
                } catch {
                  cats = [row.categories || "General"];
                }
                const bal = Number(row.balance || 0);
                return (
                  <div key={row.id} className="p-4 flex flex-col gap-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{row.name}</p>
                        <p className="text-xs font-mono text-zinc-500">{row.ruc}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-zinc-400 block">Saldo</span>
                        <span className={`font-bold text-sm ${bal === 0 ? 'text-zinc-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          ${bal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                      <span>👤 {row.contact}</span>
                      <span className="truncate max-w-[160px] text-zinc-400">{row.email}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/70 gap-2">
                      <div className="flex gap-1 flex-wrap">
                        {cats.slice(0, 2).map((c, idx) => (
                          <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md text-[11px] font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {bal > 0 && (
                          <button
                            onClick={() => handlePayBalance(row)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-xs font-bold active:scale-95 transition-transform"
                          >
                            Pagar
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(row, "proveedor")}
                          className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold active:scale-95 transition-transform"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(row.id, "proveedor")}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-xs font-semibold active:scale-95 transition-transform"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              filteredOrders.map((row) => (
                <div key={row.id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                      {row.orderNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                      row.status === 'Borrador' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' :
                      row.status === 'Solicitado' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                      row.status === 'En Tránsito' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{row.supplierName}</p>
                      <p className="text-xs text-zinc-500">Entrega: {row.expectedDate}</p>
                    </div>
                    <p className="font-bold text-base text-zinc-900 dark:text-zinc-100 shrink-0">
                      ${Number(row.total || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/70">
                    {row.status !== 'Recibido' && (
                      <button
                        onClick={() => handleMarkReceived(row)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-xs font-bold active:scale-95 transition-transform"
                      >
                        ✓ Recibir
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(row, "orden")}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold active:scale-95 transition-transform"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(row.id, "orden")}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-xs font-semibold active:scale-95 transition-transform"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                {tab === 'proveedores' ? (
                  <tr>
                    <th className="px-6 py-4 font-medium">Proveedor / RUC</th>
                    <th className="px-6 py-4 font-medium">Contacto</th>
                    <th className="px-6 py-4 font-medium">Categorías</th>
                    <th className="px-6 py-4 font-medium text-right">Saldo por Pagar</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-4 font-medium"># Orden</th>
                    <th className="px-6 py-4 font-medium">Proveedor</th>
                    <th className="px-6 py-4 font-medium">Fecha Esperada</th>
                    <th className="px-6 py-4 font-medium text-right">Total</th>
                    <th className="px-6 py-4 font-medium text-center">Estado</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando desde Neon DB...</td>
                  </tr>
                ) : tab === 'proveedores' ? (
                  filteredSuppliers.map((row) => {
                    let cats: string[] = [];
                    try {
                      cats = JSON.parse(row.categories || "[]");
                    } catch {
                      cats = [row.categories || "General"];
                    }
                    const bal = Number(row.balance || 0);
                    return (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">{row.ruc}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-zinc-900 dark:text-zinc-300 font-medium">{row.contact}</p>
                          <p className="text-xs text-zinc-500">{row.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {cats.map((c, idx) => (
                              <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${bal === 0 ? 'text-zinc-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            ${bal.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {bal > 0 && (
                              <button
                                onClick={() => handlePayBalance(row)}
                                className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors"
                                title="Liquidar Saldo (Marcar Pagado)"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(row, "proveedor")}
                              className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors"
                              title="Editar Proveedor"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(row.id, "proveedor")}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                              title="Eliminar Proveedor"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  filteredOrders.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{row.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.supplierName}</p>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.expectedDate}</td>
                      <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        ${Number(row.total || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          row.status === 'Borrador' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' :
                          row.status === 'Solicitado' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                          row.status === 'En Tránsito' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                          'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {row.status !== 'Recibido' && (
                            <button
                              onClick={() => handleMarkReceived(row)}
                              className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors"
                              title="Marcar como Recibido"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(row, "orden")}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors"
                            title="Editar Orden de Compra"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(row.id, "orden")}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="Eliminar Orden"
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
            <span>Mostrando {tab === 'proveedores' ? filteredSuppliers.length : filteredOrders.length} registros en Neon DB</span>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Registro" : form.docType === "proveedor" ? "Nuevo Proveedor" : "Nueva Orden de Compra"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {form.docType === "proveedor" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Razón Social del Proveedor</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Importadora AutoParts Cía. Ltda."
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">RUC</label>
                      <input
                        required
                        type="text"
                        value={form.ruc}
                        onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                        placeholder="0991234567001"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Saldo por Pagar ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.balance}
                        onChange={(e) => setForm({ ...form, balance: e.target.value })}
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Contacto</label>
                      <input
                        required
                        type="text"
                        value={form.contact}
                        onChange={(e) => setForm({ ...form, contact: e.target.value })}
                        placeholder="Mario Valdés"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Correo</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="ventas@autoparts.com"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Categorías (separadas por coma)</label>
                    <input
                      type="text"
                      value={form.categories}
                      onChange={(e) => setForm({ ...form, categories: e.target.value })}
                      placeholder="Lubricantes, Filtros, Frenos"
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Proveedor</label>
                    <input
                      required
                      type="text"
                      value={form.supplierName}
                      onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                      placeholder="Importadora AutoParts Cía. Ltda."
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Fecha Esperada</label>
                      <input
                        required
                        type="text"
                        value={form.expectedDate}
                        onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                        placeholder="Mañana"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
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
                        placeholder="450.00"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Estado</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                    >
                      <option>Solicitado</option>
                      <option>En Tránsito</option>
                      <option>Recibido</option>
                      <option>Borrador</option>
                    </select>
                  </div>
                </>
              )}
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
                  className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
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
