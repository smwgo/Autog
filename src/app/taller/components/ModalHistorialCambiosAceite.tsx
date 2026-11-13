"use client";

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";

export interface ItemHistorialCambioAceite {
  id: string;
  orderNumber: string;
  fecha: string;
  fechaMs: number;
  kilometraje: number;
  kilometrosDiferencia?: number | null;
  mecanico: string;
  cliente: string;
  placa: string;
  vehiculo: string;
  aceite?: {
    nombre: string;
    marca?: string;
    viscosidad?: string;
    presentacion?: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    product?: any;
    item?: any;
  } | null;
  filtro?: {
    nombre: string;
    marca?: string;
    presentacion?: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    product?: any;
    item?: any;
  } | null;
  otrosFluidos?: Array<{
    nombre: string;
    cantidad: number;
    precio: number;
  }>;
  serviciosTexto?: string[];
  notas?: string;
  costoTotal?: number;
  productosARepetir: Array<{ item: any; product: any }>;
}

export interface ModalHistorialCambiosAceiteProps {
  isOpen: boolean;
  onClose: () => void;
  clienteNombre?: string;
  placaVehiculo?: string;
  descripcionVehiculo?: string;
  kmActual: number;
  kmProximo: number;
  cambios: ItemHistorialCambioAceite[];
  cargando?: boolean;
  repitiendoCambio?: boolean;
  onAplicarCambio: (productos: Array<{ item: any; product: any }>) => void;
  onBuscarOtraPlaca?: (placa: string) => void;
}

