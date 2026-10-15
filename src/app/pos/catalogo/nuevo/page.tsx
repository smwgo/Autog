"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";

export default function NuevoProductoPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    brand: "",
    category: "General",
    price: "",
    costPrice: "",
    stock: "0",
    minStock: "5",
    location: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setGuardando(true);

    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
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
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl">
              📦
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Registrar Producto
            </h1>
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
                  <span>Guardar Producto</span>
                </>
              )}
            </button>
          </div>
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
              {guardando ? "Guardando..." : "Guardar Producto"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
