"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface Product {
  id: string;
  code: string;
  name: string;
  brand?: string | null;
  category: string;
  price: number | string;
  stock: number;
  minStock: number;
  location?: string | null;
  status: string;
  createdAt: string;
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Modales
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [productoAEditar, setProductoAEditar] = useState<Product | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    code: "",
    name: "",
    brand: "",
    category: "General",
    price: "",
    stock: "0",
    minStock: "5",
    location: "",
  });

  const cargarProductos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.set("busqueda", searchTerm);
      if (selectedCategory) params.set("categoria", selectedCategory);

      const res = await fetch(`/api/productos?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cargar catálogo desde la base de datos.");
      }

      setProductos(data.productos || []);
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con la base de datos.");
    } finally {
      setCargando(false);
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarProductos();
    }, 250);

    const onFocus = () => cargarProductos();
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [cargarProductos]);

  const abrirModalNuevo = () => {
    setForm({
      code: "",
      name: "",
      brand: "",
      category: "General",
      price: "",
      stock: "0",
      minStock: "5",
      location: "",
    });
    setMostrarModalNuevo(true);
  };

  const abrirModalEditar = (prod: Product) => {
    setProductoAEditar(prod);
    setForm({
      code: prod.code,
      name: prod.name,
      brand: prod.brand || "",
      category: prod.category || "General",
      price: prod.price.toString(),
      stock: prod.stock.toString(),
      minStock: prod.minStock?.toString() || "5",
      location: prod.location || "",
    });
  };

  const guardarNuevoProducto = async (e: React.FormEvent) => {
    e.preventDefault();

    setGuardando(true);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Error al guardar el producto.");
        return;
      }

      setMostrarModalNuevo(false);
      await cargarProductos();
    } catch (err: any) {
      alert("Error al conectar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoAEditar) return;

    setGuardando(true);
    try {
      const res = await fetch("/api/productos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productoAEditar.id,
          ...form,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Error al actualizar el producto.");
        return;
      }

      setProductoAEditar(null);
      await cargarProductos();
    } catch (err: any) {
      alert("Error al conectar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el producto "${name}"?`)) {
      return;
    }

    try {
      setEliminandoId(id);
      const res = await fetch(`/api/productos?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo eliminar el producto.");
        return;
      }

      await cargarProductos();
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setEliminandoId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "En Stock":
        return "text-emerald-700 bg-emerald-100 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30";
      case "Bajo Stock":
        return "text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30";
      case "Agotado":
        return "text-rose-700 bg-rose-100 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30";
      default:
        return "text-zinc-700 bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Link 
                href="/pos"
                title="Volver a POS"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm active:scale-95 group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Productos
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                {productos.length}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/pos/catalogo/nuevo"
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>+</span> Nuevo Producto
            </Link>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-rose-800 dark:text-rose-300 text-sm">
            <span>⚠️ {error}</span>
            <button
              onClick={() => cargarProductos()}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Filters / Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:text-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-3.5 text-zinc-400 text-lg">🔍</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <div className="relative w-full md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-sm transition-all"
            >
              <option value="">Categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {cargando && productos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-500 dark:text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm">Cargando catálogo...</p>
                      </div>
                    </td>
                  </tr>
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-3xl text-blue-600">
                          📦
                        </div>
                        <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                          No hay productos registrados
                        </h4>
                        <Link
                          href="/pos/catalogo/nuevo"
                          className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <span>+</span> Registrar Producto
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  productos.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900 dark:text-white mb-1">{item.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {item.code}
                          </span>
                          {item.brand && (
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              {item.brand}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-zinc-900 dark:text-white">
                        ${Number(item.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {item.stock} <span className="text-sm font-normal text-zinc-500">uds.</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                        {item.location ? (
                          <span className="flex items-center gap-1.5">
                            <span className="text-zinc-400">📍</span> {item.location}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs italic">Sin ubicación</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirModalEditar(item)}
                            className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(item.id, item.name)}
                            disabled={eliminandoId === item.id}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            title="Eliminar Producto"
                          >
                            {eliminandoId === item.id ? (
                              <svg className="w-4 h-4 animate-spin text-rose-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando {productos.length} productos</span>
          </div>
        </div>

        {/* Modal: Crear / Editar Producto */}
        {(mostrarModalNuevo || productoAEditar) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-xl p-6 md:p-8 shadow-2xl relative">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {productoAEditar ? "Editar Producto" : "Nuevo Producto"}
                </h3>
                <button
                  onClick={() => {
                    setMostrarModalNuevo(false);
                    setProductoAEditar(null);
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={productoAEditar ? guardarEdicion : guardarNuevoProducto} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Código / SKU
                    </label>
                    <input
                      type="text"
                      placeholder="PROD-001"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm font-mono uppercase outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Marca
                    </label>
                    <input
                      type="text"
                      placeholder="Mobil 1, Bosch, etc."
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Nombre del Producto
                  </label>
                  <input
                    type="text"
                    placeholder="Aceite Sintético 5W-30"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Categoría
                    </label>
                    <input
                      type="text"
                      placeholder="Lubricantes, Filtros, etc."
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Precio de Venta ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="15.50"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Stock Actual
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Stock Mínimo Alerta
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.minStock}
                      onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Ubicación en Almacén
                  </label>
                  <input
                    type="text"
                    placeholder="Pasillo 2, Estante A"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalNuevo(false);
                      setProductoAEditar(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {guardando
                      ? "Guardando..."
                      : productoAEditar
                      ? "Guardar Cambios"
                      : "Registrar Producto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
