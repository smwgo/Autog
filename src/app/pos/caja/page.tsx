"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { getClientUserBranch, getClientActiveBranch } from "@/lib/branch";
import { Paginacion, paginarLista } from "@/components/Paginacion";

interface CashSession {
  id: string;
  sessionNumber: string;
  status: "ABIERTA" | "CERRADA" | string;
  cashier?: string;
  initialCash: number | string;
  declaredCash?: number | string | null;
  expectedCash?: number | string | null;
  differenceCash?: number | string | null;
  totalSalesCash?: number | string | null;
  totalExpenses?: number | string | null;
  notes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  movements?: any[];
}

const toMonto = (val: any): string => {
  if (val === null || val === undefined || val === "") return "0.00";
  const num = typeof val === "number" ? val : parseFloat(val.toString());
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

const toNumero = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;
  const num = typeof val === "number" ? val : parseFloat(val.toString());
  return isNaN(num) ? 0 : num;
};

export default function GestionCaja() {
  const [sesiones, setSesiones] = useState<CashSession[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtro, setFiltro] = useState<"todas" | "abiertas" | "cerradas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [dropdownFiltroAbierto, setDropdownFiltroAbierto] = useState(false);
  const [mostrarMetricasMovil, setMostrarMetricasMovil] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Métricas
  const [stats, setStats] = useState({
    totalSesiones: 0,
    abiertas: 0,
    cerradas: 0,
    fondoTotal: 0,
    ventasTotal: 0,
  });

  // Modales
  // 1. Cierre / Arqueo
  const [sesionParaCerrar, setSesionParaCerrar] = useState<CashSession | null>(null);
  const [conteoEfectivo, setConteoEfectivo] = useState("");
  const [conteoNotas, setConteoNotas] = useState("");
  const [cerrandoCaja, setCerrandoCaja] = useState(false);

  // 2. Fondo / Apertura
  const [mostrarModalFondo, setMostrarModalFondo] = useState(false);
  const [montoFondo, setMontoFondo] = useState("");
  const [guardandoFondo, setGuardandoFondo] = useState(false);

  // 3. Movimiento (Gasto / Ingreso)
  const [mostrarModalMovimiento, setMostrarModalMovimiento] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<"GASTO" | "INGRESO">("GASTO");
  const [montoMovimiento, setMontoMovimiento] = useState("");
  const [conceptoMovimiento, setConceptoMovimiento] = useState("");
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);

  // 4. Detalle / Arqueo de sesión cerrada
  const [sesionDetalle, setSesionDetalle] = useState<CashSession | null>(null);

  // 5. Modal y acción para confirmar eliminación de sesión
  const [sesionParaEliminar, setSesionParaEliminar] = useState<CashSession | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const handleConfirmarEliminacion = async () => {
    if (!sesionParaEliminar) return;

    setEliminando(true);
    try {
      const res = await fetch(`/api/caja?id=${encodeURIComponent(sesionParaEliminar.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo eliminar la sesión");
      }
      setSesionParaEliminar(null);
      await cargarCaja();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setEliminando(false);
    }
  };

  // Cargar datos desde Neon
  const cargarCaja = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const activeBr = getClientActiveBranch();
      const uBr = getClientUserBranch();
      const params = new URLSearchParams();
      params.set("sede", activeBr);
      params.set("userBranch", uBr);
      const res = await fetch(`/api/caja?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al cargar caja");
      }

      setSesiones(json.sessions || []);
      if (json.stats) {
        setStats(json.stats);
      }
    } catch (err: any) {
      console.error("Error al cargar datos de caja:", err);
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCaja();
  }, [cargarCaja]);

  useEffect(() => {
    const handleBranch = () => {
      cargarCaja();
    };
    window.addEventListener("autog-branch-change", handleBranch);
    return () => window.removeEventListener("autog-branch-change", handleBranch);
  }, [cargarCaja]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownFiltroAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtrado de sesiones en memoria
  const sesionesFiltradas = sesiones.filter((s) => {
    const q = busqueda.trim().toLowerCase();
    const matchBusqueda =
      !q ||
      s.sessionNumber.toLowerCase().includes(q) ||
      new Date(s.openedAt).toLocaleDateString("es-EC").includes(q);

    if (!matchBusqueda) return false;
    if (filtro === "abiertas") return s.status === "ABIERTA";
    if (filtro === "cerradas") return s.status === "CERRADA";
    return true;
  });

  const [paginaActual, setPaginaActual] = useState(1);
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtro]);

  const { itemsPaginados: sesionesPaginadas, paginaValida } = paginarLista(
    sesionesFiltradas,
    paginaActual
  );

  // Atajos de incremento para conteo físico en cierre
  const agregarEfectivo = (suma: number) => {
    const actual = parseFloat(conteoEfectivo) || 0;
    setConteoEfectivo((actual + suma).toFixed(2));
  };

  // Guardar Apertura de Nueva Caja
  const handleGuardarFondo = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoFondo);
    if (isNaN(monto) || monto < 0) {
      alert("Monto inválido");
      return;
    }

    setGuardandoFondo(true);
    try {
      const activeBr = getClientActiveBranch();
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_INITIAL",
          initialCash: monto,
          branch: activeBr,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al abrir caja");
      }

      setMontoFondo("");
      setMostrarModalFondo(false);
      await cargarCaja();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoFondo(false);
    }
  };

  // Guardar Gasto o Ingreso
  const handleGuardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoMovimiento);
    if (!monto || monto <= 0) {
      alert("Monto inválido");
      return;
    }

    setGuardandoMovimiento(true);
    try {
      const activeBr = getClientActiveBranch();
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tipoMovimiento,
          amount: monto,
          concept: conceptoMovimiento,
          branch: activeBr,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al registrar movimiento");
      }

      setMontoMovimiento("");
      setConceptoMovimiento("");
      setMostrarModalMovimiento(false);
      await cargarCaja();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  // Procesar Cierre de Caja
  const handleConfirmarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesionParaCerrar) return;

    const contado = parseFloat(conteoEfectivo) || 0;
    const esperado = toNumero(sesionParaCerrar.expectedCash) || (toNumero(sesionParaCerrar.initialCash) + (stats.ventasTotal || 0));
    const diferencia = contado - esperado;

    setCerrandoCaja(true);
    try {
      const res = await fetch("/api/caja", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sesionParaCerrar.id,
          declaredCash: contado,
          expectedCash: esperado,
          diffCash: diferencia,
          notes: conteoNotas,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al cerrar caja");
      }

      setSesionParaCerrar(null);
      setConteoEfectivo("");
      setConteoNotas("");
      await cargarCaja();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCerrandoCaja(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-0">
      <Header />

      <main className="flex-grow px-3.5 py-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col gap-3.5 sm:gap-6">
        {/* Header */}
        <div className="order-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link 
              href="/pos"
              title="Volver a Panel POS"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              Caja
            </h1>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20 shrink-0">
              {stats.totalSesiones}
            </span>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 ml-auto shrink-0">
            <BranchTabs onChange={() => cargarCaja()} size="sm" />
            <button
              type="button"
              onClick={() => setMostrarModalFondo(true)}
              title="Abrir nueva sesión de caja"
              aria-label="Abrir Caja"
              className="h-9 w-9 sm:w-auto sm:h-10 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Abrir Caja</span>
            </button>
          </div>
        </div>

        {/* 4 Tarjetas Métricas Superiores (4 recuadros pequeños en fila en móvil, empiezan ocultos) */}
        <div className={`order-3 sm:order-2 ${mostrarMetricasMovil ? "block" : "hidden"} sm:block animate-in fade-in slide-in-from-top-1 duration-150`}>
          <div className="grid grid-cols-4 md:grid-cols-4 gap-2 sm:gap-4">
            {/* Abiertas */}
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center gap-1 sm:gap-3.5 text-center sm:text-left shadow-xs sm:shadow-sm backdrop-blur-sm">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                🟢
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight truncate">
                  {cargando ? "..." : stats.abiertas}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold truncate">Abiertas</h3>
              </div>
            </div>

            {/* Fondo */}
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center gap-1 sm:gap-3.5 text-center sm:text-left shadow-xs sm:shadow-sm backdrop-blur-sm">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/25 text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                🪙
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight truncate">
                  {cargando ? "..." : `$${stats.fondoTotal.toFixed(0)}`}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold truncate">Fondo</h3>
              </div>
            </div>

            {/* Ventas */}
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center gap-1 sm:gap-3.5 text-center sm:text-left shadow-xs sm:shadow-sm backdrop-blur-sm">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                🛒
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight truncate">
                  {cargando ? "..." : `$${stats.ventasTotal.toFixed(0)}`}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold truncate">Ventas</h3>
              </div>
            </div>

            {/* Cerradas */}
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center gap-1 sm:gap-3.5 text-center sm:text-left shadow-xs sm:shadow-sm backdrop-blur-sm">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/25 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                🔒
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight truncate">
                  {cargando ? "..." : stats.cerradas}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs font-semibold truncate">Cerradas</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje de Error si ocurre */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              onClick={() => cargarCaja()}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl text-xs font-bold"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* En una sola línea: Buscador + Filtro + Métricas */}
        <div className="order-2 sm:order-3 flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none pointer-events-none">🔍</span>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar sesión o fecha..."
              className="w-full pl-10 pr-9 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-xs"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Desplegable Filtro Estado */}
          <div ref={dropdownRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setDropdownFiltroAbierto(!dropdownFiltroAbierto)}
              title="Filtrar sesiones de caja"
              aria-label="Filtrar caja"
              className={`relative w-11 h-11 sm:w-48 sm:px-4 rounded-xl border text-sm font-normal flex items-center justify-center sm:justify-between transition-all cursor-pointer shadow-xs active:scale-95 ${
                filtro !== "todas"
                  ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {filtro !== "todas" && (
                <span className="sm:hidden absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-zinc-950" />
              )}
              <span className="hidden sm:inline capitalize">{filtro === "todas" ? "Estado: Todas" : filtro}</span>
              <svg
                className={`hidden sm:block w-4 h-4 text-zinc-400 transition-transform ${dropdownFiltroAbierto ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownFiltroAbierto && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                {[
                  { id: "todas", label: "Todas" },
                  { id: "abiertas", label: "Abiertas" },
                  { id: "cerradas", label: "Cerradas" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFiltro(opt.id as "todas" | "abiertas" | "cerradas");
                      setDropdownFiltroAbierto(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                      filtro === opt.id
                        ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-medium"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {filtro === opt.id && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón Métricas (solo móvil) */}
          <button
            type="button"
            onClick={() => setMostrarMetricasMovil(!mostrarMetricasMovil)}
            title="Mostrar u ocultar métricas"
            aria-label="Mostrar métricas"
            className={`sm:hidden w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
              mostrarMetricasMovil
                ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>

        {/* Tabla Desktop y Tarjetas Móviles */}
        <div className="order-4 md:bg-white md:dark:bg-zinc-900/60 md:border md:border-zinc-200 md:dark:border-zinc-800 md:rounded-3xl overflow-hidden md:shadow-sm md:dark:shadow-2xl md:backdrop-blur-sm">
          {/* Vista Móvil (Ordenada como Clientes: Cabecera, 2 recuadros, resumen deslizable y barra de botones abajo) */}
          <div className="md:hidden space-y-3">
            {cargando && sesiones.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                Cargando...
              </div>
            ) : sesionesFiltradas.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm flex flex-col items-center gap-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-3xl">💵</span>
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Sin sesiones de caja</span>
              </div>
            ) : (
              sesionesPaginadas.map((s) => {
                const esAbierta = s.status === "ABIERTA";
                const fechaTexto = new Date(s.openedAt).toLocaleDateString("es-EC", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
                const horaTexto = new Date(s.openedAt).toLocaleTimeString("es-EC", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs transition-colors"
                  >
                    <div className="p-3.5 space-y-3">
                      {/* 1. Icono, Sesión, Estado, Cajero y Fecha/Hora */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 border ${
                            esAbierta
                              ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : "bg-zinc-100 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {esAbierta ? "🟢" : "🔒"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-sm text-zinc-900 dark:text-white font-mono truncate">
                              {s.sessionNumber}
                            </p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${
                                esAbierta
                                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                                  : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/40"
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>

                          <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              👤 {s.cashier || "POS"}
                            </span>
                            <span>•</span>
                            <span>📅 {fechaTexto} ({horaTexto})</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Dos recuadros: Fondo Inicial y Esperado / Declarado */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-3 py-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                            Fondo Inicial
                          </span>
                          <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                            ${toMonto(s.initialCash)}
                          </span>
                        </div>

                        <div className="bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 rounded-xl px-3 py-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 block">
                            {esAbierta ? "Efectivo Esperado" : "Efectivo Declarado"}
                          </span>
                          <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                            ${toMonto(esAbierta ? s.expectedCash : s.declaredCash)}
                          </span>
                        </div>
                      </div>

                      {/* 3. Etiquetas deslizables de ventas / gastos / diferencia */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60 text-[11px] font-medium whitespace-nowrap shrink-0">
                          <span>🛒 Ventas:</span>
                          <span className="font-mono font-bold">${toMonto(s.totalSalesCash)}</span>
                        </span>
                        {s.totalExpenses !== undefined && s.totalExpenses !== null && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60 text-[11px] font-medium whitespace-nowrap shrink-0">
                            <span>💸 Gastos:</span>
                            <span className="font-mono font-bold">${toMonto(s.totalExpenses)}</span>
                          </span>
                        )}
                        {!esAbierta && s.differenceCash !== undefined && s.differenceCash !== null && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap shrink-0 ${
                              toNumero(s.differenceCash) < 0
                                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            }`}
                          >
                            <span>⚖️ Dif:</span>
                            <span className="font-mono font-bold">${toMonto(s.differenceCash)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4. Botones grandes abajo */}
                    <div
                      className={`grid ${
                        esAbierta ? "grid-cols-3" : "grid-cols-2"
                      } divide-x divide-zinc-200 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80`}
                    >
                      {esAbierta ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSesionParaCerrar(s);
                              setConteoEfectivo("");
                            }}
                            className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <span>🔒</span>
                            <span>Cerrar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTipoMovimiento("GASTO");
                              setMostrarModalMovimiento(true);
                            }}
                            className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 active:bg-sky-100 transition-colors cursor-pointer"
                          >
                            <span>💸</span>
                            <span>Movimiento</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSesionDetalle(s)}
                          className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 transition-colors cursor-pointer"
                        >
                          <span>📋</span>
                          <span>Arqueo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSesionParaEliminar(s)}
                        className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:bg-rose-100 transition-colors cursor-pointer"
                      >
                        <span>🗑️</span>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Vista Tabla Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Sesión</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fondo</th>
                  <th className="px-6 py-4">Esperado</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {cargando && sesiones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-sm">
                      Cargando...
                    </td>
                  </tr>
                ) : sesionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-500 text-sm">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-3xl">💵</span>
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Sin registros de caja</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sesionesPaginadas.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/40 flex items-center justify-center text-base">
                            {s.status === "ABIERTA" ? "🟢" : "🔒"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-zinc-900 dark:text-white font-mono">{s.sessionNumber}</p>
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1">
                                <span>👤</span>
                                <span>{s.cashier || "POS"}</span>
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {new Date(s.openedAt).toLocaleTimeString("es-EC", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            s.status === "ABIERTA"
                              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                              : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/40"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "ABIERTA" ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                            }`}
                          />
                          {s.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-white">
                        ${toMonto(s.initialCash)}
                      </td>

                      <td className="px-6 py-4 font-bold text-emerald-400">
                        ${toMonto(s.status === "ABIERTA" ? s.expectedCash : s.declaredCash)}
                      </td>

                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(s.openedAt).toLocaleDateString("es-EC", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {s.status === "ABIERTA" ? (
                            <button
                              onClick={() => {
                                setSesionParaCerrar(s);
                                setConteoEfectivo("");
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 active:scale-95 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] cursor-pointer"
                            >
                              Cerrar
                            </button>
                          ) : (
                            <button
                              onClick={() => setSesionDetalle(s)}
                              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/40 hover:bg-zinc-200 dark:hover:bg-zinc-800/70 active:scale-95 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/40 text-xs font-semibold transition-all cursor-pointer"
                            >
                              Arqueo
                            </button>
                          )}
                          <button
                            onClick={() => setSesionParaEliminar(s)}
                            title="Eliminar sesión"
                            className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-95 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Paginacion
            paginaActual={paginaValida}
            totalElementos={sesionesFiltradas.length}
            onCambiarPagina={setPaginaActual}
          />
        </div>
      </main>

      {/* MODAL 1: CERRAR / ARQUEO DE CAJA */}
      {sesionParaCerrar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-zinc-900 dark:text-white flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-lg">
                  🔒
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Cierre</h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {sesionParaCerrar.sessionNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSesionParaCerrar(null)}
                className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Cuadro Resumen de Esperado */}
            <div className="bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-xs text-zinc-400 font-medium">Esperado</span>
                <p className="text-2xl font-black text-emerald-400">
                  ${toMonto(sesionParaCerrar.expectedCash)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400 font-medium">Diferencia</span>
                <p
                  className={`text-lg font-bold ${
                    conteoEfectivo !== "" &&
                    parseFloat(conteoEfectivo) - toNumero(sesionParaCerrar.expectedCash) < 0
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}
                >
                  {conteoEfectivo === ""
                    ? "$0.00"
                    : `$${toMonto(parseFloat(conteoEfectivo) - toNumero(sesionParaCerrar.expectedCash))}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmarCierre} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2">
                  Contado
                </label>
                <div className="relative flex items-center bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 focus-within:border-emerald-500/50 rounded-2xl px-4 py-3">
                  <span className="text-2xl font-bold text-zinc-500 mr-2">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    placeholder="0.00"
                    value={conteoEfectivo}
                    onChange={(e) => setConteoEfectivo(e.target.value)}
                    className="w-full text-2xl font-black text-zinc-900 dark:text-white bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Atajos Rápidos */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => agregarEfectivo(val)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 text-xs font-semibold text-zinc-300 border border-zinc-700/40 transition-all"
                  >
                    +${val}
                  </button>
                ))}
                {conteoEfectivo !== "" && (
                  <button
                    type="button"
                    onClick={() => setConteoEfectivo("")}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-all"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Opcional..."
                  value={conteoNotas}
                  onChange={(e) => setConteoNotas(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-white focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSesionParaCerrar(null)}
                  className="flex-1 h-11 py-3 px-4 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800/70 text-zinc-400 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cerrandoCaja}
                  className="flex-1 h-11 py-3 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 active:scale-95 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                >
                  {cerrandoCaja ? "Cerrando..." : "Cerrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FONDO / APERTURA */}
      {mostrarModalFondo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-zinc-900 dark:text-white flex flex-col gap-5 text-center max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl">
                💵
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Apertura</h3>
                <span className="text-xs text-zinc-400">Fondo</span>
              </div>
            </div>

            <form onSubmit={handleGuardarFondo} className="flex flex-col gap-4">
              <div className="relative flex items-center bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 focus-within:border-emerald-500/50 rounded-2xl px-4 py-3">
                <span className="text-2xl font-bold text-zinc-500 mr-2">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  autoFocus
                  placeholder="0.00"
                  value={montoFondo}
                  onChange={(e) => setMontoFondo(e.target.value)}
                  className="w-full text-2xl font-black text-zinc-900 dark:text-white text-center bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalFondo(false)}
                  className="flex-1 h-11 py-3 px-4 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800/70 text-zinc-400 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoFondo}
                  className="flex-1 h-11 py-3 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 active:scale-95 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                >
                  {guardandoFondo ? "Guardando..." : "Abrir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: GASTO / INGRESO */}
      {mostrarModalMovimiento && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-zinc-900 dark:text-white flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white capitalize">{tipoMovimiento.toLowerCase()}</h3>
              <button
                onClick={() => setMostrarModalMovimiento(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarMovimiento} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2">Monto</label>
                <div className="relative flex items-center bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 focus-within:border-emerald-500/50 rounded-2xl px-4 py-3">
                  <span className="text-2xl font-bold text-zinc-500 mr-2">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    placeholder="0.00"
                    value={montoMovimiento}
                    onChange={(e) => setMontoMovimiento(e.target.value)}
                    className="w-full text-2xl font-black text-zinc-900 dark:text-white bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">Concepto</label>
                <input
                  type="text"
                  placeholder="Detalle..."
                  value={conceptoMovimiento}
                  onChange={(e) => setConceptoMovimiento(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-white focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalMovimiento(false)}
                  className="flex-1 h-11 py-3 px-4 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800/70 text-zinc-400 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoMovimiento}
                  className={`flex-1 h-11 py-3 px-4 rounded-2xl font-bold text-xs transition-all flex items-center justify-center border shadow-lg cursor-pointer ${
                    tipoMovimiento === "GASTO"
                      ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30"
                      : "bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30"
                  }`}
                >
                  {guardandoMovimiento ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETALLE / ARQUEO DE SESIÓN CERRADA */}
      {sesionDetalle && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-zinc-900 dark:text-white flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Arqueo</h3>
              <button
                onClick={() => setSesionDetalle(null)}
                className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800/60">
                <span className="text-zinc-400">Sesión:</span>
                <span className="font-mono font-bold text-white">{sesionDetalle.sessionNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800/60">
                <span className="text-zinc-400">Cajero:</span>
                <span className="font-bold text-white">{sesionDetalle.cashier || "POS"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800/60">
                <span className="text-zinc-400">Fondo:</span>
                <span className="font-bold text-white">${toMonto(sesionDetalle.initialCash)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800/60">
                <span className="text-zinc-400">Declarado:</span>
                <span className="font-bold text-emerald-400">
                  ${toMonto(sesionDetalle.declaredCash)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800/60">
                <span className="text-zinc-400">Diferencia:</span>
                <span
                  className={`font-bold ${
                    (parseFloat(sesionDetalle.differenceCash?.toString() || "0") || 0) < 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  ${toMonto(sesionDetalle.differenceCash)}
                </span>
              </div>
              {sesionDetalle.notes && (
                <div className="pt-1 text-zinc-400 italic">
                  &ldquo;{sesionDetalle.notes}&rdquo;
                </div>
              )}
            </div>

            <button
              onClick={() => setSesionDetalle(null)}
              className="w-full mt-2 h-11 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRMACIÓN DE ELIMINACIÓN DE SESIÓN */}
      {sesionParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-zinc-900 dark:text-white flex flex-col items-center text-center gap-4 max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center text-2xl">
              🗑️
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">¿Eliminar sesión?</h3>
              <p className="text-sm font-mono font-semibold text-zinc-300 mt-1">
                {sesionParaEliminar.sessionNumber}
              </p>
            </div>

            <div className="w-full p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>Estado:</span>
                <span className={`font-bold ${sesionParaEliminar.status === "ABIERTA" ? "text-emerald-400" : "text-zinc-300"}`}>
                  {sesionParaEliminar.status}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Fondo:</span>
                <span className="font-semibold text-white">${toMonto(sesionParaEliminar.initialCash)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Cajero:</span>
                <span className="font-semibold text-white">{sesionParaEliminar.cashier || "POS"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full pt-1">
              <button
                type="button"
                onClick={() => setSesionParaEliminar(null)}
                disabled={eliminando}
                className="flex-1 h-11 py-3 px-4 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarEliminacion}
                disabled={eliminando}
                className="flex-1 h-11 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs transition-all shadow-[0_0_20px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {eliminando ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PosMobileNav />
    </div>
  );
}
