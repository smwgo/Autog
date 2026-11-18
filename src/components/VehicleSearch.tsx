"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

type EtapaTaller = "Diagnóstico" | "Reparación" | "Listo" | "Entregado";
type EstadoOperativo = "Trabajando" | "En Pausa" | "En Espera";

interface VehiculoSeguimiento {
  id: string;
  orderNumber: string | null;
  vehicle: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  plate: string;
  color?: string | null;
  imageUrl?: string | null;
  etapa: EtapaTaller | null;
  estadoOperativo?: EstadoOperativo | null;
  progress: number;
  updatedAt: string | null;
}

const ESTADO_OPERATIVO_ESTILO: Record<
  EstadoOperativo,
  { badge: string; dot: string }
> = {
  Trabajando: {
    badge:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  "En Pausa": {
    badge:
      "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
  },
  "En Espera": {
    badge:
      "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
    dot: "bg-zinc-400",
  },
};

const ETAPAS_ORDEN: EtapaTaller[] = [
  "Diagnóstico",
  "Reparación",
  "Listo",
  "Entregado",
];

const ETAPA_ESTILO: Record<
  EtapaTaller,
  { badge: string; dot: string; bar: string; desc: string }
> = {
  Diagnóstico: {
    badge:
      "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    desc: "Tu vehículo está siendo revisado por nuestros técnicos.",
  },
  Reparación: {
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    desc: "Estamos trabajando en el mantenimiento o reparación.",
  },
  Listo: {
    badge:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    desc: "Tu vehículo ya está listo para ser retirado.",
  },
  Entregado: {
    badge:
      "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
    dot: "bg-purple-500",
    bar: "bg-purple-500",
    desc: "Vehículo entregado al cliente.",
  },
};

export function VehicleSearch() {
  const [placaInput, setPlacaInput] = useState("");
  const [placaActiva, setPlacaActiva] = useState("");
  const [vehiculosCliente, setVehiculosCliente] = useState<
    VehiculoSeguimiento[]
  >([]);
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState<
    string | null
  >(null);
  const [cargando, setCargando] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  // Modal secundario de solicitud / pedido
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [vehiculoInfo, setVehiculoInfo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<any | null>(null);

  const consultarPorPlaca = useCallback(
    async (placa: string, silencioso = false) => {
      const limpia = placa.trim().toUpperCase();
      if (limpia.replace(/[^A-Z0-9]/g, "").length < 3) {
        if (!silencioso) {
          setErrorBusqueda("Ingresa al menos 3 caracteres de tu placa.");
        }
        return;
      }

      if (!silencioso) {
        setCargando(true);
        setErrorBusqueda(null);
      }

      try {
        const res = await fetch(
          `/api/taller/seguimiento-publico?placa=${encodeURIComponent(limpia)}&t=${Date.now()}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (res.ok && data?.success && Array.isArray(data.vehiculos)) {
          setVehiculosCliente(data.vehiculos);
          setPlacaActiva(limpia);
          setHasSearched(true);
          if (data.vehiculos.length > 0) {
            setVehiculoSeleccionadoId((prev) =>
              data.vehiculos.some((v: VehiculoSeguimiento) => v.id === prev)
                ? prev
                : data.vehiculos[0].id
            );
          } else {
            setVehiculoSeleccionadoId(null);
          }
        } else if (!silencioso) {
          setErrorBusqueda(data?.error || "No se pudo consultar la placa.");
        }
      } catch {
        if (!silencioso) {
          setErrorBusqueda("Error de conexión al consultar tu vehículo.");
        }
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    []
  );

  useRealtimeSync({
    channels: ["taller", "presupuestos"],
    onRefresh: () => {
      if (placaActiva) {
        void consultarPorPlaca(placaActiva, true);
      }
    },
  });

  const handleSubmitPlaca = (e: React.FormEvent) => {
    e.preventDefault();
    void consultarPorPlaca(placaInput, false);
  };

  const limpiarBusqueda = () => {
    setPlacaInput("");
    setPlacaActiva("");
    setVehiculosCliente([]);
    setVehiculoSeleccionadoId(null);
    setHasSearched(false);
    setErrorBusqueda(null);
  };

  const vehiculoActivo = useMemo(() => {
    if (vehiculosCliente.length === 0) return null;
    return (
      vehiculosCliente.find((v) => v.id === vehiculoSeleccionadoId) ||
      vehiculosCliente[0]
    );
  }, [vehiculosCliente, vehiculoSeleccionadoId]);

  const abrirModalPara = (infoPrevia?: string) => {
    setVehiculoInfo(infoPrevia || "");
    setDetalle("");
    setSolicitudExitosa(null);
    setModalAbierto(true);
  };

  const handleEnviarPedidoLanding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      alert("Por favor ingresa tu nombre y teléfono.");
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        type: "SELECTOR",
        customerName: nombre.trim(),
        customerPhone: telefono.trim(),
        vehicleInfo: vehiculoInfo.trim() || "Vehículo no especificado",
        itemsSummary: detalle.trim() || "Consulta desde buscador por placa",
        totalEstimated: 0,
      };

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al enviar el pedido");
      }

      setSolicitudExitosa(data.solicitud);
      setNombre("");
      setTelefono("");
      setVehiculoInfo("");
      setDetalle("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="w-full mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row select-none overflow-hidden">
      {/* Columna Izquierda: Perfil del Vehículo (Foto grande + Modelo y Año) */}
      <div className="w-full md:w-[38%] bg-zinc-50 dark:bg-zinc-900 p-6 sm:p-8 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              Tu Vehículo
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {vehiculoActivo
                ? "Perfil individual de tu vehículo."
                : "Consulta privada por número de placa."}
            </p>
          </div>
          {vehiculoActivo && (
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-black tracking-wider">
              {vehiculoActivo.plate}
            </span>
          )}
        </div>

        {/* Foto de perfil más grande */}
        <div className="aspect-[4/3] w-full rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/70 overflow-hidden relative flex items-center justify-center border border-zinc-200 dark:border-zinc-700/70 shadow-inner">
          {vehiculoActivo?.imageUrl ? (
            <img
              src={vehiculoActivo.imageUrl}
              alt={vehiculoActivo.vehicle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 flex flex-col items-center">
              <span className="text-6xl mb-3">🚗</span>
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                {vehiculoActivo ? vehiculoActivo.vehicle : "Sin vehículo cargado"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[220px]">
                {vehiculoActivo
                  ? "Este vehículo aún no tiene foto de perfil registrada."
                  : "Ingresa tu placa para ver la foto, modelo, año y estado."}
              </p>
            </div>
          )}

          {vehiculoActivo?.etapa && (
            <div className="absolute bottom-3 left-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold backdrop-blur-md shadow-sm ${ETAPA_ESTILO[vehiculoActivo.etapa].badge}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${ETAPA_ESTILO[vehiculoActivo.etapa].dot}`}
                />
                {vehiculoActivo.etapa}
              </span>
            </div>
          )}
        </div>

        {/* Datos principales del vehículo seleccionado */}
        {vehiculoActivo ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                Modelo y Año
              </p>
              <p className="text-lg font-black text-zinc-900 dark:text-white leading-snug">
                {vehiculoActivo.vehicle}
                {vehiculoActivo.year &&
                !vehiculoActivo.vehicle.includes(String(vehiculoActivo.year))
                  ? ` · ${vehiculoActivo.year}`
                  : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
              <div>
                <span className="text-zinc-400 block">Placa</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {vehiculoActivo.plate}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Año</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {vehiculoActivo.year || "No registrado"}
                </span>
              </div>
              {vehiculoActivo.color && (
                <div>
                  <span className="text-zinc-400 block">Color</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {vehiculoActivo.color}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-xs text-zinc-500 dark:text-zinc-400">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">
              Consulta 100% privada
            </p>
          </div>
        )}

        {/* Selector rápido si el mismo cliente tiene varios vehículos */}
        {vehiculosCliente.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Tus vehículos ({vehiculosCliente.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {vehiculosCliente.map((v) => {
                const activo = vehiculoActivo?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehiculoSeleccionadoId(v.id)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      activo
                        ? "border-cyan-500 bg-cyan-500/10 text-zinc-900 dark:text-white"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {v.vehicle}
                        {v.year && !v.vehicle.includes(String(v.year))
                          ? ` (${v.year})`
                          : ""}
                      </p>
                      <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                        {v.plate}
                      </p>
                    </div>
                    {v.etapa && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${ETAPA_ESTILO[v.etapa].badge}`}
                      >
                        {v.etapa}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() =>
            abrirModalPara(
              vehiculoActivo
                ? `${vehiculoActivo.vehicle} (${vehiculoActivo.plate})`
                : ""
            )
          }
          className="mt-auto w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-cyan-500/50 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
        >
          Solicitar cita o repuesto
        </button>
      </div>

      {/* Columna Derecha: Buscador por Placa y Estado Individual en Taller */}
      <div className="w-full md:w-[62%] p-6 sm:p-8 md:p-10 flex flex-col bg-white dark:bg-zinc-950">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-normal text-zinc-900 dark:text-white tracking-tight">
            Estado en Taller
          </h2>
        </div>

        {/* Formulario de búsqueda por placa */}
        <form
          onSubmit={handleSubmitPlaca}
          className="flex flex-col sm:flex-row gap-2.5 mb-6"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={placaInput}
              onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
              placeholder="Ej. ABC1234"
              aria-label="Número de placa"
              className="w-full pl-10 pr-4 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-base font-mono font-bold tracking-wider text-zinc-900 dark:text-white uppercase outline-none focus:border-cyan-500 transition-colors"
            />
            <svg
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            type="submit"
            disabled={cargando}
            className="h-12 px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-normal text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {cargando ? "Buscando..." : "Buscar placa"}
          </button>
          {hasSearched && (
            <button
              type="button"
              onClick={limpiarBusqueda}
              className="h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
            >
              Limpiar
            </button>
          )}
        </form>

        {errorBusqueda && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400">
            {errorBusqueda}
          </div>
        )}

        {/* Contenido principal: solo vehículos del cliente encontrado */}
        <div className="flex-grow flex flex-col gap-3">
          {!hasSearched ? (
            <div className="flex-grow min-h-[260px] rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl mb-3">
                🔎
              </div>
              <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                Busca tu vehículo por placa
              </h4>
            </div>
          ) : cargando ? (
            <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Consultando estado de tu vehículo...
            </div>
          ) : vehiculosCliente.length === 0 ? (
            <div className="py-14 px-6 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-2">
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                No encontramos vehículos con la placa{" "}
                <span className="font-mono text-cyan-600 dark:text-cyan-400">
                  {placaActiva}
                </span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                Verifica que esté bien escrita o solicita atención directamente
                con nuestro equipo.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[470px] overflow-y-auto pr-1">
              {vehiculosCliente.map((v) => {
                const seleccionado = vehiculoActivo?.id === v.id;
                const estOp = v.estadoOperativo
                  ? ESTADO_OPERATIVO_ESTILO[v.estadoOperativo]
                  : null;
                const ordenLimpia = v.orderNumber
                  ? v.orderNumber.replace(/^ot\s*#?\s*/i, "")
                  : null;

                return (
                  <div
                    key={v.id}
                    onClick={() => setVehiculoSeleccionadoId(v.id)}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-4 ${
                      seleccionado
                        ? "border-cyan-500/60 bg-cyan-500/[0.04] dark:bg-cyan-500/[0.06] shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    {/* Número de orden y estado operativo (Trabajando / En Pausa / En Espera) */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {ordenLimpia ? `Orden #${ordenLimpia}` : "Sin orden activa"}
                      </span>

                      {v.estadoOperativo && estOp && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-medium shrink-0 ${estOp.badge}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${estOp.dot}`} />
                          {v.estadoOperativo}
                        </span>
                      )}
                    </div>

                    {/* 4 botones de etapa como en Taller */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ETAPAS_ORDEN.map((step) => {
                        const activo = v.etapa === step;
                        const estStep = ETAPA_ESTILO[step];
                        return (
                          <div
                            key={step}
                            className={`h-10 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                              activo
                                ? `${estStep.badge} shadow-sm`
                                : "border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 text-zinc-400 dark:text-zinc-500"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                activo
                                  ? estStep.dot
                                  : "bg-zinc-300 dark:bg-zinc-700"
                              }`}
                            />
                            <span className="truncate">{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Flotante de Solicitud / Cita */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-lg">
                  🚗
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Solicitar Cita o Repuesto
                  </h3>
                  <span className="text-xs text-cyan-400">
                    Atención directa en taller
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {solicitudExitosa ? (
              <div className="py-8 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-3xl border border-cyan-500/30">
                  ✓
                </div>
                <h4 className="text-lg font-bold text-white">
                  ¡Solicitud Registrada con Éxito!
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Tu solicitud{" "}
                  <span className="font-mono font-bold text-cyan-300">
                    #{solicitudExitosa.requestNumber}
                  </span>{" "}
                  ha sido recibida por nuestro equipo.
                </p>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="mt-4 px-6 h-11 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarPedidoLanding} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">
                      WhatsApp / Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="0991234567"
                      className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">
                      Vehículo / Placa
                    </label>
                    <input
                      type="text"
                      value={vehiculoInfo}
                      onChange={(e) => setVehiculoInfo(e.target.value)}
                      placeholder="Ej. Toyota Hilux 2022"
                      className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">
                    Repuesto o Servicio Solicitado *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    placeholder="Detalla qué repuesto o trabajo necesitas..."
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 pb-2 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-4 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="px-6 h-11 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  >
                    {enviando ? "Enviando..." : "Enviar Solicitud"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
