"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

const TIEMPOS_RAPIDOS = [
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
  { label: "45 min", value: "45" },
  { label: "1 hr", value: "60" },
  { label: "1.5 hrs", value: "90" },
  { label: "2 hrs", value: "120" },
];

export default function NuevoServicioPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formulario
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("30");
  const [description, setDescription] = useState("");
  const [requiresBay, setRequiresBay] = useState(true);
  const [active, setActive] = useState(true);

  // Generar código aleatorio al cargar
  useEffect(() => {
    generarCodigo();
  }, []);

  const generarCodigo = () => {
    const randomCode = `SRV-${Math.floor(1000 + Math.random() * 9000)}`;
    setCode(randomCode);
  };

  const handleGuardar = async (crearOtro: boolean = false) => {
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Por favor ingresa el nombre del servicio.");
      return;
    }

    if (!price || parseFloat(price) < 0) {
      setErrorMsg("Por favor ingresa un precio válido mayor o igual a 0.");
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        code: code.trim().toUpperCase() || undefined,
        name: name.trim(),
        category: category.trim() || "General",
        price: parseFloat(price),
        estimatedMinutes: parseInt(estimatedMinutes, 10) || 30,
        description: description.trim() || null,
        requiresBay,
        active,
      };

      const res = await fetch("/api/servicios-taller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el servicio.");
      }

      setGuardando(false);

      if (crearOtro) {
        setMensajeExito(`¡Servicio "${name.trim()}" guardado! Puedes ingresar el siguiente.`);
        // Limpiar para crear otro inmediatamente
        setName("");
        setPrice("");
        setDescription("");
        generarCodigo();
        setTimeout(() => {
          setMensajeExito(null);
        }, 4000);
      } else {
        setMensajeExito("¡Servicio registrado exitosamente! Redirigiendo...");
        setTimeout(() => {
          router.push("/pos/servicios");
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al conectar con el servidor.");
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-24 md:pb-0">
      <Header />

      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 md:px-12 max-w-4xl mx-auto w-full">
        {/* Breadcrumb & Volver */}
        <div className="mb-6">
          <Link
            href="/pos/servicios"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">&larr;</span>
            <span>Volver</span>
          </Link>
        </div>

        {/* Encabezado */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl shadow-sm border border-blue-500/20">
              ⚙️
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Nuevo Servicio
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/pos/servicios"
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={() => handleGuardar(false)}
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                  <span>✓</span>
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mensaje de Éxito */}
        {mensajeExito && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm animate-in fade-in zoom-in-95 duration-200 shadow-sm">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold">{mensajeExito}</p>
            </div>
          </div>
        )}

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-800 dark:text-red-300 text-sm animate-in fade-in duration-200 shadow-sm">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold">Error al procesar la solicitud</p>
              <p className="text-xs text-red-700 dark:text-red-400">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Tarjeta 1: Información General */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
              <span>📋</span> Datos Básicos
            </h2>

            <div className="space-y-5">
              {/* Código & Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Código Único *
                    </label>
                    <button
                      type="button"
                      onClick={generarCodigo}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      title="Generar otro código"
                    >
                      🔄 Auto-generar
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="SRV-1001"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-base sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                    Categoría *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mantenimiento"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-base sm:text-sm font-normal focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Nombre - Ingreso Manual */}
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                  Nombre del Servicio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cambio de aceite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-base font-normal focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles del servicio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-base sm:text-sm font-normal focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-y"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Costos y Operación en Taller */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
              <span>💰</span> Tarifa y Operación
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Precio */}
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                    Precio ($ USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="45.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full h-12 pl-9 pr-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-xl font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Tiempo Estimado */}
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                    Tiempo Estimado
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-medium pointer-events-none">
                      min
                    </span>
                  </div>

                  {/* Botones rápidos de minutos */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIEMPOS_RAPIDOS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setEstimatedMinutes(t.value)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          estimatedMinutes === t.value
                            ? "bg-blue-600 text-white border-blue-600 font-bold"
                            : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Flags operativas */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bahía / Elevador */}
                <label
                  htmlFor="requiresBay"
                  className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="requiresBay"
                    checked={requiresBay}
                    onChange={(e) => setRequiresBay(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Requiere Bahía / Elevador
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                      Ocupa rampa física en taller.
                    </span>
                  </div>
                </label>

                {/* Estado Activo */}
                <label
                  htmlFor="activeService"
                  className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-all cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="activeService"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white block">
                      Servicio Activo
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                      Disponible en el POS y cotizaciones.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Botones al pie del formulario */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              href="/pos/servicios"
              className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={() => handleGuardar(false)}
              disabled={guardando}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                  <span>✓</span>
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <PosMobileNav />
    </div>
  );
}