export default function ModalHistorialCambiosAceite({
  isOpen,
  onClose,
  clienteNombre = "Cliente",
  placaVehiculo = "",
  descripcionVehiculo = "",
  kmActual,
  kmProximo,
  cambios,
  cargando = false,
  repitiendoCambio = false,
  onAplicarCambio,
  onBuscarOtraPlaca,
}: ModalHistorialCambiosAceiteProps) {
  const [filtroTexto, setFiltroTexto] = useState("");
  const [inputPlacaBusqueda, setInputPlacaBusqueda] = useState(placaVehiculo);

  // Filtrado interno por texto (marca, viscosidad, fecha, etc.)
  const cambiosFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return cambios;
    const q = filtroTexto.toLowerCase().trim();
    return cambios.filter((c) => {
      const matchFecha = c.fecha?.toLowerCase().includes(q);
      const matchAceite =
        c.aceite?.nombre?.toLowerCase().includes(q) ||
        c.aceite?.marca?.toLowerCase().includes(q) ||
        c.aceite?.viscosidad?.toLowerCase().includes(q);
      const matchFiltro =
        c.filtro?.nombre?.toLowerCase().includes(q) ||
        c.filtro?.marca?.toLowerCase().includes(q);
      const matchMecanico = c.mecanico?.toLowerCase().includes(q);
      const matchOrden = c.orderNumber?.toLowerCase().includes(q);
      const matchNotas = c.notas?.toLowerCase().includes(q);
      return (
        matchFecha ||
        matchAceite ||
        matchFiltro ||
        matchMecanico ||
        matchOrden ||
        matchNotas
      );
    });
  }, [cambios, filtroTexto]);

  // Resumen / Métricas del historial
  const metricas = useMemo(() => {
    const totalCambios = cambios.length;
    const ultimo = cambios[0] || null;
    const kmUltimo = ultimo ? ultimo.kilometraje : 0;
    const kmDiferencia =
      kmActual > 0 && kmUltimo > 0 ? kmActual - kmUltimo : null;

    // Frecuencia de marcas / viscosidades
    const conteoViscosidades: Record<string, number> = {};
    for (const c of cambios) {
      const v = c.aceite?.viscosidad;
      if (v) conteoViscosidades[v] = (conteoViscosidades[v] || 0) + 1;
    }
    const viscosidadFrecuente =
      Object.entries(conteoViscosidades).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      totalCambios,
      ultimoCambio: ultimo,
      kmDiferencia,
      viscosidadFrecuente,
    };
  }, [cambios, kmActual]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const urlHistorialCompleto = `/taller/historial?busqueda=${encodeURIComponent(
    placaVehiculo || clienteNombre || ""
  )}`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
      >
        {/* =====================================================================
            CABECERA PRINCIPAL DEL MODAL
            ===================================================================== */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/10 flex items-start justify-between gap-3 bg-zinc-50/80 dark:bg-white/[0.02]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl">🛢️</span>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                Historial de aceites
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                {cambios.length} {cambios.length === 1 ? "cambio" : "cambios"}
              </span>
            </div>

            {/* Subtítulo con Cliente y Vehículo */}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold text-zinc-900 dark:text-white">
                👤 {clienteNombre || "Cliente Mostrador"}
              </span>
              <span>•</span>
              <span>🚗 {descripcionVehiculo || "Vehículo sin registrar"}</span>
              {placaVehiculo && (
                <>
                  <span>•</span>
                  <span className="font-mono font-bold uppercase bg-zinc-200/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded">
                    {placaVehiculo}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={urlHistorialCompleto}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs"
              title="Abrir el historial general del taller en otra pestaña"
            >
              <span>Abrir en otra pestaña</span>
              <span className="text-sm">↗</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              title="Cerrar ventana"
            >
              ✕
            </button>
          </div>
        </div>

        {/* =====================================================================
            BARRA DE MÉTRICAS RÁPIDAS
            ===================================================================== */}
        <div className="p-3.5 sm:p-4 bg-zinc-50 dark:bg-black/20 border-b border-zinc-200 dark:border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Km Actual
            </span>
            <span className="text-base sm:text-lg font-bold font-sans text-zinc-900 dark:text-white mt-0.5 block">
              {kmActual.toLocaleString()} km
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Próx. Cambio
            </span>
            <span className="text-base sm:text-lg font-bold font-sans text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {kmProximo.toLocaleString()} km
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Último
            </span>
            <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block truncate">
              {metricas.ultimoCambio ? metricas.ultimoCambio.fecha : "-"}
            </span>
            {metricas.kmDiferencia !== null && metricas.kmDiferencia > 0 && (
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                +{metricas.kmDiferencia.toLocaleString()} km
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Viscosidad
            </span>
            <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 block truncate">
              {metricas.viscosidadFrecuente || "-"}
            </span>
          </div>
        </div>

        {/* =====================================================================
            BARRA DE BÚSQUEDA Y FILTRADO
            ===================================================================== */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Filtrar por aceite, marca, viscosidad, fecha o mecánico..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filtroTexto && (
              <button
                type="button"
                onClick={() => setFiltroTexto("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* Búsqueda por otra placa si desea consultar otro auto */}
          {onBuscarOtraPlaca && (
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="text"
                value={inputPlacaBusqueda}
                onChange={(e) => setInputPlacaBusqueda(e.target.value.toUpperCase())}
                placeholder="Consultar otra placa..."
                className="w-36 px-2.5 py-1.5 text-xs font-mono font-bold uppercase bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => onBuscarOtraPlaca(inputPlacaBusqueda)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Buscar
              </button>
            </div>
          )}
        </div>

        {/* =====================================================================
            CUERPO: LISTA DE HISTORIAL DE CAMBIOS DE ACEITE
            ===================================================================== */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
          {cargando ? (
            <div className="py-16 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Consultando historial de cambios de aceite...</p>
            </div>
          ) : cambiosFiltrados.length === 0 ? (
            <div className="py-12 sm:py-16 text-center space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-400 flex items-center justify-center text-2xl mx-auto">
                🛢️
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200">
                {filtroTexto
                  ? "No se encontraron cambios con ese filtro"
                  : "No hay cambios de aceite registrados para este vehículo"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                {filtroTexto
                  ? "Intenta con otro término de búsqueda o limpia el filtro."
                  : `No se registran órdenes previas de cambio de aceite para la placa ${placaVehiculo || "indicada"
                  }. Puedes seleccionar un aceite directamente desde el catálogo.`}
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <a
                  href={urlHistorialCompleto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <span>Ver Historial General del Taller</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ) : (
            cambiosFiltrados.map((cambio, index) => {
              const tieneProductos = cambio.productosARepetir.length > 0;
              const esElMasReciente = index === 0;

              return (
                <div
                  key={cambio.id || `cambio_${index}`}
                  className={`p-4 rounded-2xl border transition-all ${esElMasReciente
                      ? "bg-blue-50/40 dark:bg-blue-500/[0.04] border-blue-200 dark:border-blue-500/25 shadow-xs"
                      : "bg-white dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 shadow-2xs"
                    }`}
                >
                  {/* Encabezado del registro histórico */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200/70 dark:border-white/5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-normal text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span>📅</span>
                        <span>{cambio.fecha}</span>
                      </span>

                      {esElMasReciente && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-400/30">
                          Último
                        </span>
                      )}
                    </div>

                    {/* Kilometraje registrado en ese cambio */}
                    <div className="flex items-center gap-2 text-xs">
                      {cambio.kilometraje > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-white/10 font-normal font-sans text-zinc-800 dark:text-zinc-200">
                          {cambio.kilometraje.toLocaleString()} km
                        </span>
                      )}

                      {cambio.kilometrosDiferencia !== null &&
                        cambio.kilometrosDiferencia !== undefined &&
                        cambio.kilometrosDiferencia > 0 && (
                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            (+{cambio.kilometrosDiferencia.toLocaleString()} km)
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Detalle de Aceite y Filtro */}
                  <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Aceite de Motor */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-200/70 dark:border-white/5 flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">🛢️</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="text-[10px] font-normal uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Aceite
                          </span>
                          {cambio.aceite?.viscosidad && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-normal text-[10px]">
                              {cambio.aceite.viscosidad}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-white truncate mt-0.5">
                          {cambio.aceite?.nombre || "Aceite estándar"}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>
                            {cambio.aceite?.marca ? `Marca: ${cambio.aceite.marca}` : ""}
                            {cambio.aceite?.presentacion ? ` • ${cambio.aceite.presentacion}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Filtro de Aceite */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-black/30 border border-zinc-200/70 dark:border-white/5 flex items-start gap-2.5">
                      <span className="text-xl shrink-0 mt-0.5">⚙️</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="text-[10px] font-normal uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Filtro
                          </span>
                          <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                            ✓ OK
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-white truncate mt-0.5">
                          {cambio.filtro?.nombre || "Filtro de Aceite"}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>
                            {cambio.filtro?.marca ? `Marca: ${cambio.filtro.marca}` : "Filtro"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Servicios adicionales o fluidos revisados */}
                  {((cambio.otrosFluidos && cambio.otrosFluidos.length > 0) ||
                    (cambio.serviciosTexto && cambio.serviciosTexto.length > 0)) && (
                      <div className="pt-1 pb-2 flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium">
                          Otros:
                        </span>
                        {cambio.otrosFluidos?.map((f, i) => (
                          <span
                            key={`f_${i}`}
                            className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 font-medium"
                          >
                            {f.nombre}
                          </span>
                        ))}
                        {cambio.serviciosTexto?.map((s, i) => (
                          <span
                            key={`s_${i}`}
                            className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Pie de la tarjeta con Mecánico y Botón de Repetir Cambio */}
                  <div className="pt-2.5 border-t border-zinc-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>Técnico: <span className="text-zinc-700 dark:text-zinc-200 font-normal">{cambio.mecanico || "Técnico"}</span></span>
                    </div>

                    {tieneProductos && (
                      <button
                        type="button"
                        disabled={repitiendoCambio}
                        onClick={() => onAplicarCambio(cambio.productosARepetir)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        <span>🔄</span>
                        <span>Repetir este cambio</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* =====================================================================
            PIE DE PÁGINA DEL MODAL
            ===================================================================== */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.02] flex items-center justify-between gap-2">
          <a
            href={urlHistorialCompleto}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Abrir en otra pestaña ↗
          </a>

          <div className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">
            Mostrando {cambiosFiltrados.length} de {cambios.length} cambios de aceite registrados
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-800 dark:text-white text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
