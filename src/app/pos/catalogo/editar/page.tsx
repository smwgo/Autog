"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

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
    category: "General",
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
        const res = await fetch(`/api/productos?id=${id}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success || !data.producto) {
          throw new Error(data.error || "No se encontró el producto en la base de datos.");
        }

        const p = data.producto;
        setFormData({
          code: p.code || "",
          name: p.name || "",
          brand: p.brand || "",
          category: p.category || "General",
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

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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
          code: formData.code,
          name: formData.name,
          brand: formData.brand,
          category: formData.category,
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
      }, 1000);
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
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 hover:border-blue-500/50 transition-colors">
                {/* Vista Previa */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center shrink-0 shadow-sm group">
                  {formData.imageUrl ? (
                    <>
                      <img
                        src={formData.imageUrl}
                        alt="Previsualización de producto"
                        className="w-full h-full object-contain p-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                        title="Quitar foto"
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-90"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500">
                      <span className="text-3xl mb-1">📷</span>
                      <span className="text-[11px] font-medium">Sin foto</span>
                    </div>
                  )}
                </div>

                {/* Acciones de Carga */}
                <div className="flex-1 w-full space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className={`h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer transition-all ${subiendoFoto ? "opacity-60 pointer-events-none" : ""}`}>
                      {subiendoFoto ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                          </svg>
                          <span>Subiendo foto...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>{formData.imageUrl ? "Cambiar Imagen" : "Subir Foto desde Dispositivo"}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={subiendoFoto}
                        onChange={handleSubirFoto}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-zinc-400">o pega un enlace web directo:</span>
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      name="imageUrl"
                      placeholder="https://ejemplo.com/foto-producto.jpg"
                      value={formData.imageUrl}
                      onChange={handleChange}
                      className="w-full h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs outline-none focus:border-blue-500 font-mono text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
                    />
                  </div>
                  {errorFoto && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ {errorFoto}</p>
                  )}
                  <p className="text-[11px] text-zinc-400">Formatos admitidos: JPG, PNG, WEBP o AVIF (máx. 8 MB).</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                Código / SKU
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
                Categoría
              </label>
              <input
                type="text"
                name="category"
                placeholder="Lubricantes, Filtros, Frenos..."
                value={formData.category}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-base outline-none focus:border-blue-500"
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
