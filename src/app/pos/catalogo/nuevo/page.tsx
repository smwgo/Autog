"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import SelectorModulos from "@/components/pos/SelectorModulos";

export default function NuevoProductoPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    brand: "",
    category: "",
    tipo: "Tienda",
    price: "",
    costPrice: "",
    stock: "0",
    minStock: "5",
    location: "",
    imageUrl: "",
  });

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

    setGuardando(true);

    try {
      const payload = {
        ...formData,
        category: formData.category.trim() || "General",
      };
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "Error al registrar el producto en la base de datos.");
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

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-4xl mx-auto w-full">
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
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl">
            📦
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Registrar Producto
          </h1>
        </div>

        {/* Mensaje de Éxito */}
        {mensajeExito && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm animate-fade-in">
            <span className="text-xl">✅</span>
            <span>¡Producto registrado con éxito! Redirigiendo al catálogo...</span>
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
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Vista Previa Interactiva (Tocar para subir) */}
                  <label
                    className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 overflow-hidden flex items-center justify-center shrink-0 shadow-sm group cursor-pointer transition-all select-none ${
                      subiendoFoto ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      disabled={subiendoFoto}
                      onChange={handleSubirFoto}
                      className="hidden"
                    />

                    {subiendoFoto ? (
                      <div className="flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 gap-1.5 p-2 text-center">
                        <svg className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        <span className="text-[10px] font-bold">Subiendo...</span>
                      </div>
                    ) : formData.imageUrl ? (
                      <>
                        <img
                          src={formData.imageUrl}
                          alt="Previsualización de producto"
                          className="w-full h-full object-contain p-1.5 transition-transform group-hover:scale-105"
                        />
                        {/* Overlay hover para cambiar foto */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1 text-center">
                          <span className="text-xl">📷</span>
                          <span className="text-[10px] font-bold">Cambiar foto</span>
                        </div>
                        {/* Botón quitar foto */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFormData((prev) => ({ ...prev, imageUrl: "" }));
                          }}
                          title="Quitar foto"
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-90 z-10"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors p-2 text-center">
                        <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">📷</span>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Toca para subir</span>
                      </div>
                    )}
                  </label>

                  {errorFoto && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">⚠️ {errorFoto}</p>
                  )}
                </div>
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
                  Stock Inicial (uds.)
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
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </main>

      <PosMobileNav />
    </div>
  );
}
