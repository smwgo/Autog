"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import SelectorModulos, { parsearModulos } from "@/components/pos/SelectorModulos";
import { ProductoFotoPicker } from "@/components/pos/ProductoFotoPicker";
import CamposTaxonomiaProducto from "@/components/pos/CamposTaxonomiaProducto";
import { getClientActiveBranch } from "@/lib/branch";
import { BranchTabs } from "@/components/pos/BranchTabs";

interface Product {
  id: string;
  code: string;
  name: string;
  brand?: string | null;
  category: string;
  subCategory?: string | null;
  presentation?: string | null;
  tipo?: string | null;
  price: number | string;
  stock: number;
  minStock: number;
  location?: string | null;
  status: string;
  imageUrl?: string | null;
  createdAt: string;
}

function formatearPrimeraMayuscula(texto?: string | null): string {
  const s = String(texto || "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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
  const [filtroMovilAbierto, setFiltroMovilAbierto] = useState(false);
  const [mostrarMetricasMovil, setMostrarMetricasMovil] = useState(false);

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
    category: "",
    subCategory: "",
    presentation: "",
    tipo: "Tienda",
    price: "",
    stock: "0",
    minStock: "5",
    location: "",
    imageUrl: "",
  });

  const handleTaxonomiaProductoChange = useCallback(
    (field: "category" | "subCategory" | "presentation", value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const cargarProductos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.set("busqueda", searchTerm);
      if (selectedCategory) params.set("categoria", selectedCategory);
      params.set("sede", getClientActiveBranch());

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
    const onBranchChange = () => cargarProductos();
    window.addEventListener("focus", onFocus);
    window.addEventListener("autog-branch-change", onBranchChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("autog-branch-change", onBranchChange);
    };
  }, [cargarProductos]);

  const abrirModalNuevo = () => {
    setForm({
      code: "",
      name: "",
      brand: "",
      category: "",
      subCategory: "",
      presentation: "",
      tipo: "Tienda",
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
      category: prod.category && prod.category !== "General" ? prod.category : "",
      subCategory: prod.subCategory || "",
      presentation: prod.presentation || "",
      tipo: prod.tipo || "Tienda",
      price: prod.price.toString(),
      stock: prod.stock.toString(),
      minStock: prod.minStock?.toString() || "5",
      location: prod.location || "",
      imageUrl: prod.imageUrl || "",
    });
    setErrorFotoModal(null);
  };

  const handleSubirFotoModal = async (file: File) => {
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
      const payload = {
        ...form,
        category: form.category.trim() || "General",
        branch: getClientActiveBranch(),
      };
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Error al guardar el producto.");
        return;
      }

      setMostrarModalNuevo(false);
      window.dispatchEvent(new Event("taller-catalogo-actualizado"));
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
          branch: getClientActiveBranch(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Error al actualizar el producto.");
        return;
      }

      setProductoAEditar(null);
      window.dispatchEvent(new Event("taller-catalogo-actualizado"));
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

  const enStockCount = productos.filter((p) => p.stock > p.minStock).length;
  const bajoStockCount = productos.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const agotadosCount = productos.filter((p) => p.stock <= 0).length;

  const productosFiltrados = productos.filter((p) => {
    if (selectedEstado === "EN_STOCK") {
      return p.stock > p.minStock;
    }
    if (selectedEstado === "BAJO_STOCK") {
      return p.stock > 0 && p.stock <= p.minStock;
    }
    if (selectedEstado === "AGOTADO") {
      return p.stock <= 0;
    }
    return true;
  });

  const hayFiltroActivo = Boolean(selectedCategory) || selectedEstado !== "TODOS";

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-0">
      <Header />

      <main className="flex-grow px-3.5 py-4 sm:p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header - Móvil y Escritorio en una sola fila (idéntico a Clientes) */}
        <div className="order-1 mb-3 sm:mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link 
              href="/pos"
              title="Volver a Panel POS"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              Productos
            </h1>
            <span className="inline-flex items-center justify-center px-2 min-w-6 h-6 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20 shrink-0">
              {cargando && productos.length === 0 ? "..." : productosFiltrados.length}
            </span>
          </div>

          <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0 ml-auto">
            <BranchTabs size="sm" />
            <Link
              href="/pos/catalogo/nuevo"
              title="Nuevo Producto"
              aria-label="Nuevo Producto"
              className="h-9 w-9 sm:w-auto sm:h-10 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nuevo Producto</span>
            </Link>
          </div>
        </div>

        {/* Métricas: en móvil se muestran con el icono 📊 en 4 recuadros en una fila, en escritorio siempre visibles */}
        <div className={`order-3 sm:order-2 mb-3 sm:mb-8 ${mostrarMetricasMovil ? "block" : "hidden"} sm:block`}>
          <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {[
              { icono: "📦", valor: productos.length, label: "Productos", cls: "bg-blue-500/15 border-blue-500/25 text-blue-500 dark:text-blue-400", valCls: "text-zinc-900 dark:text-white" },
              { icono: "🟢", valor: enStockCount, label: "En Stock", cls: "bg-emerald-500/15 border-emerald-500/25 text-emerald-500 dark:text-emerald-400", valCls: "text-emerald-600 dark:text-emerald-400" },
              { icono: "⚠️", valor: bajoStockCount, label: "Bajo Stock", cls: "bg-amber-500/15 border-amber-500/25 text-amber-500 dark:text-amber-400", valCls: "text-amber-600 dark:text-amber-400" },
              { icono: "🛑", valor: agotadosCount, label: "Agotados", cls: "bg-rose-500/15 border-rose-500/25 text-rose-500 dark:text-rose-400", valCls: "text-rose-600 dark:text-rose-400" },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white dark:bg-zinc-900/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 text-center sm:text-left"
              >
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center text-base sm:text-xl shrink-0 ${m.cls}`}>
                  {m.icono}
                </div>
                <div className="min-w-0">
                  <p className={`text-lg sm:text-2xl font-bold leading-tight tabular-nums ${m.valCls}`}>
                    {cargando && productos.length === 0 ? "..." : m.valor}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm font-medium truncate">{m.label}</h3>
                </div>
              </div>
            ))}
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

        {/* Buscador y Filtros: en una sola fila en móvil y escritorio */}
        <div className="order-2 sm:order-3 flex flex-row items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
          <div className="relative min-w-0 flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
              🔍
            </span>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm [&::-webkit-search-cancel-button]:hidden"
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

          {/* Botones Móvil: Filtro (con punto azul si activo) + Métricas */}
          <div className="relative sm:hidden flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMovilAbierto(!filtroMovilAbierto)}
              title="Filtrar"
              aria-label="Filtrar"
              className={`relative w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                hayFiltroActivo
                  ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-7 8.25V19.5l-4 1.5v-8.25L3 4.5Z" />
              </svg>
              {hayFiltroActivo && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-zinc-950" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMostrarMetricasMovil((v) => !v)}
              title="Métricas"
              aria-label="Métricas"
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                mostrarMetricasMovil
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M8 17v-5m4 5V8m4 9v-3" />
              </svg>
            </button>

            {filtroMovilAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setFiltroMovilAbierto(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1.5 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Estado de Stock
                  </div>
                  {[
                    { id: "TODOS", label: "Todos" },
                    { id: "EN_STOCK", label: "En Stock" },
                    { id: "BAJO_STOCK", label: "Bajo Stock" },
                    { id: "AGOTADO", label: "Agotados" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setSelectedEstado(opcion.id);
                        setFiltroMovilAbierto(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        selectedEstado === opcion.id
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
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

                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Categoría
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("");
                      setFiltroMovilAbierto(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                      !selectedCategory
                        ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                    }`}
                  >
                    <span>Todas las categorías</span>
                    {!selectedCategory && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  {Array.from(
                    new Set([
                      "Tienda",
                      "Taller",
                      "Lubricentro",
                      "Car Wash",
                      "Tecnicentro",
                      ...categories.map((c) => String(c).trim()).filter(Boolean),
                    ])
                  ).map((cat, idx) => (
                    <button
                      key={`cat-mov-${cat}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setFiltroMovilAbierto(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
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

          {/* Filtros Escritorio (sm:flex) */}
          <div className="hidden sm:flex items-center gap-3 w-auto shrink-0">
            {/* Filtro Categorías */}
            <div className="relative w-44 shrink-0">
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
                    {Array.from(new Set(["Tienda", "Taller", "Lubricentro", "Car Wash", "Tecnicentro", ...categories.map((c) => String(c).trim()).filter(Boolean)])).map((cat, idx) => (
                      <button
                        key={`cat-prod-${cat}-${idx}`}
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
            <div className="relative w-40 shrink-0">
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
                  No hay productos disponibles en esta sede
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
              {/* Vista Móvil (md:hidden): Tarjetas estructuradas idénticas a Clientes */}
              <div className="md:hidden space-y-3.5">
                {productosFiltrados.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden active:bg-zinc-50 dark:active:bg-zinc-800/40 transition-colors"
                  >
                    {/* Fila 1: Foto + Nombre + Código/Marca + Estado */}
                    <div className="p-3.5 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-2xs">
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-[15px] leading-tight text-zinc-900 dark:text-zinc-100 truncate">
                            {formatearPrimeraMayuscula(item.name)}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${getStatusColor(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                            #{item.code}
                          </span>
                          {item.brand && (
                            <span className="truncate">• {item.brand}</span>
                          )}
                          {item.location && (
                            <span className="text-[11px] text-zinc-400 ml-auto flex items-center gap-0.5">
                              <span>📍</span> {item.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fila 2: Dos recuadros ordenados (Precio PVP / Stock) */}
                    <div className="px-3.5 pb-3 grid grid-cols-2 gap-2">
                      <div className="min-w-0 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/70 dark:border-blue-500/20 px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600/80 dark:text-blue-400/80">
                          Precio PVP
                        </p>
                        <p className="text-[14px] font-mono font-bold text-blue-700 dark:text-sky-300 truncate">
                          ${Number(item.price || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                          Existencia
                        </p>
                        <p className="text-[13px] font-mono font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {item.stock} uds <span className="text-[11px] font-normal text-zinc-400">(Mín: {item.minStock})</span>
                        </p>
                      </div>
                    </div>

                    {/* Fila 3: Categorías, Presentación y Módulos (deslizables horizontalmente) */}
                    <div className="px-3.5 pb-3">
                      <div className="flex gap-1.5 overflow-x-auto -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {item.category && item.category !== "General" && (
                          <span className="shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-lg text-[11px] font-medium border border-zinc-200 dark:border-zinc-700">
                            {item.category}
                          </span>
                        )}
                        {item.subCategory && (
                          <span className="shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-lg text-[11px] font-medium border border-zinc-200 dark:border-zinc-700">
                            {item.subCategory}
                          </span>
                        )}
                        {item.presentation && (
                          <span className="shrink-0 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg text-[11px] font-medium border border-amber-200 dark:border-amber-500/20">
                            {item.presentation}
                          </span>
                        )}
                        {item.tipo &&
                          parsearModulos(item.tipo).map((t) => (
                            <span
                              key={t}
                              className="shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg text-[11px] font-medium border border-blue-200 dark:border-blue-500/20"
                            >
                              {t}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Fila 4: Botones grandes abajo (Editar y Eliminar) */}
                    <div className="flex items-stretch border-t border-zinc-100 dark:border-zinc-800 divide-x divide-zinc-100 dark:divide-zinc-800">
                      <Link
                        href={`/pos/catalogo/editar?id=${item.id}`}
                        className="flex-1 h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 active:bg-blue-50 dark:active:bg-blue-500/10 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span>Editar</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setProductoAEliminar(item)}
                        disabled={eliminandoId === item.id}
                        className="flex-1 h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 active:bg-rose-50 dark:active:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Eliminar</span>
                      </button>
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
                                <div className="font-bold text-zinc-900 dark:text-white mb-0.5">{formatearPrimeraMayuscula(item.name)}</div>
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
                            <div className="flex flex-col gap-1 items-start">
                              {item.category && item.category !== "General" && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  {item.category}
                                </span>
                              )}
                              {item.tipo ? (
                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                  {parsearModulos(item.tipo).map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  {item.category || "General"}
                                </span>
                              )}
                              {item.subCategory && (
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                  Subcategoría: {item.subCategory}
                                </span>
                              )}
                              {item.presentation && (
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                  Envase: {item.presentation}
                                </span>
                              )}
                            </div>
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
                  <ProductoFotoPicker
                    imageUrl={form.imageUrl}
                    uploading={subiendoFotoModal}
                    onFileSelected={handleSubirFotoModal}
                    onRemove={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                    error={errorFotoModal}
                    size="compact"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Código
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
                      Tipo
                    </label>
                    <SelectorModulos
                      value={form.tipo}
                      onChange={(nuevoTipo) => setForm({ ...form, tipo: nuevoTipo })}
                    />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CamposTaxonomiaProducto
                      compact
                      tipo={form.tipo}
                      category={form.category}
                      subCategory={form.subCategory}
                      presentation={form.presentation}
                      onChange={handleTaxonomiaProductoChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                      Stock Actual en Sede
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
