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

export function GerenciaExecutiveKpis({ onDataLoaded, className = "", backHref = "/acceso" }: GerenciaExecutiveKpisProps) {
  const [dateLabel, setDateLabel] = useState<string>("01 NOV 2026 — 30 NOV 2026");
  const [metrics, setMetrics] = useState<GerenciaMetricsData | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [menuFechaAbierto, setMenuFechaAbierto] = useState<boolean>(false);
  const [presetActivo, setPresetActivo] = useState<string | null>("MES");
  const menuFechaRef = useRef<HTMLDivElement>(null);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("Ambas");
  const [menuSucursalAbierto, setMenuSucursalAbierto] = useState<boolean>(false);
  const [sucursales, setSucursales] = useState<string[]>([
    "Principal",
    "Sucursal",
    "Ambas",
  ]);
  const menuSucursalRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("currentUser");
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed?.name) setUserName(parsed.name);
        }
      } catch {}
    }
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.user?.name) {
          setUserName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/gerencia/configuracion")
      .then((res) => res.json())
      .then((data) => {
        if (data?.branches && Array.isArray(data.branches) && data.branches.length > 0) {
          setSucursales(["Principal", "Sucursal", "Ambas"]);
        }
      })
      .catch(() => {});
  }, []);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const formatYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  // Fechas seleccionadas (DESDE / HASTA)
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const d = new Date();
    return formatYmd(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [fechaHasta, setFechaHasta] = useState<string>(() => {
    const d = new Date();
    return formatYmd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  });

  const formatMoneda = (val: number = 0) => {
    return "$" + Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const cargarMetricas = useCallback(async (p: string, fDesde?: string, fHasta?: string, branch?: string) => {
    setCargando(true);
    try {
      let url = `/api/gerencia/resumen?periodo=${p}`;
      if (fDesde && fHasta) {
        url += `&desde=${fDesde}&hasta=${fHasta}`;
      }
      const b = branch !== undefined ? branch : sucursalSeleccionada;
      if (b && b !== "Ambas") {
        url += `&sucursal=${encodeURIComponent(b)}`;
      }
      const res = await fetch(url);
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
  }, [onDataLoaded, sucursalSeleccionada]);

  // Carga inicial
  useEffect(() => {
    cargarMetricas("personalizado", fechaDesde, fechaHasta, "Ambas");
  }, []);

  // Presets rápidos: HOY, SEMANA, QUINCENA, MES
  const seleccionarPreset = (preset: "HOY" | "SEMANA" | "QUINCENA" | "MES") => {
    setPresetActivo(preset);
    const now = new Date();
    if (preset === "HOY") {
      const hoyStr = formatYmd(now);
      setFechaDesde(hoyStr);
      setFechaHasta(hoyStr);
    } else if (preset === "SEMANA") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
      setFechaDesde(formatYmd(monday));
      setFechaHasta(formatYmd(sunday));
    } else if (preset === "QUINCENA") {
      const day = now.getDate();
      if (day <= 15) {
        setFechaDesde(formatYmd(new Date(now.getFullYear(), now.getMonth(), 1)));
        setFechaHasta(formatYmd(new Date(now.getFullYear(), now.getMonth(), 15)));
      } else {
        setFechaDesde(formatYmd(new Date(now.getFullYear(), now.getMonth(), 16)));
        setFechaHasta(formatYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
      }
    } else if (preset === "MES") {
      setFechaDesde(formatYmd(new Date(now.getFullYear(), now.getMonth(), 1)));
      setFechaHasta(formatYmd(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    }
  };

  const aplicarFiltro = () => {
    if (!fechaDesde || !fechaHasta) return;
    setMenuFechaAbierto(false);
    cargarMetricas("personalizado", fechaDesde, fechaHasta, sucursalSeleccionada);
  };

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuFechaRef.current && !menuFechaRef.current.contains(e.target as Node)) {
        setMenuFechaAbierto(false);
      }
      if (menuSucursalRef.current && !menuSucursalRef.current.contains(e.target as Node)) {
        setMenuSucursalAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* =====================================================================
          CABECERA EJECUTIVA: GERENCIA / CEO - DIRECCIÓN + FILTRO DE FECHA
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Volver al Selector de Paneles"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-all flex items-center justify-center shrink-0 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0096c7] dark:text-[#38bdf8] flex items-center gap-2">
              <span>GERENCIA</span>
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase flex items-center gap-1.5 flex-wrap">
              <span>CEO — DIRECCIÓN</span>
              {userName && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-600 font-bold">•</span>
                  <span className="text-[#0096c7] dark:text-[#38bdf8] font-bold tracking-normal">
                    {userName.toLowerCase().includes("administrador") ? "Admin" : userName.trim().split(/\s+/)[0]}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Selectores: Sucursal y Fecha */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap self-start sm:self-auto">
          {/* Selector de Sucursal */}
          <div className="relative" ref={menuSucursalRef}>
            <button
              type="button"
              onClick={() => {
                setMenuSucursalAbierto(!menuSucursalAbierto);
                setMenuFechaAbierto(false);
              }}
              className="h-10 px-4 rounded-xl bg-white hover:bg-zinc-50 dark:bg-[#0a0f16] dark:hover:bg-[#111722] border border-zinc-200/80 dark:border-zinc-800 text-xs font-normal text-zinc-700 dark:text-zinc-200 flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <span className="text-sm">🏪</span>
              <span className="font-normal text-xs tracking-normal text-zinc-700 dark:text-zinc-200">
                {sucursalSeleccionada}
              </span>
              <svg
                className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Menú desplegable de Sucursales */}
            {menuSucursalAbierto && (
              <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-56 rounded-2xl bg-white dark:bg-[#0b0f17] border border-zinc-200 dark:border-zinc-800/90 shadow-2xl p-2 z-50 animate-fade-in space-y-1">
                {sucursales.map((suc) => (
                  <button
                    key={suc}
                    type="button"
                    onClick={() => {
                      setSucursalSeleccionada(suc);
                      setMenuSucursalAbierto(false);
                      cargarMetricas("personalizado", fechaDesde, fechaHasta, suc);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-normal transition-colors flex items-center justify-between ${
                      sucursalSeleccionada === suc
                        ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 font-medium"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="truncate">{suc}</span>
                    {sucursalSeleccionada === suc && (
                      <span className="text-cyan-500 font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selector de Rango de Fecha */}
          <div className="relative" ref={menuFechaRef}>
            <button
              type="button"
              onClick={() => {
                setMenuFechaAbierto(!menuFechaAbierto);
                setMenuSucursalAbierto(false);
              }}
              className="h-10 px-4 rounded-xl bg-white hover:bg-zinc-50 dark:bg-[#0a0f16] dark:hover:bg-[#111722] border border-zinc-200/80 dark:border-zinc-800 text-xs font-normal text-zinc-700 dark:text-zinc-200 flex items-center gap-2.5 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <svg
                className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0"
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
              <span className="font-normal text-xs tracking-normal text-zinc-700 dark:text-zinc-200">
                {dateLabel}
              </span>
              <svg
                className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

          {/* Menú Flotante Modal: Selector de Fechas */}
          {menuFechaAbierto && (
            <div className="absolute right-0 mt-2 w-[320px] sm:w-[360px] rounded-2xl bg-white dark:bg-[#0b0f17] border border-zinc-200 dark:border-zinc-800/90 shadow-2xl p-5 sm:p-6 z-50 animate-fade-in space-y-4">
              {/* Fila DESDE y HASTA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase block mb-1.5">
                    DESDE
                  </label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => {
                      setFechaDesde(e.target.value);
                      setPresetActivo(null);
                    }}
                    className="w-full h-11 sm:h-12 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white dark:bg-[#111722] dark:hover:bg-[#161e2c] border border-zinc-200 dark:border-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-cyan-500 text-zinc-900 dark:text-white font-medium text-xs sm:text-sm px-3 text-center [color-scheme:light] dark:[color-scheme:dark] outline-none transition-all cursor-pointer shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase block mb-1.5">
                    HASTA
                  </label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => {
                      setFechaHasta(e.target.value);
                      setPresetActivo(null);
                    }}
                    className="w-full h-11 sm:h-12 rounded-xl bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white dark:bg-[#111722] dark:hover:bg-[#161e2c] border border-zinc-200 dark:border-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-cyan-500 text-zinc-900 dark:text-white font-medium text-xs sm:text-sm px-3 text-center [color-scheme:light] dark:[color-scheme:dark] outline-none transition-all cursor-pointer shadow-sm"
                  />
                </div>
              </div>

              {/* Grid 2x2: HOY | SEMANA / QUINCENA | MES */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => seleccionarPreset("HOY")}
                  className={`h-10 sm:h-11 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center ${
                    presetActivo === "HOY"
                      ? "bg-cyan-50 dark:bg-[#0e2238] border-2 border-cyan-500 text-cyan-700 dark:text-cyan-400 shadow-sm shadow-cyan-500/10 dark:shadow-cyan-950/60"
                      : "bg-zinc-50 hover:bg-zinc-100 dark:bg-[#111722] dark:hover:bg-[#161e2c] border border-zinc-200 dark:border-zinc-800/90 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  HOY
                </button>
                <button
                  type="button"
                  onClick={() => seleccionarPreset("SEMANA")}
                  className={`h-10 sm:h-11 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center ${
                    presetActivo === "SEMANA"
                      ? "bg-cyan-50 dark:bg-[#0e2238] border-2 border-cyan-500 text-cyan-700 dark:text-cyan-400 shadow-sm shadow-cyan-500/10 dark:shadow-cyan-950/60"
                      : "bg-zinc-50 hover:bg-zinc-100 dark:bg-[#111722] dark:hover:bg-[#161e2c] border border-zinc-200 dark:border-zinc-800/90 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  SEMANA
                </button>
                <button
                  type="button"
                  onClick={() => seleccionarPreset("QUINCENA")}
                  className={`h-10 sm:h-11 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center ${
                    presetActivo === "QUINCENA"
                      ? "bg-cyan-50 dark:bg-[#0e2238] border-2 border-cyan-500 text-cyan-700 dark:text-cyan-400 shadow-sm shadow-cyan-500/10 dark:shadow-cyan-950/60"
                      : "bg-zinc-50 hover:bg-zinc-100 dark:bg-[#111722] dark:hover:bg-[#161e2c] border border-zinc-200 dark:border-zinc-800/90 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  QUINCENA
                </button>
                <button
                  type="button"
                  onClick={() => seleccionarPreset("MES")}
                  className={`h-10 sm:h-11 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center ${
                    presetActivo === "MES"
                      ? "bg-cyan-50 dark:bg-[#0e2238] border-2 border-cyan-500 text-cyan-700 dark:text-cyan-400 shadow-sm shadow-cyan-500/10 dark:shadow-cyan-950/60"
                      : "bg-zinc-50 hover:bg-zinc-100 dark:bg-[#111722] dark:hover:bg-[#161e2c] border border-zinc-200 dark:border-zinc-800/90 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  MES
                </button>
              </div>

              {/* Botón inferior: Aplicar */}
              <button
                type="button"
                onClick={aplicarFiltro}
                className="w-full h-11 sm:h-12 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20 active:scale-[0.99] cursor-pointer dark:bg-[#091b2c] dark:hover:bg-[#0c243d] dark:border dark:border-cyan-500/80 dark:text-cyan-400 dark:shadow-cyan-950/40"
              >
                <svg className="w-4 h-4 text-white dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                </svg>
                <span>Aplicar</span>
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* =====================================================================
          GRID DE 8 TARJETAS EJECUTIVAS (4 COLUMNAS X 2 FILAS)
          Títulos de una sola palabra, sin textos inferiores, diseño estándar.
          ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* TARJETA 1: VENTAS */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider truncate">
              Ventas
            </span>
          </div>
          <div className="relative z-10 pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.ventasTotales ?? metrics?.capitalActivo ?? 0)}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500 opacity-[0.03] dark:opacity-[0.05] rounded-bl-full pointer-events-none" />
        </div>

        {/* TARJETA 2: COBRADO */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2.5" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider truncate">
              Cobrado
            </span>
          </div>
          <div className="relative z-10 pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.cobradoEnCaja ?? metrics?.cobrado ?? 0)}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-[0.03] dark:opacity-[0.05] rounded-bl-full pointer-events-none" />
        </div>

        {/* TARJETA 3: HOY */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <span className="font-bold text-sm">$</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider truncate">
              Hoy
            </span>
          </div>
          <div className="relative z-10 pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.montoHoy || 0)}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500 opacity-[0.03] dark:opacity-[0.05] rounded-bl-full pointer-events-none" />
        </div>

        {/* TARJETA 4: TICKET */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider truncate">
              Ticket
            </span>
          </div>
          <div className="relative z-10 pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.ticketPromedio || 0)}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500 opacity-[0.03] dark:opacity-[0.05] rounded-bl-full pointer-events-none" />
        </div>

        {/* TARJETA 5: PISTA */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9L2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider truncate">
              Pista
            </span>
          </div>
          <div className="relative z-10 pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight truncate">
              {cargando ? "..." : (metrics?.autosEnPista ?? metrics?.autosActivos ?? 0)}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-[0.03] dark:opacity-[0.05] rounded-bl-full pointer-events-none" />
        </div>

        {/* TARJETA 6: ENTREGADOS */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider truncate">
              Entregados
            </span>
          </div>
          <div className="relative z-10 pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight truncate">
              {cargando ? "..." : (metrics?.autosEntregados ?? metrics?.pagadosTotal ?? 0)}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500 opacity-[0.03] dark:opacity-[0.05] rounded-bl-full pointer-events-none" />
        </div>

        {/* TARJETA 7: GASTOS */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider truncate">
              Gastos
            </span>
          </div>
          <div className="relative z-10 pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.gastosYRepuestos ?? metrics?.egresosTotal ?? 0)}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500 opacity-[0.03] dark:opacity-[0.05] rounded-bl-full pointer-events-none" />
        </div>

        {/* TARJETA 8: COBRAR */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between space-y-2">
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider truncate">
              Cobrar
            </span>
          </div>
          <div className="relative z-10 pt-1">
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight truncate">
              {cargando ? "..." : formatMoneda(metrics?.cuentasPorCobrar ?? metrics?.moraTotal ?? 0)}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500 opacity-[0.03] dark:opacity-[0.05] rounded-bl-full pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
