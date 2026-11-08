"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState } from "react";

export default function InventarioGlobal() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [globalThreshold, setGlobalThreshold] = useState(5);

  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "Lubricantes",
    price: "",
    stock: "15",
    stockNorte: "0",
    minStock: "5",
  });

  const [transferForm, setTransferForm] = useState({
    productId: "",
    fromBranch: "Principal",
    quantity: "5",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, confRes] = await Promise.all([
        fetch("/api/gerencia/inventario"),
        fetch("/api/gerencia/configuracion").catch(() => null),
      ]);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
      if (confRes && confRes.ok) {
        const confData = await confRes.json();
        if (confData?.config?.umbralStockBajo !== undefined) {
          setGlobalThreshold(Number(confData.config.umbralStockBajo) || 5);
        }
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
      code: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      category: "Lubricantes",
      price: "",
      stock: "20",
      stockNorte: "0",
      minStock: "5",
    });
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingItem(row);
    setForm({
      code: row.code || "",
      name: row.name || "",
      category: row.category || "General",
      price: String(row.price || 0),
      stock: String(row.stock ?? 0),
      stockNorte: String(row.stockNorte ?? 0),
      minStock: String(row.minStock ?? 5),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = editingItem ? { id: editingItem.id, ...form } : form;
      const res = await fetch("/api/gerencia/inventario", {
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

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.productId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gerencia/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transfer", ...transferForm }),
      });
      if (res.ok) {
        setTransferModalOpen(false);
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto del inventario global?")) return;
    await fetch(`/api/gerencia/inventario?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const filtered = products.filter((p) => {
    const s1 = Number(p.stock ?? 0);
    const s2 = Number(p.stockNorte ?? 0);
    const min = Math.max(Number(p.minStock ?? 0), globalThreshold);
    if (catFilter === "Stock Bajo" && !(s1 <= min || s2 <= min)) return false;
    if (catFilter !== "Todos" && catFilter !== "Stock Bajo" && p.category !== catFilter) return false;
    if (search && !`${p.code} ${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalValue = products.reduce(
    (acc, p) => acc + Number(p.price || 0) * (Number(p.stock || 0) + Number(p.stockNorte ?? 0)),
    0
  );
  const criticalCount = products.filter((p) => {
    const min = Math.max(Number(p.minStock ?? 0), globalThreshold);
    return Number(p.stock ?? 0) <= min || Number(p.stockNorte ?? 0) <= min;
  }).length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header */}
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
                Control de Inventario
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setTransferForm({
                  productId: products[0]?.id || "",
                  fromBranch: "Principal",
                  quantity: "5",
                });
                setTransferModalOpen(true);
              }}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs sm:text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
              <span>Transferir Stock</span>
            </button>
            <button
              onClick={openNew}
              className="h-11 sm:h-10 px-3 sm:px-4 rounded-xl bg-amber-500 text-white font-semibold text-xs sm:text-sm hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              <span>Nuevo Producto</span>
            </button>
          </div>
        </div>

        {/* Resumen Cards: 2x2 on mobile */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
              <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 truncate">Total Referencias</h3>
              <p className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{products.length}</p>
              <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] sm:text-xs font-medium text-blue-600">
                <span className="bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 sm:py-1 rounded-lg">En catálogo</span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
              <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 truncate">Valorización</h3>
              <p className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white truncate">${totalValue.toFixed(2)}</p>
              <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] sm:text-xs font-medium text-emerald-600">
                <span className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 sm:py-1 rounded-lg">Valor global</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm relative overflow-hidden">
              <h3 className="text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 truncate">Stock Crítico</h3>
              <p className="text-xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">{criticalCount}</p>
              <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] sm:text-xs font-medium text-rose-600">
                <span className="bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 sm:py-1 rounded-lg">Reabastecer</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
              <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 truncate">Sucursales</h3>
              <p className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white">2</p>
              <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] sm:text-xs font-medium text-purple-600">
                <span className="bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 sm:py-1 rounded-lg">Principal + Norte</span>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Filtros de Tabla */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 mb-4 sm:mb-0 shadow-sm">
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            {["Todos", "Lubricantes", "Filtros", "Frenos", "Eléctrico", "Stock Bajo"].map((tab) => (
              <button
                key={tab}
                onClick={() => setCatFilter(tab)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  catFilter === tab
                    ? "bg-amber-500 text-white"
                    : "bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {tab === "Stock Bajo" && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <div className="relative flex-grow lg:w-64">
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código o nombre..." 
                className="w-full h-11 sm:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-amber-500"
              />
              <svg className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </div>

        {/* Tablas / Listados */}
        <div className="order-4">
          {/* Vista Móvil (Tarjetas adaptadas a facturas) */}
          <div className="md:hidden space-y-3.5">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                Cargando inventario...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                No se encontraron productos
              </div>
            ) : (
              filtered.map((row) => {
                const s1 = Number(row.stock ?? 0);
                const s2 = Number(row.stockNorte ?? 0);
                const min = Number(row.minStock ?? 5);
                const alert = s1 <= min || s2 <= min;
                return (
                  <div
                    key={row.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                          📦
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {row.name}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                              alert
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            }`}>
                              {alert ? "Reabastecer" : "Óptimo"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">#{row.code}</span>
                            <span> • {row.category}</span>
                          </p>
                        </div>
                      </div>

                      {/* Acciones Rápidas (Toque táctil >= 44px) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-amber-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 active:scale-95 transition-all cursor-pointer"
                          title="Editar Producto"
                          aria-label="Editar Producto"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                          title="Eliminar Producto"
                          aria-label="Eliminar Producto"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Sede Principal:</span>
                        <span className={`font-bold ${s1 <= min ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"}`}>{s1} u.</span>
                      </div>
                      <div className="flex justify-between items-center border-l border-zinc-200 dark:border-zinc-700 pl-2">
                        <span className="text-zinc-500">Suc. Norte:</span>
                        <span className={`font-bold ${s2 <= min ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"}`}>{s2} u.</span>
                      </div>
                    </div>

                    {/* Datos secundarios (Precio) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold font-mono text-xs">
                        💰 ${Number(row.price || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Vista Desktop (Tabla de Inventario) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Código / Producto</th>
                    <th className="py-3.5 px-4">Categoría</th>
                    <th className="py-3.5 px-4 text-right">Precio Venta</th>
                    <th className="py-3.5 px-4 text-center">Stock Principal</th>
                    <th className="py-3.5 px-4 text-center">Stock Norte</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">Cargando inventario...</td>
                    </tr>
                  ) : filtered.map((row) => {
                    const s1 = Number(row.stock ?? 0);
                    const s2 = Number(row.stockNorte ?? 0);
                    const min = Number(row.minStock ?? 5);
                    const alert = s1 <= min || s2 <= min;
                    return (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">#{row.code}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-zinc-100">
                          ${Number(row.price || 0).toFixed(2)}
                        </td>
                        
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-bold ${s1 <= min ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {s1}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-bold ${s2 <= min ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {s2}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {alert ? (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-rose-200 dark:border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Reabastecer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Óptimo
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEdit(row)}
                              className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-all active:scale-95 flex items-center justify-center shadow-xs"
                              title="Editar Producto"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                              title="Eliminar Producto"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
              <span>Mostrando {filtered.length} de {products.length} productos</span>
            </div>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Producto Global" : "Nuevo Producto en Catálogo"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Código SKU</label>
                  <input
                    required
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option>Lubricantes</option>
                    <option>Filtros</option>
                    <option>Frenos</option>
                    <option>Eléctrico</option>
                    <option>General</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Nombre del Producto</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Aceite Sintético 10W-40"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Precio ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Principal</label>
                  <input
                    required
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Suc. Norte</label>
                  <input
                    required
                    type="number"
                    value={form.stockNorte}
                    onChange={(e) => setForm({ ...form, stockNorte: e.target.value })}
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
                  className="h-11 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Transferir Stock entre Sucursales
            </h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Producto</label>
                <select
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} (Prin: {p.stock} | Norte: {p.stockNorte ?? 0})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Dirección</label>
                  <select
                    value={transferForm.fromBranch}
                    onChange={(e) => setTransferForm({ ...transferForm, fromBranch: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option value="Principal">Principal &rarr; Norte</option>
                    <option value="Norte">Norte &rarr; Principal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Cantidad</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={transferForm.quantity}
                    onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Transfiriendo..." : "Transferir"}
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
