"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

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
  imageUrl?: string | null;
  createdAt: string;
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [catMenuAbierto, setCatMenuAbierto] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState("TODOS");
  const [estadoMenuAbierto, setEstadoMenuAbierto] = useState(false);

  // Modales
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [productoAEditar, setProductoAEditar] = useState<Product | null>(null);
  const [productoAEliminar, setProductoAEliminar] = useState<Product | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const [subiendoFotoModal, setSubiendoFotoModal] = useState(false);
  const [errorFotoModal, setErrorFotoModal] = useState<string | null>(null);

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
    imageUrl: "",
  });

  const cargarProductos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.set("busqueda", searchTerm);
      if (selectedCategory) params.set("categoria", selectedCategory);

      const res = await fetch(`/api/productos?${params.toString()}`, {
        cache: "no-store",
      });
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
      imageUrl: "",
    });
    setErrorFotoModal(null);
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
      imageUrl: prod.imageUrl || "",
    });
    setErrorFotoModal(null);
  };

  const handleSubirFotoModal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorFotoModal("El archivo seleccionado debe ser una imagen válida (JPG, PNG, WEBP, AVIF).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorFotoModal("La imagen no debe superar los 8 MB.");
      return;
    }

    setErrorFotoModal(null);
    setSubiendoFotoModal(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "productos");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Error al subir la imagen al servidor.");
      }

      setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err: any) {
      setErrorFotoModal(err?.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoFotoModal(false);
    }
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

  const confirmarEliminarProducto = async () => {
    if (!productoAEliminar) return;

    const idAEliminar = productoAEliminar.id;
    try {
      setEliminandoId(idAEliminar);
      const res = await fetch(`/api/productos?id=${idAEliminar}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo eliminar el producto.");
        return;
      }

      setProductos((prev) => prev.filter((p) => p.id !== idAEliminar));
      setProductoAEliminar(null);
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

  const enStockCount = productos.filter((p) => p.status === "En Stock" || p.stock > p.minStock).length;
  const bajoStockCount = productos.filter((p) => p.status === "Bajo Stock" || (p.stock > 0 && p.stock <= p.minStock)).length;
  const agotadosCount = productos.filter((p) => p.status === "Agotado" || p.stock <= 0).length;

  const productosFiltrados = productos.filter((p) => {
    if (selectedEstado === "EN_STOCK") {
      return p.status === "En Stock" || p.stock > p.minStock;
    }
    if (selectedEstado === "BAJO_STOCK") {
      return p.status === "Bajo Stock" || (p.stock > 0 && p.stock <= p.minStock);
    }
    if (selectedEstado === "AGOTADO") {
      return p.status === "Agotado" || p.stock <= 0;
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header */}
        <div className="order-1 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/pos"
              title="Volver a Panel POS"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Productos
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              {cargando && productos.length === 0 ? "..." : productosFiltrados.length}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/pos/catalogo/nuevo"
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nuevo Producto</span>
            </Link>
          </div>
        </div>

        {/* Resumen Cards Desplegable en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Total Productos */}
            <div className="bg-white dark:bg-zinc-900/80 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 flex items-center justify-center text-xl shrink-0">
                📦
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {cargando && productos.length === 0 ? "..." : productos.length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Productos</h3>
              </div>
            </div>

            {/* En Stock */}
            <div className="bg-white dark:bg-zinc-900/80 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                🟢
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {cargando ? "..." : enStockCount}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">En Stock</h3>
              </div>
            </div>

            {/* Bajo Stock */}
            <div className="bg-white dark:bg-zinc-900/80 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {cargando ? "..." : bajoStockCount}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Bajo Stock</h3>
              </div>
            </div>

            {/* Agotados */}
            <div className="bg-white dark:bg-zinc-900/80 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-500 flex items-center justify-center text-xl shrink-0">
                🛑
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {cargando ? "..." : agotadosCount}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Agotados</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

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

        {/* Buscador y Filtros */}
        <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Filtro Categorías */}
            <div className="relative w-full sm:w-44 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCatMenuAbierto(!catMenuAbierto);
                  setEstadoMenuAbierto(false);
                }}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span className="truncate">{!selectedCategory ? "Categorías" : selectedCategory}</span>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ml-1.5 ${catMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {catMenuAbierto && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setCatMenuAbierto(false)} 
                  />
                  <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("");
                        setCatMenuAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        !selectedCategory
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>Categorías</span>
                      {!selectedCategory && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCatMenuAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {selectedCategory === cat && (
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Filtro Estado */}
            <div className="relative w-full sm:w-40 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEstadoMenuAbierto(!estadoMenuAbierto);
                  setCatMenuAbierto(false);
                }}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span>
                  {selectedEstado === "EN_STOCK"
                    ? "En Stock"
                    : selectedEstado === "BAJO_STOCK"
                    ? "Bajo Stock"
                    : selectedEstado === "AGOTADO"
                    ? "Agotados"
                    : "Estado"}
                </span>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ml-1.5 ${estadoMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {estadoMenuAbierto && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setEstadoMenuAbierto(false)} 
                  />
                  <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {[
                      { id: "TODOS", label: "Estado" },
                      { id: "EN_STOCK", label: "En Stock" },
                      { id: "BAJO_STOCK", label: "Bajo Stock" },
                      { id: "AGOTADO", label: "Agotados" },
                    ].map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        onClick={() => {
                          setSelectedEstado(opcion.id);
                          setEstadoMenuAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                          selectedEstado === opcion.id
                            ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <span>{opcion.label}</span>
                        {selectedEstado === opcion.id && (
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Products List / Table */}
        <div className="order-4">
          {cargando && productos.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm">Cargando catálogo...</p>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
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
            </div>
          ) : (
            <>
              {/* Mobile Cards (md:hidden) adaptadas con orden idéntico a facturas */}
              <div className="md:hidden space-y-3.5">
                {productosFiltrados.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icono / Foto de producto */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-2xs">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-xl">📦</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {item.name}
                            </p>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(
                                item.status
                              )}`}
                            >
                              {item.status} ({item.stock} uds)
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">#{item.code}</span>
                            {item.brand && <span> • {item.brand}</span>}
                          </p>
                        </div>
                      </div>

                      {/* Acciones Rápidas (Toque táctil >= 44px) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/pos/catalogo/editar?id=${item.id}`}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-95 transition-all"
                          title="Editar producto"
                          aria-label="Editar producto"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => setProductoAEliminar(item)}
                          disabled={eliminandoId === item.id}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                          title="Eliminar producto"
                          aria-label="Eliminar producto"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Datos secundarios (Precio, Categoría, Ubicación) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-500/20 font-bold font-mono text-xs">
                        💰 ${Number(item.price).toFixed(2)}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 text-xs font-medium">
                        {item.category}
                      </span>

                      {item.location && (
                        <span className="text-zinc-400 ml-auto text-[11px] whitespace-nowrap flex items-center gap-1">
                          <span>📍</span> {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (hidden md:block) */}
              <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3.5 px-4">Producto</th>
                        <th className="py-3.5 px-4">Categoría</th>
                        <th className="py-3.5 px-4 text-right">Precio</th>
                        <th className="py-3.5 px-4">Stock</th>
                        <th className="py-3.5 px-4">Ubicación</th>
                        <th className="py-3.5 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {productosFiltrados.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-contain p-0.5"
                                  />
                                ) : (
                                  <span className="text-base">📦</span>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-zinc-900 dark:text-white mb-0.5">{item.name}</div>
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
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-white">
                            ${Number(item.price).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {item.stock} <span className="text-xs font-normal text-zinc-500">uds.</span>
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
                          <td className="py-3.5 px-4 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                            {item.location ? (
                              <span className="flex items-center gap-1.5">
                                <span className="text-zinc-400">📍</span> {item.location}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-xs italic">Sin ubicación</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/pos/catalogo/editar?id=${item.id}`}
                                className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                title="Editar producto"
                                aria-label="Editar producto"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </Link>
                              <button
                                onClick={() => setProductoAEliminar(item)}
                                disabled={eliminandoId === item.id}
                                className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs disabled:opacity-50"
                                title="Eliminar Producto"
                                aria-label="Eliminar producto"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando {productos.length} productos</span>
          </div>
        </div>

        {/* Modal: Crear / Editar Producto */}
        {(mostrarModalNuevo || productoAEditar) && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {productoAEditar ? "Editar Producto" : "Nuevo Producto"}
                </h3>
                <button
                  onClick={() => {
                    setMostrarModalNuevo(false);
                    setProductoAEditar(null);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={productoAEditar ? guardarEdicion : guardarNuevoProducto} className="p-6 space-y-4">
                {/* Foto del Producto */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Foto del Producto
                  </label>
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
                    <div className="relative w-14 h-14 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                      {form.imageUrl ? (
                        <>
                          <img src={form.imageUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center cursor-pointer shadow-xs"
                            title="Quitar foto"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <span className="text-xl text-zinc-400">📷</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className={`h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${subiendoFotoModal ? "opacity-60 pointer-events-none" : ""}`}>
                          <span>{subiendoFotoModal ? "Subiendo..." : form.imageUrl ? "Cambiar Foto" : "Subir Imagen"}</span>
                          <input type="file" accept="image/*" disabled={subiendoFotoModal} onChange={handleSubirFotoModal} className="hidden" />
                        </label>
                      </div>
                      <input
                        type="url"
                        placeholder="O pega URL de imagen..."
                        value={form.imageUrl}
                        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                        className="w-full h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs outline-none focus:border-blue-500 font-mono text-zinc-700 dark:text-zinc-300"
                      />
                      {errorFotoModal && <p className="text-[11px] text-rose-500 font-medium">⚠️ {errorFotoModal}</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Código / SKU
                    </label>
                    <input
                      type="text"
                      placeholder="PROD-001"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm font-mono uppercase outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Marca
                    </label>
                    <input
                      type="text"
                      placeholder="Mobil 1, Bosch, etc."
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Nombre del Producto
                  </label>
                  <input
                    type="text"
                    placeholder="Aceite Sintético 5W-30"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Categoría
                    </label>
                    <input
                      type="text"
                      placeholder="Lubricantes, Filtros, etc."
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Precio de Venta ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="15.50"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Stock Actual
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Stock Mínimo Alerta
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.minStock}
                      onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Ubicación en Almacén
                  </label>
                  <input
                    type="text"
                    placeholder="Pasillo 2, Estante A"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalNuevo(false);
                      setProductoAEditar(null);
                    }}
                    className="flex-1 sm:flex-none h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
        {/* Modal Flotante de Confirmación de Eliminación */}
        {productoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-150 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-xl mx-auto mb-3">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                ¿Eliminar producto?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                Se eliminará <strong className="text-zinc-900 dark:text-white font-medium">{productoAEliminar.name}</strong>.
                {productoAEliminar.stock > 0 && (
                  <span className="block mt-2 text-xs font-semibold text-amber-500">
                    ⚠️ Stock: {productoAEliminar.stock} uds.
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setProductoAEliminar(null)}
                  disabled={!!eliminandoId}
                  className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminarProducto}
                  disabled={!!eliminandoId}
                  className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-rose-500/20"
                >
                  {eliminandoId ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <PosMobileNav />
    </div>
  );
}
