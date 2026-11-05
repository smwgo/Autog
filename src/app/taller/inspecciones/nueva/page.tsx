"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";

const CHECKLIST_ITEMS = [
  { id: "luces", label: "Iluminación y Faros", icon: "💡" },
  { id: "frenos", label: "Sistema de Frenos", icon: "🛑" },
  { id: "neumaticos", label: "Neumáticos y Presión", icon: "🛞" },
  { id: "bateria", label: "Batería y Encendido", icon: "🔋" },
  { id: "carroceria", label: "Carrocería y Pintura", icon: "🚗" },
  { id: "cristales", label: "Cristales y Parabrisas", icon: "🪟" },
  { id: "fluidos", label: "Fluidos y Fugas", icon: "💧" },
  { id: "limpiaparabrisas", label: "Escobillas y Plumillas", icon: "🧹" },
];

const FUEL_LEVELS = ["1/4", "1/2", "3/4", "Lleno"];

export default function NuevaInspeccionPage() {
  const router = useRouter();

  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState("Recepción");
  const [assignedTo, setAssignedTo] = useState("Carlos Rodríguez");
  const [fuelLevel, setFuelLevel] = useState("1/2");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Estado del checklist
  const [checklist, setChecklist] = useState<Record<string, "OK" | "Atención" | "Dañado">>({
    luces: "OK",
    frenos: "OK",
    neumaticos: "OK",
    bateria: "OK",
    carroceria: "OK",
    cristales: "OK",
    fluidos: "OK",
    limpiaparabrisas: "OK",
  });

  const setItemStatus = (itemId: string, status: "OK" | "Atención" | "Dañado") => {
    setChecklist((prev) => ({ ...prev, [itemId]: status }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicle.trim() || !plate.trim()) {
      alert("Por favor completa los campos de Vehículo y Placa.");
      return;
    }

    setGuardando(true);

    try {
      const payload = {
        vehicle: vehicle.trim(),
        plate: plate.trim().toUpperCase(),
        client: client.trim() || "Cliente General",
        type,
        assignedTo,
        fuelLevel,
        mileage: mileage.trim() || undefined,
        checklist,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/taller/inspecciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al registrar inspección");
      }

      router.push("/taller/inspecciones");
    } catch (err: any) {
      console.error("Error al crear inspección:", err);
      alert(err.message || "No se pudo registrar la inspección. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-5xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link
            href="/taller/inspecciones"
            className="hover:text-amber-600 transition-colors flex items-center gap-1 font-medium min-h-[44px] md:min-h-0 items-center"
          >
            &larr; Volver a Inspecciones
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100 font-semibold truncate">
            Nueva Inspección
          </span>
        </div>

        {/* Encabezado */}
        <div className="mb-6 sm:mb-8 flex items-center gap-3">
          <Link
            href="/taller/inspecciones"
            title="Volver a Inspecciones"
            className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0">
            📋
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Nueva Inspección
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Bloque 1: Datos del Vehículo */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5 sm:space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold">
                1
              </span>
              Vehículo y Cliente
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Vehículo (Marca / Modelo / Año) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Chevrolet D-Max 2022"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Placa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PDF-9876"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none uppercase transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ej: Marcelo Andrade"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Kilometraje
                </label>
                <input
                  type="text"
                  placeholder="Ej: 64,500 km"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Tipo de Inspección
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all cursor-pointer font-medium dark:text-white"
                >
                  <option value="Recepción">Recepción (Ingreso a taller)</option>
                  <option value="Diagnóstico">Diagnóstico Técnico</option>
                  <option value="Pre-Entrega">Pre-Entrega (Control de Calidad)</option>
                  <option value="General">Inspección General</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Inspector / Mecánico
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all cursor-pointer font-medium dark:text-white"
                >
                  <option value="Carlos Rodríguez">Carlos Rodríguez</option>
                  <option value="Luis Martínez">Luis Martínez</option>
                  <option value="Ana Torres">Ana Torres</option>
                  <option value="Sin asignar">Sin asignar</option>
                </select>
              </div>
            </div>

            {/* Nivel de Combustible */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2 block">
                Nivel de Combustible
              </label>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {FUEL_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFuelLevel(lvl)}
                    className={`h-11 px-2 sm:px-3 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all text-center flex items-center justify-center min-h-[44px] cursor-pointer ${
                      fuelLevel === lvl
                        ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-amber-300"
                    }`}
                  >
                    ⛽ {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bloque 2: Checklist Técnico */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5 sm:space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold">
                2
              </span>
              Puntos de Inspección
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {CHECKLIST_ITEMS.map((item) => {
                const currentStatus = checklist[item.id] || "OK";
                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">
                        {item.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setItemStatus(item.id, "OK")}
                        className={`h-11 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center min-h-[44px] cursor-pointer ${
                          currentStatus === "OK"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-emerald-50"
                        }`}
                      >
                        ✓ OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemStatus(item.id, "Atención")}
                        className={`h-11 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center min-h-[44px] cursor-pointer ${
                          currentStatus === "Atención"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-amber-50"
                        }`}
                      >
                        ⚠️ Atenc.
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemStatus(item.id, "Dañado")}
                        className={`h-11 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center min-h-[44px] cursor-pointer ${
                          currentStatus === "Dañado"
                            ? "bg-rose-500 text-white shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-rose-50"
                        }`}
                      >
                        ✕ Dañado
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloque 3: Observaciones */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold">
                3
              </span>
              Observaciones y Hallazgos
            </h2>

            <textarea
              rows={3}
              placeholder="Detalla daños en carrocería, pertenencias dejadas en el vehículo, fallas reportadas por el cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-y transition-all dark:text-white"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
            <Link
              href="/taller/inspecciones"
              className="h-12 px-6 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Guardar Inspección</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <TallerMobileNav />
    </div>
  );
}
