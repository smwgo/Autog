"use client";

import React, { useState, useEffect, useMemo } from "react";

export interface VehiculoAtendidoSemanal {
  id: string;
  orderNumber: string;
  plate: string;
  vehicle: string;
  brand?: string;
  model?: string;
  year?: string | number;
  client: string;
  clientPhone?: string;
  services: string[];
  cost: number;
  totalCost: number;
  totalPaid: number;
  mechanic: string;
  mileage: string;
  date: string;
  photos: string[];
  status: string;
  quoteStatus?: string;
  deliveryStatus?: string;
  source?: string;
}

interface ModalHistorialSemanalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionarAuto?: (auto: any) => void;
}

export default function ModalHistorialSemanal({
  isOpen,
  onClose,
  onSeleccionarAuto,
}: ModalHistorialSemanalProps) {
  const [cargando, setCargando] = useState(false);
  const [vehiculos, setVehiculos] = useState<VehiculoAtendidoSemanal[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [semanaInicio, setSemanaInicio] = useState<string>("");
  const [semanaFin, setSemanaFin] = useState<string>("");
  const [fotoEnGrande, setFotoEnGrande] = useState<string | null>(null);

  // Cargar historial semanal al abrir el modal
  const cargarHistorialSemanal = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/taller/operacion?historialSemanal=true");
      if (!res.ok) throw new Error("Error en servidor al consultar historial");
      const data = await res.json();
      if (data.success && Array.isArray(data.attendedVehicles)) {
        setVehiculos(data.attendedVehicles);
        if (data.weekStart) setSemanaInicio(data.weekStart);
        if (data.weekEnd) setSemanaFin(data.weekEnd);
      } else {
        setVehiculos([]);
      }
    } catch (err) {
      console.error("Error al cargar historial semanal:", err);
      setVehiculos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarHistorialSemanal();
    }
  }, [isOpen]);

  // Formatear rango de la semana para mostrar al usuario
  const rangoSemanaTexto = useMemo(() => {
    const inicio = semanaInicio ? new Date(semanaInicio) : (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diff);
      return mon;
    })();

    const fin = semanaFin ? new Date(semanaFin) : (() => {
      const f = new Date(inicio);
      f.setDate(inicio.getDate() + 6);
      return f;
    })();

    const opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const strInicio = inicio.toLocaleDateString("es-ES", opciones);
    const strFin = fin.toLocaleDateString("es-ES", opciones);
    const anio = fin.getFullYear();

    return `${strInicio} al ${strFin}, ${anio}`;
  }, [semanaInicio, semanaFin]);

  // Filtrado por buscador
  const vehiculosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return vehiculos;
    const q = busqueda.toLowerCase().trim();
    return vehiculos.filter((v) => {
      return (
        (v.plate && v.plate.toLowerCase().includes(q)) ||
        (v.client && v.client.toLowerCase().includes(q)) ||
        (v.vehicle && v.vehicle.toLowerCase().includes(q)) ||
        (v.orderNumber && v.orderNumber.toLowerCase().includes(q)) ||
        (v.mechanic && v.mechanic.toLowerCase().includes(q)) ||
        (v.status && v.status.toLowerCase().includes(q)) ||
        (v.quoteStatus && v.quoteStatus.toLowerCase().includes(q)) ||
        (Array.isArray(v.services) && v.services.some((s) => s.toLowerCase().includes(q)))
      );
    });
  }, [vehiculos, busqueda]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ENCABEZADO */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-50/80 dark:bg-[#16161a]/80 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  Semana Actual
                </h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-200/60 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-sm font-semibold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA */}
        <div className="px-5 sm:px-6 py-3 border-b border-zinc-200 dark:border-white/5">
          <div className="relative">
            <svg
              className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por placa, cliente, vehículo o mecánico..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#16161a] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* TABLA / LISTA TRADICIONAL DE VEHÍCULOS ATENDIDOS */}
        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <svg className="w-8 h-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-xs sm:text-sm font-medium">Cargando vehículos atendidos esta semana...</p>
            </div>
          ) : vehiculosFiltrados.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-2xl">
                🚗
              </div>
              {busqueda ? (
                <>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    No se encontraron vehículos que coincidan con la búsqueda
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                    Prueba buscando con otro término, placa o nombre de cliente.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    No hay vehículos registrados en los 7 días de esta semana
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                    Los vehículos recibidos o atendidos durante la semana aparecerán aquí automáticamente.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 font-medium text-sm sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="py-3.5 px-4 font-medium">Orden</th>
                    <th className="py-3.5 px-4 font-medium">Vehículo</th>
                    <th className="py-3.5 px-4 font-medium">Cliente</th>
                    <th className="py-3.5 px-4 font-medium">Mecánico</th>
                    <th className="py-3.5 px-4 font-medium text-right">Fecha / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5 text-zinc-800 dark:text-zinc-200 text-sm font-normal">
                  {vehiculosFiltrados.map((v) => {
                    const fecha = v.date ? new Date(v.date) : null;
                    const fechaFormateada = fecha && !isNaN(fecha.getTime())
                      ? fecha.toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "Esta semana";

                    // Limpiar "OT" o "OT #" para dejar solo el número de orden con #
                    const numeroOrden = String(v.orderNumber || "").replace(/^OT\s*#?/i, "").replace(/^#/, "");

                    return (
                      <tr
                        key={v.id || v.orderNumber}
                        className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* ORDEN */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-sm font-normal">
                          <span className="text-purple-600 dark:text-purple-400 font-mono font-normal text-sm">
                            #{numeroOrden}
                          </span>
                        </td>

                        {/* VEHÍCULO CON PLACA DEBAJO */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-sm font-normal">
                          <div className="text-zinc-800 dark:text-zinc-200 text-sm font-normal">
                            {v.vehicle || `${v.brand || ""} ${v.model || ""}`.trim() || "Vehículo"}
                            {v.year && (
                              <span className="text-zinc-400 text-sm ml-1 font-normal">({v.year})</span>
                            )}
                          </div>
                          <div className="text-sm font-mono text-blue-600 dark:text-blue-400 font-normal mt-0.5">
                            {v.plate || "S/P"}
                          </div>
                        </td>

                        {/* CLIENTE */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-sm text-zinc-800 dark:text-zinc-200 font-normal">
                          {v.client || "Consumidor Final"}
                        </td>

                        {/* MECÁNICO */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400 font-normal">
                          {v.mechanic || "Sin asignar"}
                        </td>

                        {/* FECHA / HORA */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                          {fechaFormateada}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="px-5 sm:px-6 py-3 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-[#16161a]/80 flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {vehiculosFiltrados.length === vehiculos.length
              ? `${vehiculos.length} vehículos`
              : `${vehiculosFiltrados.length} de ${vehiculos.length} vehículos`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* LIGHTBOX PARA PREVISUALIZAR FOTO */}
      {fotoEnGrande && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFotoEnGrande(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
            <img src={fotoEnGrande} alt="Foto ampliada" className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setFotoEnGrande(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

