"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

export interface GerenciaMetricsData {
  ventasTotales?: number;
  cobradoEnCaja?: number;
  montoHoy: number;
  ticketPromedio: number;
  autosEnPista?: number;
  autosEntregados?: number;
  gastosYRepuestos?: number;
  cuentasPorCobrar?: number;
  capitalActivo?: number;
  cobrado?: number;
  autosActivos?: number;
  pagadosTotal?: number;
  egresosTotal?: number;
  moraTotal?: number;
  carteraCreditoTotal?: number;
}

interface GerenciaExecutiveKpisProps {
  onDataLoaded?: (data: any) => void;
  className?: string;
  backHref?: string;
}

export function GerenciaExecutiveKpis({ onDataLoaded, className = "", backHref }: GerenciaExecutiveKpisProps) {
  const [periodo, setPeriodo] = useState<"este_mes" | "hoy" | "esta_semana" | "este_anio" | "todo">("este_mes");
  const [dateLabel, setDateLabel] = useState<string>("01 OCT 2026 — 31 OCT 2026");
  const [metrics, setMetrics] = useState<GerenciaMetricsData | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [menuFechaAbierto, setMenuFechaAbierto] = useState<boolean>(false);
  const menuFechaRef = useRef<HTMLDivElement>(null);

  const formatMoneda = (val: number = 0) => {
    return "$" + Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const cargarMetricas = useCallback(async (p: string) => {
    setCargando(true);
    try {
      const res = await fetch(`/api/gerencia/resumen?periodo=${p}`);
      const data = await res.json();
      if (data?.success && data?.metrics) {
        setMetrics(data.metrics);
        if (data.dateLabel) setDateLabel(data.dateLabel);
        onDataLoaded?.(data);
      }
    } catch (err) {
      console.error("Error al cargar métricas de gerencia:", err);
    } finally {
      setCargando(false);
    }
  }, [onDataLoaded]);

  useEffect(() => {
    cargarMetricas(periodo);
  }, [periodo, cargarMetricas]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuFechaRef.current && !menuFechaRef.current.contains(e.target as Node)) {
        setMenuFechaAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const opcionesPeriodo = [
    { id: "este_mes", label: "Este Mes (Mes Actual)" },
    { id: "hoy", label: "Hoy" },
    { id: "esta_semana", label: "Esta Semana" },
    { id: "este_anio", label: "Este Año" },
    { id: "todo", label: "Todo el Historial" },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* =====================================================================
          CABECERA EJECUTIVA: GERENCIA / CEO - DIRECCIÓN + FILTRO DE FECHA
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-2">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Volver"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/40 text-zinc-700 dark:text-zinc-200 shadow-sm transition-all flex items-center justify-center shrink-0 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0096c7] dark:text-[#38bdf8] flex items-center gap-2">
              <span>GERENCIA</span>
            </h1>
            <p className="text-[11px] sm:text-xs font-bold tracking-[0.2em] text-zinc-500 dark:text-zinc-400 uppercase">
              CEO — DIRECCIÓN
            </p>
          </div>
        </div>

        {/* Selector de Rango de Fecha Estilo Pill adaptativo */}
        <div className="relative self-start sm:self-auto" ref={menuFechaRef}>
          <button
            type="button"
            onClick={() => setMenuFechaAbierto(!menuFechaAbierto)}
            className="h-9 px-3.5 sm:px-4 rounded-full bg-white hover:bg-zinc-50 dark:bg-[#0d141e] dark:hover:bg-[#131d2c] border border-zinc-200 dark:border-[#1b283b] text-xs font-semibold text-zinc-700 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white flex items-center gap-2.5 transition-all shadow-sm cursor-pointer active:scale-95"
          >
            {/* Icono de Calendario */}
            <svg
              className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="font-mono tracking-wider text-[11px] sm:text-xs">
              {dateLabel}
            </span>
            <svg
              className={`w-3 h-3 text-zinc-400 transition-transform ${
                menuFechaAbierto ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Menú Flotante de Opciones de Fecha */}
          {menuFechaAbierto && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-[#0d141e]/95 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl p-1.5 z-50 animate-fade-in space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-white/5">
                Seleccionar Periodo
              </div>
              {opcionesPeriodo.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPeriodo(opt.id as any);
                    setMenuFechaAbierto(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    periodo === opt.id
                      ? "bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white"
                  }`}
                >
                  <span>{opt.label}</span>
                  {periodo === opt.id && <span className="text-cyan-600 dark:text-cyan-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          GRID DE 8 TARJETAS EJECUTIVAS (4 COLUMNAS X 2 FILAS)
          Diseño adaptativo: Modo Claro premium / Modo Oscuro Obsidian
          ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* TARJETA 1: VENTAS TOTALES (FACTURACIÓN TALLER + LUBRICENTRO + TIENDA) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b0f15] border border-zinc-200/90 dark:border-[#172231] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-zinc-300 dark:hover:border-[#223349] hover:shadow-md">
          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
              VENTAS TOTALES
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.ventasTotales ?? metrics?.capitalActivo ?? 0)}
            </p>
          </div>
        </div>

        {/* TARJETA 2: COBRADO EN CAJA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b0f15] border border-zinc-200/90 dark:border-[#172231] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-zinc-300 dark:hover:border-[#223349] hover:shadow-md">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
              COBRADO EN CAJA
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.cobradoEnCaja ?? metrics?.cobrado ?? 0)}
            </p>
          </div>
        </div>

        {/* TARJETA 3: $ HOY (DESTACADA EN CYAN) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-50/80 via-white to-sky-50/60 dark:bg-[#091523] border border-cyan-500/60 dark:border-cyan-500/50 shadow-md shadow-cyan-500/10 dark:shadow-cyan-950/40 ring-1 ring-cyan-500/30 dark:ring-cyan-500/30 flex flex-col justify-between space-y-3 transition-all hover:border-cyan-500">
          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
            <span className="text-xs font-black">$</span>
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase">
              VENTAS HOY
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.montoHoy || 0)}
            </p>
          </div>
        </div>

        {/* TARJETA 4: TICKET PROMEDIO POR AUTO */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b0f15] border border-zinc-200/90 dark:border-[#172231] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-zinc-300 dark:hover:border-[#223349] hover:shadow-md">
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-cyan-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
              TICKET PROMEDIO
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.ticketPromedio || 0)}
            </p>
          </div>
        </div>

        {/* TARJETA 5: AUTOS EN PISTA (BAHÍAS / TALLER / LUBRICENTRO) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b0f15] border border-zinc-200/90 dark:border-[#172231] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-zinc-300 dark:hover:border-[#223349] hover:shadow-md">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9L2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
              AUTOS EN PISTA
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight truncate">
              {cargando ? "..." : (metrics?.autosEnPista ?? metrics?.autosActivos ?? 0)}
            </p>
          </div>
        </div>

        {/* TARJETA 6: AUTOS ENTREGADOS / SERVICIOS COMPLETADOS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b0f15] border border-zinc-200/90 dark:border-[#172231] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-zinc-300 dark:hover:border-[#223349] hover:shadow-md">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
              AUTOS ENTREGADOS
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight truncate">
              {cargando ? "..." : (metrics?.autosEntregados ?? metrics?.pagadosTotal ?? 0)}
            </p>
          </div>
        </div>

        {/* TARJETA 7: GASTOS Y REPUESTOS (EGRESOS OPERATIVOS) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b0f15] border border-zinc-200/90 dark:border-[#172231] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-zinc-300 dark:hover:border-[#223349] hover:shadow-md">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
              GASTOS Y REPUESTOS
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.gastosYRepuestos ?? metrics?.egresosTotal ?? 0)}
            </p>
          </div>
        </div>

        {/* TARJETA 8: CUENTAS POR COBRAR (CRÉDITOS PENDIENTES DE CLIENTES) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0b0f15] border border-zinc-200/90 dark:border-[#172231] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-sm flex flex-col justify-between space-y-3 transition-all hover:border-rose-200 dark:hover:border-[#223349] hover:shadow-md">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-500">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
              CUENTAS POR COBRAR
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-rose-600 dark:text-rose-500 font-mono tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.cuentasPorCobrar ?? metrics?.moraTotal ?? 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
