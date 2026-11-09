"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface TimeRecord {
  id: string;
  dbId: string;
  logNumber: string;
  task: string;
  orderId: string;
  vehicle?: string;
  mechanic: string;
  date: string;
  duration: string;
  durationMinutes: number;
  status: string;
  revenue: string;
  revenueNumeric: number;
  notes?: string;
}

interface TimeStats {
  totalMinutes: number;
  totalFormatted: string;
  totalRevenue: number;
  completedCount: number;
  efficiency: number;
}

interface ActiveOrderItem {
  id: string;
  vehicle: string;
  plate: string;
  mechanic: string;
}

export default function ControlTiemposPage() {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [stats, setStats] = useState<TimeStats>({
    totalMinutes: 0,
    totalFormatted: "0h 00m",
    totalRevenue: 0,
    completedCount: 0,
    efficiency: 92,
  });
  const [ordenesActivas, setOrdenesActivas] = useState<ActiveOrderItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMechanic, setFilterMechanic] = useState("");
  const [filtroMecanicoAbierto, setFiltroMecanicoAbierto] = useState(false);

  // Cronómetro en vivo
  const [activeTimer, setActiveTimer] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerTask, setTimerTask] = useState("Diagnóstico y Reparación");
  const [timerOrderId, setTimerOrderId] = useState("");
  const [timerVehicle, setTimerVehicle] = useState("");
  const [timerMechanic, setTimerMechanic] = useState("Carlos Rodríguez");
  const [guardandoTimer, setGuardandoTimer] = useState(false);

  // Modal Registro Manual
  const [modalManual, setModalManual] = useState(false);
  const [manualTask, setManualTask] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");
  const [manualVehicle, setManualVehicle] = useState("");
  const [manualMechanic, setManualMechanic] = useState("Carlos Rodríguez");
  const [manualMinutes, setManualMinutes] = useState("60");
  const [manualRevenue, setManualRevenue] = useState("35.00");
  const [manualNotes, setManualNotes] = useState("");
  const [guardandoManual, setGuardandoManual] = useState(false);

  // Modal Reporte Mensual
  const [modalReporte, setModalReporte] = useState(false);

  const cargarTiempos = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/taller/tiempos", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Error al cargar tiempos desde base de datos:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTiempos();
  }, [cargarTiempos]);

  useEffect(() => {
    fetch("/api/taller/ordenes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && Array.isArray(d.orders) && d.orders.length > 0) {
          setOrdenesActivas(d.orders);
          const first = d.orders[0];
          setTimerOrderId(first.id);
          setTimerVehicle(`${first.vehicle} (${first.plate})`);
          setTimerMechanic(first.mechanic || "Carlos Rodríguez");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTimerHHMMSS = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return {
      main: `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`,
      sec: `:${secs.toString().padStart(2, "0")}`,
    };
  };

  const handleFinalizarYGuardarCronometro = async () => {
    const mins = Math.max(1, Math.round(elapsedSeconds / 60));
    const rev = Math.max(5, Math.round((mins / 60) * 35 * 100) / 100);
    setGuardandoTimer(true);
    setActiveTimer(false);
    try {
      const res = await fetch("/api/taller/tiempos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: timerTask.trim() || "Servicio en Bahía",
          orderId: timerOrderId.trim() || "ORD-TALLER",
          vehicle: timerVehicle.trim(),
          mechanic: timerMechanic,
          durationMinutes: mins,
          revenue: rev,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar tiempo");
      }
      setElapsedSeconds(0);
      await cargarTiempos();
    } catch (err: any) {
      alert(err.message || "No se pudo registrar el tiempo.");
    } finally {
      setGuardandoTimer(false);
    }
  };

  const handleCrearManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTask.trim() || !manualOrderId.trim()) {
      alert("Completa la tarea y el código de orden.");
      return;
    }

    setGuardandoManual(true);
    try {
      const res = await fetch("/api/taller/tiempos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: manualTask.trim(),
          orderId: manualOrderId.trim(),
          vehicle: manualVehicle.trim() || undefined,
          mechanic: manualMechanic,
          durationMinutes: parseInt(manualMinutes || "60", 10) || 60,
          revenue: parseFloat(manualRevenue || "0") || 0,
          notes: manualNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar registro");
      }

      setModalManual(false);
      setManualTask("");
      setManualOrderId("");
      setManualVehicle("");
      setManualMinutes("60");
      setManualRevenue("35.00");
      setManualNotes("");
      await cargarTiempos();
    } catch (err: any) {
      alert(err.message || "Error al guardar el registro.");
    } finally {
      setGuardandoManual(false);
    }
  };

  const handleEliminar = async (rec: TimeRecord) => {
    if (!window.confirm(`¿Eliminar el registro de tiempo ${rec.id}?`)) return;
    try {
      const id = rec.dbId || rec.id;
      const res = await fetch(`/api/taller/tiempos?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar");
      }
      await cargarTiempos();
    } catch (err: any) {
      alert(err.message || "No se pudo eliminar el registro.");
    }
  };

  const timerDisplay = formatTimerHHMMSS(elapsedSeconds);

  // Resumen por mecánico para el Reporte Mensual
  const resumenPorMecanico = Array.from(
    records.reduce((map, r) => {
      const curr = map.get(r.mechanic) || { mechanic: r.mechanic, mins: 0, rev: 0, count: 0 };
      curr.mins += r.durationMinutes || 0;
      curr.rev += r.revenueNumeric || 0;
      curr.count += 1;
      map.set(r.mechanic, curr);
      return map;
    }, new Map<string, { mechanic: string; mins: number; rev: number; count: number }>())
  ).map(([, v]) => v);

  // Filtrado de registros en tiempo real
  const recordsFiltrados = records.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      r.task.toLowerCase().includes(q) ||
      r.orderId.toLowerCase().includes(q) ||
      r.mechanic.toLowerCase().includes(q) ||
      (r.vehicle && r.vehicle.toLowerCase().includes(q));
    const matchMechanic = !filterMechanic || r.mechanic === filterMechanic;
    return matchSearch && matchMechanic;
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col">
        {/* Navigation / Header */}
        <div className="order-1 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/taller"
              title="Volver al Panel de Taller"
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Control de Tiempos
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-sm shadow-rose-500/20">
              {cargando ? "..." : records.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalReporte(true)}
              className="h-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 text-zinc-700 dark:text-zinc-300 px-4 rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>📊</span> Reporte
            </button>
            <button
              type="button"
              onClick={() => setModalManual(true)}
              className="h-11 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-5 rounded-xl font-bold text-sm transition-all shadow-sm shadow-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>+</span> Registro Manual
            </button>
          </div>
        </div>

        {/* Resumen Métricas Desplegable en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-500 flex items-center justify-center text-xl shrink-0">
                ⏱️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalFormatted}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Horas Totales</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                💵
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">${stats.totalRevenue.toFixed(2)}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Facturable</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 flex items-center justify-center text-xl shrink-0">
                📊
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completedCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Sesiones</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-500 flex items-center justify-center text-xl shrink-0">
                👨‍🔧
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{resumenPorMecanico.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Mecánicos</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Buscador y Filtros */}
        <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">🔍</span>
            <input
              type="text"
              placeholder="Buscar por tarea, orden, vehículo o mecánico..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all placeholder:text-zinc-400 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-56 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMecanicoAbierto(!filtroMecanicoAbierto)}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <span className="truncate">{filterMechanic ? filterMechanic : "Mecánicos"}</span>
              <svg className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ml-1.5 ${filtroMecanicoAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMecanicoAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltroMecanicoAbierto(false)} />
                <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "", label: "Mecánicos" },
                    { id: "Carlos Rodríguez", label: "Carlos Rodríguez" },
                    { id: "Luis Martínez", label: "Luis Martínez" },
                    { id: "Andrés Castro", label: "Andrés Castro" },
                    { id: "Ana Torres", label: "Ana Torres" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setFilterMechanic(opcion.id);
                        setFiltroMecanicoAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        filterMechanic === opcion.id
                          ? "bg-rose-50 dark:bg-rose-600/15 text-rose-600 dark:text-rose-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="truncate">{opcion.label}</span>
                      {filterMechanic === opcion.id && (
                        <svg className="w-4 h-4 text-rose-500 shrink-0 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sección Principal de Tiempos y Cronómetro */}
        <div className="order-4 space-y-6 sm:space-y-8">
          {/* Cronómetro Activo */}
          <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-2xl sm:text-3xl">
                    👨‍🔧
                  </div>
                  {activeTimer && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-ping"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                    Cronómetro Activo de Bahía
                  </p>
                  <input
                    type="text"
                    value={timerTask}
                    onChange={(e) => setTimerTask(e.target.value)}
                    className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white bg-transparent border-b border-zinc-200 dark:border-zinc-700 sm:border-transparent focus:border-rose-500 outline-none w-full py-0.5"
                  />
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {ordenesActivas.length > 0 ? (
                      <select
                        value={timerOrderId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTimerOrderId(val);
                          const ord = ordenesActivas.find((o) => o.id === val);
                          if (ord) {
                            setTimerVehicle(`${ord.vehicle} (${ord.plate})`);
                            setTimerMechanic(ord.mechanic || "Carlos Rodríguez");
                          }
                        }}
                        className="h-10 text-xs sm:text-xs font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800 outline-none"
                      >
                        {ordenesActivas.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.id} • {o.vehicle}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-mono text-rose-600 dark:text-rose-400">
                        {timerOrderId} • {timerVehicle}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">({timerMechanic})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto gap-3 sm:gap-4 pt-2 md:pt-0 border-t border-zinc-100 dark:border-zinc-800 md:border-t-0">
                <div className="text-left md:text-center">
                  <p className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white font-mono tracking-tighter">
                    {timerDisplay.main}
                    <span className="text-xl sm:text-2xl text-zinc-400">{timerDisplay.sec}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTimer(!activeTimer)}
                    title={activeTimer ? "Pausar cronómetro" : "Iniciar cronómetro"}
                    className={`w-12 h-12 min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center text-xl text-white shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                      activeTimer ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                    }`}
                  >
                    {activeTimer ? "⏸" : "▶️"}
                  </button>
                  <button
                    type="button"
                    disabled={guardandoTimer || elapsedSeconds === 0}
                    onClick={handleFinalizarYGuardarCronometro}
                    className="h-12 min-h-[44px] px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {guardandoTimer ? "Guardando..." : "💾 Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Logged Sessions */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                Registros de Tiempo en Base de Datos
              </h3>
              <p className="text-xs text-zinc-500">
                Historial de horas invertidas por mecánico y orden de trabajo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalManual(true)}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center text-sm font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              + Registro Manual
            </button>
          </div>

          {cargando ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full mb-3"></div>
              <p className="text-sm font-medium text-zinc-500">Cargando registros...</p>
            </div>
          ) : (
            <>
              {/* Mobile View: Cards adaptadas a diseño facturas */}
              <div className="block md:hidden space-y-3.5 p-4">
                {recordsFiltrados.map((record) => (
                  <div
                    key={record.dbId || record.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30">
                          ⏱️
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {record.task}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">#{record.id}</span>
                            <span> • {record.orderId}</span>
                            <span> • {record.mechanic}</span>
                          </p>
                        </div>
                      </div>

                      {/* Botón táctil eliminar (>= 44px) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEliminar(record)}
                          title="Eliminar registro"
                          aria-label="Eliminar registro"
                          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-95 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Datos secundarios (Tiempo, Facturable, Vehículo, Fecha) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-mono">
                        ⏱️ {record.duration}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold font-mono text-xs">
                        💰 {record.revenue}
                      </span>

                      {record.vehicle && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 font-medium text-xs">
                          🚗 {record.vehicle}
                        </span>
                      )}

                      <span className="text-zinc-400 ml-auto text-[11px] whitespace-nowrap">
                        {record.date}
                      </span>
                    </div>
                  </div>
                ))}
                {records.length === 0 && (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    No hay registros de tiempo. Inicia el cronómetro o agrega un registro manual.
                  </p>
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">ID / Tarea</th>
                      <th className="py-3.5 px-4">Orden / Vehículo</th>
                      <th className="py-3.5 px-4">Fecha</th>
                      <th className="py-3.5 px-4">Tiempo Invertido</th>
                      <th className="py-3.5 px-4 text-right">Facturable</th>
                      <th className="py-3.5 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {recordsFiltrados.map((record) => (
                      <tr
                        key={record.dbId || record.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">#{record.id}</span>
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {record.task}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            👨‍🔧 {record.mechanic}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 inline-block font-semibold">
                            {record.orderId}
                          </span>
                          {record.vehicle && (
                            <div className="text-xs text-zinc-500 mt-1">{record.vehicle}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-500 whitespace-nowrap">
                          {record.date}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-mono">
                            ⏱️ {record.duration}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-sm font-black text-zinc-900 dark:text-white font-mono">
                            {record.revenue}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleEliminar(record)}
                            title="Eliminar registro"
                            className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all flex items-center justify-center text-xs active:scale-95 cursor-pointer shadow-xs mx-auto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {recordsFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                          No hay registros de tiempo que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        </div>

        {/* Modal Registro Manual */}
        {modalManual && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 pb-8 sm:pb-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  ⏱️ Registrar Tiempo Manualmente
                </h3>
                <button
                  type="button"
                  onClick={() => setModalManual(false)}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearManual} className="space-y-4">
                {ordenesActivas.length > 0 && (
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Seleccionar Orden de Taller
                    </label>
                    <select
                      value={manualOrderId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualOrderId(val);
                        const found = ordenesActivas.find((o) => o.id === val);
                        if (found) {
                          setManualVehicle(`${found.vehicle} (${found.plate})`);
                          setManualMechanic(found.mechanic || "Carlos Rodríguez");
                        }
                      }}
                      className="w-full h-11 text-base sm:text-sm px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white"
                    >
                      <option value="">-- Seleccionar orden o escribir abajo --</option>
                      {ordenesActivas.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.id} • {o.vehicle} ({o.plate})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                    Tarea Realizada *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Desmontaje y limpieza de inyectores"
                    value={manualTask}
                    onChange={(e) => setManualTask(e.target.value)}
                    className="w-full h-11 text-base sm:text-sm px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Código de Orden *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: ORD-2024-105"
                      value={manualOrderId}
                      onChange={(e) => setManualOrderId(e.target.value.toUpperCase())}
                      className="w-full h-11 text-base sm:text-sm px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Mecánico
                    </label>
                    <select
                      value={manualMechanic}
                      onChange={(e) => setManualMechanic(e.target.value)}
                      className="w-full h-11 text-base sm:text-sm px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white"
                    >
                      <option value="Carlos Rodríguez">Carlos Rodríguez</option>
                      <option value="Luis Martínez">Luis Martínez</option>
                      <option value="Andrés Castro">Andrés Castro</option>
                      <option value="Ana Torres">Ana Torres</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Duración (Minutos) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      className="w-full h-11 text-base sm:text-sm px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Monto Facturable (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={manualRevenue}
                      onChange={(e) => setManualRevenue(e.target.value)}
                      className="w-full h-11 text-base sm:text-sm px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalManual(false)}
                    className="w-full sm:w-auto h-11 min-h-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoManual}
                    className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {guardandoManual ? "Guardando..." : "Guardar Registro"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Reporte Mensual */}
        {modalReporte && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 pb-8 sm:pb-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  📊 Reporte de Productividad por Mecánico
                </h3>
                <button
                  type="button"
                  onClick={() => setModalReporte(false)}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {resumenPorMecanico.map((m) => {
                  const h = Math.floor(m.mins / 60);
                  const min = m.mins % 60;
                  return (
                    <div
                      key={m.mechanic}
                      className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
                    >
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">👨‍🔧 {m.mechanic}</p>
                        <p className="text-xs text-zinc-500">
                          {m.count} sesiones • {h}h {min}m registradas
                        </p>
                      </div>
                      <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                        ${m.rev.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                  Total General ({stats.totalFormatted})
                </span>
                <span className="text-xl font-black text-zinc-900 dark:text-white">
                  ${stats.totalRevenue.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalReporte(false)}
                  className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white text-sm font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Navigation Bar */}
      <TallerMobileNav />
    </div>
  );
}
