"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";

interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number | string;
  estimatedMinutes: number;
  requiresBay: boolean;
}

export default function NuevaOrdenTallerPage() {
  const router = useRouter();

  // Estados del Formulario
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [client, setClient] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [mileage, setMileage] = useState("");
  const [mechanic, setMechanic] = useState("Carlos Rodríguez");
  const [notes, setNotes] = useState("");
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);

  // Catálogo de Servicios
  const [servicios, setServicios] = useState<ServiceItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [busquedaServicio, setBusquedaServicio] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargarServicios() {
      try {
        setCargando(true);
        const res = await fetch("/api/servicios-taller?activos=true");
        const data = await res.json();
        if (res.ok && data.success) {
          setServicios(data.servicios || []);
        }
      } catch (err) {
        console.error("Error al cargar servicios:", err);
      } finally {
        setCargando(false);
      }
    }
    cargarServicios();
  }, []);

  const categorias = Array.from(new Set(servicios.map((s) => s.category)));

  const toggleServicio = (srv: ServiceItem) => {
    const existe = selectedServices.some((s) => s.id === srv.id);
    if (existe) {
      setSelectedServices(selectedServices.filter((s) => s.id !== srv.id));
    } else {
      setSelectedServices([...selectedServices, srv]);
    }
  };

  const totalMinutos = selectedServices.reduce(
    (acc, s) => acc + (s.estimatedMinutes || 0),
    0
  );
  const totalCosto = selectedServices.reduce(
    (acc, s) => acc + Number(s.price || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle.trim() || !plate.trim() || !client.trim()) {
      alert("Por favor completa los campos requeridos: Vehículo, Placa y Cliente.");
      return;
    }

    setGuardando(true);

    try {
      const payload = {
        vehicle: vehicle.trim(),
        plate: plate.trim().toUpperCase(),
        client: client.trim(),
        clientPhone: clientPhone.trim(),
        mileage: mileage.trim(),
        mechanic,
        notes: notes.trim(),
        services: selectedServices.length > 0 ? selectedServices.map((s) => s.name) : ["Revisión General"],
        totalEstimated: totalCosto,
        estimatedOut: totalMinutos > 0 ? `${totalMinutos} min estimados` : "En Evaluación",
      };

      const res = await fetch("/api/taller/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar la orden");
      }

      router.push("/taller/ordenes");
    } catch (err: any) {
      console.error("Error al crear orden:", err);
      alert(err.message || "No se pudo guardar la orden. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const serviciosFiltrados = servicios.filter((s) => {
    const matchCat = filtroCategoria === "TODAS" || s.category === filtroCategoria;
    const matchBusqueda =
      !busquedaServicio ||
      s.name.toLowerCase().includes(busquedaServicio.toLowerCase()) ||
      s.code.toLowerCase().includes(busquedaServicio.toLowerCase());
    return matchCat && matchBusqueda;
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
          <Link
            href="/taller/ordenes"
            className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium min-h-[44px] md:min-h-0 items-center"
          >
            &larr; Volver a Órdenes
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100 font-semibold truncate">
            Nueva Orden de Trabajo
          </span>
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl shrink-0">
                🚗
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Nueva Orden de Trabajo
                </h1>
              </div>
            </div>
          </div>

          <Link
            href="/pos/servicios"
            className="h-11 px-4 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-sm font-semibold hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all flex items-center gap-2 w-fit"
          >
            <span>⚙️</span> Servicios
          </Link>
        </div>

        {/* Formulario Principal en 2 Columnas */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Columna Izquierda: Datos del Vehículo y Cliente (7 columnas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tarjeta 1: Vehículo */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                Datos del Vehículo
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                    Vehículo (Marca y Modelo) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Toyota Hilux 2022"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                    Placa / Patente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: ABC-123"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono text-base sm:text-sm uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Kilometraje Actual (km)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 45200"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            {/* Tarjeta 2: Cliente y Asignación */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Cliente y Asignación
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Carlos Pérez"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: +593 99 123 4567"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Mecánico Asignado
                </label>
                <select
                  value={mechanic}
                  onChange={(e) => setMechanic(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                >
                  <option value="Carlos Rodríguez">Carlos Rodríguez (Especialista Frenos/Motor)</option>
                  <option value="Luis Martínez">Luis Martínez (Mantenimiento Rápido)</option>
                  <option value="Andrés Castro">Andrés Castro (Electricidad y Diagnóstico)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                  Motivo de Ingreso / Fallas Reportadas
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalla ruidos, luces de advertencia o solicitudes específicas del cliente..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white resize-y"
                />
              </div>
            </div>
          </div>

          {/* Columna Derecha: Selección de Servicios y Resumen (5 columnas) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Tarjeta de Servicios */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  Servicios a Realizar
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">
                  {selectedServices.length} seleccionados
                </span>
              </div>

              {/* Filtros del catálogo */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Buscar servicio..."
                  value={busquedaServicio}
                  onChange={(e) => setBusquedaServicio(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                />

                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none dark:text-white"
                >
                  <option value="TODAS">Todas las Categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de Servicios */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {cargando ? (
                  <p className="text-center py-6 text-xs text-zinc-400">
                    Cargando catálogo de servicios...
                  </p>
                ) : serviciosFiltrados.length === 0 ? (
                  <p className="text-center py-6 text-xs text-zinc-400">
                    No se encontraron servicios disponibles.
                  </p>
                ) : (
                  serviciosFiltrados.map((s) => {
                    const isSelected = selectedServices.some((sel) => sel.id === s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleServicio(s)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 min-h-[44px] ${
                          isSelected
                            ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-sm"
                            : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-5 h-5 cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white leading-snug text-sm sm:text-xs">
                              {s.name}
                            </p>
                            <span className="text-[11px] text-zinc-500">
                              ⏱️ {s.estimatedMinutes} min | {s.category}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono font-bold text-teal-700 dark:text-teal-400 text-sm whitespace-nowrap">
                          ${Number(s.price).toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Resumen de Tiempos y Costos */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-zinc-500">
                  <span>Tiempo estimado en taller:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                    {totalMinutos} minutos
                  </strong>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-zinc-900 dark:text-white pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                  <span>Total Mano de Obra:</span>
                  <span className="text-xl font-black text-teal-600 font-mono">
                    ${totalCosto.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="/taller/ordenes"
                className="flex-1 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-700 font-semibold text-center text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={guardando}
                className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                {guardando ? "Creando Orden..." : "Crear Orden de Trabajo"}
              </button>
            </div>
          </div>
        </form>
      </main>

      <TallerMobileNav />
    </div>
  );
}
