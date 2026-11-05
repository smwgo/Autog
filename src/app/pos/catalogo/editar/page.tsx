"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import SelectorModulos from "@/components/pos/SelectorModulos";
import { ProductoFotoPicker } from "@/components/pos/ProductoFotoPicker";
import { getClientActiveBranch } from "@/lib/branch";

function EditarProductoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    brand: "",
    category: "",
    tipo: "Tienda",
    price: "",
    stock: "0",
    minStock: "5",
    location: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (!id) {
      setError("No se proporcionó un ID de producto para editar.");
      setCargando(false);
      return;
    }

    const cargarProducto = async () => {
      try {
        setCargando(true);
        setError(null);
        const branch = getClientActiveBranch();
        const res = await fetch(`/api/productos?id=${id}&sede=${branch}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success || !data.producto) {
          throw new Error(data.error || "No se encontró el producto en la base de datos.");
        }

        const p = data.producto;
        setFormData({
          code: p.code || "",
          name: p.name || "",
          brand: p.brand || "",
          category: p.category && p.category !== "General" ? p.category : "",
          tipo: p.tipo || "Tienda",
          price: p.price !== undefined && p.price !== null ? String(p.price) : "",
          stock: p.stock !== undefined && p.stock !== null ? String(p.stock) : "0",
          minStock: p.minStock !== undefined && p.minStock !== null ? String(p.minStock) : "5",
          location: p.location || "",
          imageUrl: p.imageUrl || "",
        });
      } catch (err: any) {
        console.error("Error al cargar producto:", err);
        setError(err.message || "Error al cargar los datos del producto.");
      } finally {
        setCargando(false);
      }
    };

    cargarProducto();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubirFoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorFoto("El archivo seleccionado debe ser una imagen válida (JPG, PNG, WEBP, AVIF).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorFoto("La imagen no debe superar los 8 MB.");
      return;
    }

    setErrorFoto(null);
    setSubiendoFoto(true);

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

      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err: any) {
      setErrorFoto(err?.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!formData.name.trim()) {
      alert("El nombre del producto es obligatorio.");
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch("/api/productos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          branch: getClientActiveBranch(),
          code: formData.code,
          name: formData.name,
          brand: formData.brand,
          category: formData.category.trim() || "General",
          tipo: formData.tipo,
          price: formData.price,
          stock: formData.stock,
          minStock: formData.minStock,
          location: formData.location,
          imageUrl: formData.imageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "Error al actualizar el producto en la base de datos.");
        setGuardando(false);
        return;
      }

      setGuardando(false);
      setMensajeExito(true);

      setTimeout(() => {
        router.push("/pos/catalogo");
        router.refresh();
      }, 600);
    } catch (err: any) {
      console.error(err);
      alert("Error de conexión: " + (err.message || ""));
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Cargando datos del producto...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
          <p className="font-bold mb-2">⚠️ {error}</p>
          <Link
            href="/pos/catalogo"
            className="inline-block mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700"
          >
            Volver a Productos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb & Volver */}
      <div className="mb-6">
        <Link
          href="/pos/catalogo"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
        >
          &larr; Volver a Productos
        </Link>
      </div>

      {/* Encabezado */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl">
            ✏️
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Editar Producto
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              {formData.code || "Sin código"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pos/catalogo"
            className="px-5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {guardando ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mensaje de Éxito */}
      {mensajeExito && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm animate-fade-in">
          <span className="text-xl">✅</span>
          <span>¡Producto actualizado con éxito! Redirigiendo al catálogo...</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sección Foto del Producto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Foto del Producto
              </label>

              <ProductoFotoPicker
                imageUrl={formData.imageUrl}
                uploading={subiendoFoto}
                onFileSelected={handleSubirFoto}
                onRemove={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                error={errorFoto}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Código
              </label>
              <input
                type="text"
                name="code"
                placeholder="PROD-001"
                value={formData.code}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-base font-mono uppercase outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Marca
              </label>
              <input
                type="text"
                name="brand"
                placeholder="Mobil 1, Bosch, Brembo..."
                value={formData.brand}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-base outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Nombre del Producto
              </label>
              <input
                type="text"
                name="name"
                placeholder="Aceite Sintético 5W-30"
                value={formData.name}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-base outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Tipo
              </label>
              <SelectorModulos
                value={formData.tipo}
                onChange={(nuevoTipo) => setFormData((prev) => ({ ...prev, tipo: nuevoTipo }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Categoría
              </label>
              <input
                type="text"
                name="category"
                placeholder="Lubricantes, filtros..."
                value={formData.category}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Precio de Venta ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                placeholder="15.50"
                value={formData.price}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-base font-bold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Stock (uds.)
              </label>
              <input
                type="number"
                min="0"
                name="stock"
                placeholder="0"
                value={formData.stock}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-base outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Stock Mínimo de Alerta
              </label>
              <input
                type="number"
                min="0"
                name="minStock"
                placeholder="5"
                value={formData.minStock}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-base outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Ubicación en Almacén
              </label>
              <input
                type="text"
                name="location"
                placeholder="Pasillo 2, Estante A"
                value={formData.location}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-base outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Botones al pie */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/pos/catalogo"
            className="px-6 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={guardando}
            className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </>
  );
}

export default function EditarProductoPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-4xl mx-auto w-full">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Cargando...</p>
            </div>
          }
        >
          <EditarProductoContent />
        </Suspense>
      </main>

      <PosMobileNav />
    </div>
  );
}
