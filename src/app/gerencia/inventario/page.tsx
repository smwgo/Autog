"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
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

  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "Lubricantes",
    price: "",
    stock: "15",
    stockNorte: "10",
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
      const res = await fetch("/api/gerencia/inventario");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
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
      stockNorte: "10",
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
      stockNorte: String(row.stockNorte ?? 10),
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
    if (!confirm("¿Eliminar este producto del inventario global en Neon DB?")) return;
    await fetch(`/api/gerencia/inventario?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const filtered = products.filter((p) => {
    const s1 = Number(p.stock ?? 0);
    const s2 = Number(p.stockNorte ?? 10);
    const min = Number(p.minStock ?? 5);
    if (catFilter === "Stock Bajo" && !(s1 <= min || s2 <= min)) return false;
    if (catFilter !== "Todos" && catFilter !== "Stock Bajo" && p.category !== catFilter) return false;
    if (search && !`${p.code} ${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalValue = products.reduce(
    (acc, p) => acc + Number(p.price || 0) * (Number(p.stock || 0) + Number(p.stockNorte ?? 10)),
    0
  );
  const criticalCount = products.filter(
    (p) => Number(p.stock ?? 0) <= Number(p.minStock ?? 5) || Number(p.stockNorte ?? 10) <= Number(p.minStock ?? 5)
  ).length;

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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Inventario Global</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Control de Inventario
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setTransferForm({
                  productId: products[0]?.id || "",
                  fromBranch: "Principal",
                  quantity: "5",
                });
                setTransferModalOpen(true);
              }}
              className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
              Transferir Stock
            </button>
            <button
              onClick={openNew}
              className="h-10 px-4 rounded-xl bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Total Referencias</h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">{products.length}</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600">
              <span className="bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg">En catálogo Neon</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Valorización</h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">${totalValue.toFixed(2)}</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600">
              <span className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">Valor global sucursales</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden border-rose-200 dark:border-rose-900/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-rose-600 dark:text-rose-400 text-sm font-medium mb-1">Stock Crítico</h3>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{criticalCount}</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-rose-600">
              <span className="bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg">Requieren compra</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Sucursales Conectadas</h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">2</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-purple-600">
              <span className="bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-lg">Principal + Norte</span>
            </div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            {["Todos", "Lubricantes", "Filtros", "Frenos", "Eléctrico", "Stock Bajo"].map((tab) => (
              <button
                key={tab}
                onClick={() => setCatFilter(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  catFilter === tab
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
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
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-amber-500"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </div>

        {/* Tabla de Inventario */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Código / Producto</th>
                  <th className="px-6 py-4 font-medium">Categoría</th>
                  <th className="px-6 py-4 font-medium text-right">Precio Venta</th>
                  <th className="px-6 py-4 font-medium text-center">Stock Principal</th>
                  <th className="px-6 py-4 font-medium text-center">Stock Norte</th>
                  <th className="px-6 py-4 font-medium text-center">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">Cargando inventario desde Neon DB...</td>
                  </tr>
                ) : filtered.map((row) => {
                  const s1 = Number(row.stock ?? 0);
                  const s2 = Number(row.stockNorte ?? 10);
                  const min = Number(row.minStock ?? 5);
                  const alert = s1 <= min || s2 <= min;
                  return (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{row.code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                          {row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
                        ${Number(row.price || 0).toFixed(2)}
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${s1 <= min ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                          {s1}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${s2 <= min ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                          {s2}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {alert ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-1 rounded-lg text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Reabastecer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-lg text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Óptimo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(row)}
                            className="p-2 text-zinc-400 hover:text-amber-500 transition-colors"
                            title="Editar Producto"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                            title="Eliminar Producto"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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
            <span>Mostrando {filtered.length} de {products.length} productos en Neon DB</span>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
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
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
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
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Precio ($)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Stock Principal</label>
                  <input
                    required
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Stock Norte</label>
                  <input
                    required
                    type="number"
                    value={form.stockNorte}
                    onChange={(e) => setForm({ ...form, stockNorte: e.target.value })}
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
                  className="px-5 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar en Neon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Transferir Stock entre Sucursales
            </h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Producto</label>
                <select
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} (Prin: {p.stock} | Norte: {p.stockNorte ?? 10})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Sucursal Origen</label>
                  <select
                    value={transferForm.fromBranch}
                    onChange={(e) => setTransferForm({ ...transferForm, fromBranch: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option value="Principal">Sede Principal &rarr; Norte</option>
                    <option value="Norte">Sucursal Norte &rarr; Principal</option>
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
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Transfiriendo..." : "Ejecutar Transferencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
