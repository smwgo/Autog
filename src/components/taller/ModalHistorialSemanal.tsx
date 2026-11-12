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

  // Totales de la semana
  const totalVehiculos = vehiculos.length;
  const { totalPagados, totalNoPagados } = useMemo(() => {
    let pagados = 0;
    let noPagados = 0;

    for (const v of vehiculos) {
      const pagado =
        (Number(v.totalPaid) > 0 && Number(v.totalPaid) >= Number(v.totalCost)) ||
        ["pagado", "cobrado", "facturado"].some(
          (s) =>
            (v.status || "").toLowerCase().includes(s) ||
            (v.deliveryStatus || "").toLowerCase().includes(s) ||
            (v.quoteStatus || "").toLowerCase().includes(s)
        );
      if (pagado) {
        pagados++;
      } else {
        noPagados++;
      }
    }

    return { totalPagados: pagados, totalNoPagados: noPagados };
  }, [vehiculos]);

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
                  Historial Semanal
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Semana Actual
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span>📅 {rangoSemanaTexto}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={cargarHistorialSemanal}
              disabled={cargando}
              title="Recargar historial"
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-200/60 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-sm font-semibold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* BARRA DE ESTADÍSTICAS */}
        <div className="px-5 sm:px-6 py-3 bg-zinc-100/60 dark:bg-black/20 border-b border-zinc-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Atendidos esta semana:</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white px-2.5 py-0.5 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-2xs">
              {totalVehiculos} {totalVehiculos === 1 ? "vehículo" : "vehículos"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Pagados:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              {totalPagados}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="text-zinc-500 dark:text-zinc-400">No pagados:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              {totalNoPagados}
            </span>
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

        {/* LISTA DE VEHÍCULOS ATENDIDOS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
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
              <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-3xl">
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
            <div className="grid grid-cols-1 gap-3">
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

                // Estado de Pago (sea que pague o no)
                const estaPagado =
                  (Number(v.totalPaid) > 0 && Number(v.totalPaid) >= Number(v.totalCost)) ||
                  ["pagado", "cobrado", "facturado"].some(
                    (s) =>
                      (v.status || "").toLowerCase().includes(s) ||
                      (v.deliveryStatus || "").toLowerCase().includes(s)
                  );

                // Estado de Solicitud / Propuesta (sea que envíe la solicitud a propuesta o no)
                const quoteSt = (v.quoteStatus || "").toLowerCase();
                const tienePropuestaEnviada =
                  quoteSt.includes("pendiente") ||
                  quoteSt.includes("propuesta") ||
                  quoteSt.includes("aprobaci");
                const propuestaAprobada =
                  quoteSt.includes("aprobada") || quoteSt.includes("aprobado");
                const propuestaRechazada = quoteSt.includes("rechazad");

                // Estado operativo de la orden
                const stLower = (v.status || "En Proceso").toLowerCase();

                return (
                  <div
                    key={v.id || v.orderNumber}
                    onClick={() => onSeleccionarAuto && onSeleccionarAuto(v)}
                    className={`p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#16161b] hover:border-purple-500/40 dark:hover:border-purple-500/40 transition-all shadow-xs flex flex-col gap-3 group ${
                      onSeleccionarAuto ? "cursor-pointer" : ""
                    }`}
                  >
                    {/* FILA SUPERIOR: Placa, Vehículo, Cliente, Costo y Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* PLACA */}
                        <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 text-blue-700 dark:text-blue-300 font-mono font-normal text-xs sm:text-sm tracking-wider shrink-0 flex items-center gap-1.5">
                          <span className="text-[10px] text-blue-500/70 font-sans font-normal">EC</span>
                          <span className="font-normal">{v.plate || "S/P"}</span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                            {v.vehicle || `${v.brand || ""} ${v.model || ""}`.trim() || "Vehículo"}{" "}
                            {v.year ? `(${v.year})` : ""}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">👤 {v.client}</span>
                            {v.orderNumber && (
                              <span className="ml-2 text-[11px] text-zinc-400">
                                • {v.orderNumber}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* BADGES: Propuesta, Estado de orden, Estado de Pago, y Monto */}
                      <div className="flex flex-wrap items-center gap-2 ml-auto">
                        {/* 1. Badge de Solicitud / Propuesta (sea que envíe a propuesta o no) */}
                        {propuestaAprobada ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            ✓ Propuesta Aprobada
                          </span>
                        ) : tienePropuestaEnviada ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                            📋 Propuesta Enviada
                          </span>
                        ) : propuestaRechazada ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                            ✕ Rechazada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20 flex items-center gap-1">
                            📝 Sin propuesta
                          </span>
                        )}

                        {/* 2. Badge de Estado de la Orden */}
                        {stLower.includes("pausad") ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            ⏸️ Pausada
                          </span>
                        ) : stLower.includes("entreg") || stLower.includes("finaliz") ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                            🚗 Entregado
                          </span>
                        ) : stLower.includes("listo") ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1">
                            ✅ Listo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                            ⚙️ {v.status || "En Proceso"}
                          </span>
                        )}

                        {/* 3. Badge de Pago (sea que pague o no) */}
                        {estaPagado ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            ✓ PAGADO
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            ⏳ NO PAGADO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SERVICIOS / ITEMS */}
                    {Array.isArray(v.services) && v.services.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-medium text-zinc-400">Servicios:</span>
                        {v.services.slice(0, 4).map((srv, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-white/5"
                          >
                            {srv}
                          </span>
                        ))}
                        {v.services.length > 4 && (
                          <span className="text-[10px] text-zinc-400 font-medium">
                            +{v.services.length - 4} más
                          </span>
                        )}
                      </div>
                    )}

                    {/* FILA INFERIOR: Mecánico y Fecha / Hora de atención */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <div>
                        <strong className="text-zinc-600 dark:text-zinc-300">Mecánico:</strong> {v.mechanic || "Taller"}
                      </div>
                      <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                        <span>🕒</span>
                        <span>{fechaFormateada}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="px-5 sm:px-6 py-3 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-[#16161a]/80 flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Mostrando {vehiculosFiltrados.length} de {vehiculos.length} vehículos atendidos esta semana
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

