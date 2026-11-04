"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

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
      const res = await fetch("/api/caja");
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
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_INITIAL",
          initialCash: monto,
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
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tipoMovimiento,
          amount: monto,
          concept: conceptoMovimiento,
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
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="order-1 flex items-center gap-3">
          <Link 
            href="/pos"
            title="Volver a Panel POS"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Caja
          </h1>
          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            {stats.totalSesiones}
          </span>
        </div>

        {/* 4 Tarjetas Métricas Superiores Desplegables en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Abiertas */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 sm:p-5 rounded-3xl flex items-center gap-3.5 backdrop-blur-sm">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                🟢
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">
                  {cargando ? "..." : stats.abiertas}
                </p>
                <h3 className="text-zinc-400 text-xs font-semibold">Abiertas</h3>
              </div>
            </div>

            {/* Fondo */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 sm:p-5 rounded-3xl flex items-center gap-3.5 backdrop-blur-sm">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/25 text-sky-400 flex items-center justify-center text-xl shrink-0">
                🪙
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">
                  {cargando ? "..." : `$${stats.fondoTotal.toFixed(2)}`}
                </p>
                <h3 className="text-zinc-400 text-xs font-semibold">Fondo</h3>
              </div>
            </div>

            {/* Ventas */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 sm:p-5 rounded-3xl flex items-center gap-3.5 backdrop-blur-sm">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center text-xl shrink-0">
                🛒
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">
                  {cargando ? "..." : `$${stats.ventasTotal.toFixed(2)}`}
                </p>
                <h3 className="text-zinc-400 text-xs font-semibold">Ventas</h3>
              </div>
            </div>

            {/* Cerradas */}
            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 sm:p-5 rounded-3xl flex items-center gap-3.5 backdrop-blur-sm">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-400 flex items-center justify-center text-xl shrink-0">
                🔒
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">
                  {cargando ? "..." : stats.cerradas}
                </p>
                <h3 className="text-zinc-400 text-xs font-semibold">Cerradas</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

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

        {/* Barra de Búsqueda y Filtros */}
        <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">🔍</span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Desplegable Filtro Estado */}
          <div ref={dropdownRef} className="relative w-full sm:w-48 shrink-0">
            <button
              type="button"
              onClick={() => setDropdownFiltroAbierto(!dropdownFiltroAbierto)}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <span className="capitalize">{filtro === "todas" ? "Estado" : filtro}</span>
              <svg
                className={`w-4 h-4 text-zinc-400 transition-transform ${dropdownFiltroAbierto ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownFiltroAbierto && (
              <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                {[
                  { id: "todas", label: "Estado" },
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
                        ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
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
        </div>

        {/* Tabla Desktop y Tarjetas Móviles */}
        <div className="order-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Vista Móvil */}
          <div className="md:hidden divide-y divide-zinc-800/80">
            {cargando && sesiones.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm">Cargando...</div>
            ) : sesionesFiltradas.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
                <span className="text-3xl">💵</span>
                <span>Sin sesiones</span>
              </div>
            ) : (
              sesionesFiltradas.map((s) => (
                <div key={s.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800/70 border border-zinc-700/50 flex items-center justify-center text-sm">
                        {s.status === "ABIERTA" ? "🟢" : "🔒"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-white font-mono">{s.sessionNumber}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 font-medium flex items-center gap-1">
                            <span>👤</span>
                            <span>{s.cashier || "POS"}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {new Date(s.openedAt).toLocaleTimeString("es-EC", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                        s.status === "ABIERTA"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-zinc-800/70 text-zinc-400 border-zinc-700/40"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/60">
                    <div>
                      <span className="text-zinc-500">Fondo: </span>
                      <span className="font-bold text-white">${toMonto(s.initialCash)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">
                        {s.status === "ABIERTA" ? "Esperado:" : "Declarado:"}{" "}
                      </span>
                      <span className="font-bold text-emerald-400">
                        ${toMonto(s.status === "ABIERTA" ? s.expectedCash : s.declaredCash)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {s.status === "ABIERTA" ? (
                      <button
                        onClick={() => {
                          setSesionParaCerrar(s);
                          setConteoEfectivo("");
                        }}
                        className="flex-1 h-11 min-h-[44px] rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                      >
                        Cerrar
                      </button>
                    ) : (
                      <button
                        onClick={() => setSesionDetalle(s)}
                        className="flex-1 h-11 min-h-[44px] rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 active:scale-95 text-zinc-300 border border-zinc-700/40 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
                      >
                        Arqueo
                      </button>
                    )}
                    <button
                      onClick={() => setSesionParaEliminar(s)}
                      title="Eliminar sesión"
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 hover:text-red-300 border border-red-500/20 flex items-center justify-center transition-all cursor-pointer shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Tabla Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-400 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Sesión</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fondo</th>
                  <th className="px-6 py-4">Esperado</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
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
                        <span>Sin registros de caja</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sesionesFiltradas.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-800/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center text-base">
                            {s.status === "ABIERTA" ? "🟢" : "🔒"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white font-mono">{s.sessionNumber}</p>
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 font-medium flex items-center gap-1">
                                <span>👤</span>
                                <span>{s.cashier || "POS"}</span>
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">
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
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-zinc-800/70 text-zinc-400 border-zinc-700/40"
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

                      <td className="px-6 py-4 font-semibold text-white">
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
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] cursor-pointer"
                            >
                              Cerrar
                            </button>
                          ) : (
                            <button
                              onClick={() => setSesionDetalle(s)}
                              className="px-3.5 py-1.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 active:scale-95 text-zinc-300 border border-zinc-700/40 text-xs font-semibold transition-all cursor-pointer"
                            >
                              Arqueo
                            </button>
                          )}
                          <button
                            onClick={() => setSesionParaEliminar(s)}
                            title="Eliminar sesión"
                            className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 hover:text-red-300 border border-red-500/20 flex items-center justify-center transition-all cursor-pointer"
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
        </div>
      </main>

      {/* MODAL 1: CERRAR / ARQUEO DE CAJA */}
      {sesionParaCerrar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-lg">
                  🔒
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cierre</h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {sesionParaCerrar.sessionNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSesionParaCerrar(null)}
                className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Cuadro Resumen de Esperado */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 p-4 rounded-2xl flex justify-between items-center">
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
                <div className="relative flex items-center bg-zinc-950/70 border border-zinc-800 focus-within:border-emerald-500/50 rounded-2xl px-4 py-3">
                  <span className="text-2xl font-bold text-zinc-500 mr-2">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    placeholder="0.00"
                    value={conteoEfectivo}
                    onChange={(e) => setConteoEfectivo(e.target.value)}
                    className="w-full text-2xl font-black text-white bg-transparent focus:outline-none"
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
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-xs text-white focus:outline-none focus:border-zinc-700"
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
                  className="flex-1 h-11 py-3 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
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
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col gap-5 text-center max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl">
                💵
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Apertura</h3>
                <span className="text-xs text-zinc-400">Fondo</span>
              </div>
            </div>

            <form onSubmit={handleGuardarFondo} className="flex flex-col gap-4">
              <div className="relative flex items-center bg-zinc-950/70 border border-zinc-800 focus-within:border-emerald-500/50 rounded-2xl px-4 py-3">
                <span className="text-2xl font-bold text-zinc-500 mr-2">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  autoFocus
                  placeholder="0.00"
                  value={montoFondo}
                  onChange={(e) => setMontoFondo(e.target.value)}
                  className="w-full text-2xl font-black text-white text-center bg-transparent focus:outline-none"
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
                  className="flex-1 h-11 py-3 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
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
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white capitalize">{tipoMovimiento.toLowerCase()}</h3>
              <button
                onClick={() => setMostrarModalMovimiento(false)}
                className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarMovimiento} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2">Monto</label>
                <div className="relative flex items-center bg-zinc-950/70 border border-zinc-800 focus-within:border-emerald-500/50 rounded-2xl px-4 py-3">
                  <span className="text-2xl font-bold text-zinc-500 mr-2">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    placeholder="0.00"
                    value={montoMovimiento}
                    onChange={(e) => setMontoMovimiento(e.target.value)}
                    className="w-full text-2xl font-black text-white bg-transparent focus:outline-none"
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
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-xs text-white focus:outline-none focus:border-zinc-700"
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
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">Arqueo</h3>
              <button
                onClick={() => setSesionDetalle(null)}
                className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Sesión:</span>
                <span className="font-mono font-bold text-white">{sesionDetalle.sessionNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Cajero:</span>
                <span className="font-bold text-white">{sesionDetalle.cashier || "POS"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Fondo:</span>
                <span className="font-bold text-white">${toMonto(sesionDetalle.initialCash)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Declarado:</span>
                <span className="font-bold text-emerald-400">
                  ${toMonto(sesionDetalle.declaredCash)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
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
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col items-center text-center gap-4 max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center text-2xl">
              🗑️
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white">¿Eliminar sesión?</h3>
              <p className="text-sm font-mono font-semibold text-zinc-300 mt-1">
                {sesionParaEliminar.sessionNumber}
              </p>
            </div>

            <div className="w-full p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-left text-xs space-y-1.5">
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
