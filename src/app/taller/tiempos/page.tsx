"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

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

  // Cronómetro en vivo
  const [activeTimer, setActiveTimer] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(1425); // 00:23:45 inicial listo para usar
  const [timerTask, setTimerTask] = useState("Diagnóstico y Reparación");
  const [timerOrderId, setTimerOrderId] = useState("ORD-2023-001");
  const [timerVehicle, setTimerVehicle] = useState("Toyota Hilux 2020 (ABC-123)");
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
      console.error("Error al cargar tiempos desde Neon:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTiempos();
  }, [cargarTiempos]);

  useEffect(() => {
    fetch("/api/taller/ordenes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.orders) && d.orders.length > 0) {
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
      alert(err.message || "No se pudo registrar el tiempo en Neon.");
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
      alert(err.message || "Error al guardar en Neon.");
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

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/taller"
            className="text-sm font-medium text-rose-600 hover:text-rose-500 flex items-center gap-1 w-fit"
          >
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-rose-500 bg-opacity-10 flex items-center justify-center text-2xl">
                ⏱️
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Control de Tiempos
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Registro de horas trabajadas conectado en tiempo real a Neon DB.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalReporte(true)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>📊</span> Ver Reporte Mensual
          </button>
        </div>

        {/* Top Widgets: Active Timer & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Active Timer Widget */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-3xl">
                    👨‍🔧
                  </div>
                  {activeTimer && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-ping"></span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                    Cronómetro Activo de Bahía
                  </p>
                  <input
                    type="text"
                    value={timerTask}
                    onChange={(e) => setTimerTask(e.target.value)}
                    className="text-lg font-bold text-zinc-900 dark:text-white bg-transparent border-b border-transparent focus:border-rose-500 outline-none"
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
                        className="text-xs font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800 outline-none"
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

              <div className="flex items-center gap-4 self-end md:self-center">
                <div className="text-center">
                  <p className="text-4xl font-black text-zinc-900 dark:text-white font-mono tracking-tighter">
                    {timerDisplay.main}
                    <span className="text-2xl text-zinc-400">{timerDisplay.sec}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTimer(!activeTimer)}
                  title={activeTimer ? "Pausar cronómetro" : "Iniciar cronómetro"}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl text-white shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                    activeTimer ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
                >
                  {activeTimer ? "⏸" : "▶️"}
                </button>
                <button
                  type="button"
                  disabled={guardandoTimer || elapsedSeconds === 0}
                  onClick={handleFinalizarYGuardarCronometro}
                  className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {guardandoTimer ? "Guardando..." : "💾 Guardar Tiempo"}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-3xl shadow-sm text-white flex flex-col justify-center">
            <h3 className="text-rose-100 font-medium mb-1">Horas Totales (Neon DB)</h3>
            <p className="text-4xl font-bold mb-4">{stats.totalFormatted}</p>
            <div className="flex justify-between items-end border-t border-rose-400/50 pt-4">
              <div>
                <p className="text-xs text-rose-200">Facturable Acumulado</p>
                <p className="font-bold">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-rose-200 text-right">Sesiones registradas</p>
                <p className="font-bold text-right">{stats.completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logged Sessions Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Registros de Tiempo en Base de Datos
              </h3>
              <p className="text-xs text-zinc-500">
                Historial de horas invertidas por mecánico y orden de trabajo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalManual(true)}
              className="text-sm font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              + Registro Manual
            </button>
          </div>

          {cargando ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full mb-3"></div>
              <p className="text-sm font-medium text-zinc-500">Cargando registros desde Neon...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      ID / Tarea
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Orden / Vehículo
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Tiempo Invertido
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                      Facturable
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {records.map((record) => (
                    <tr
                      key={record.dbId || record.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-400">{record.id}</span>
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {record.task}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          👨‍🔧 {record.mechanic}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 inline-block">
                          {record.orderId}
                        </span>
                        {record.vehicle && (
                          <div className="text-xs text-zinc-500 mt-1">{record.vehicle}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                        {record.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          ⏱️ {record.duration}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {record.revenue}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEliminar(record)}
                          title="Eliminar registro"
                          className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                        No hay registros de tiempo. Inicia el cronómetro o agrega un registro manual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Registro Manual */}
        {modalManual && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  ⏱️ Registrar Tiempo Manualmente (Neon DB)
                </h3>
                <button
                  type="button"
                  onClick={() => setModalManual(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-xs cursor-pointer"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Mecánico
                    </label>
                    <select
                      value={manualMechanic}
                      onChange={(e) => setManualMechanic(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalManual(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoManual}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  📊 Reporte de Productividad por Mecánico (Neon DB)
                </h3>
                <button
                  type="button"
                  onClick={() => setModalReporte(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-xs cursor-pointer"
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
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
