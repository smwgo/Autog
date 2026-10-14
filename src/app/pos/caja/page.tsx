"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface Movement {
  id: string;
  type: "INGRESO" | "GASTO";
  concept: string;
  amount: number;
  createdAt: string;
}

interface CajaData {
  initialCash: number;
  salesCash: number;
  salesCard: number;
  salesTransfer: number;
  totalSales: number;
  totalExpenses: number;
  totalIncome: number;
  expectedCash: number;
  movements: Movement[];
  totalTransactions: number;
  lastClosed: any | null;
}

export default function CajaPage() {
  const [cargando, setCargando] = useState(true);
  const [dataCaja, setDataCaja] = useState<CajaData>({
    initialCash: 0,
    salesCash: 0,
    salesCard: 0,
    salesTransfer: 0,
    totalSales: 0,
    totalExpenses: 0,
    totalIncome: 0,
    expectedCash: 0,
    movements: [],
    totalTransactions: 0,
    lastClosed: null,
  });

  // Entradas de declaración del cajero
  const [declaredCash, setDeclaredCash] = useState<string>("");
  const [declaredCard, setDeclaredCard] = useState<string>("");
  const [declaredTransfer, setDeclaredTransfer] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Modales
  const [mostrarModalMovimiento, setMostrarModalMovimiento] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<"GASTO" | "INGRESO">("GASTO");
  const [montoMovimiento, setMontoMovimiento] = useState("");
  const [conceptoMovimiento, setConceptoMovimiento] = useState("");
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);

  const [mostrarModalFondo, setMostrarModalFondo] = useState(false);
  const [montoFondo, setMontoFondo] = useState("");
  const [guardandoFondo, setGuardandoFondo] = useState(false);

  const [cerrandoCaja, setCerrandoCaja] = useState(false);
  const [cierreExitoso, setCierreExitoso] = useState<any | null>(null);

  // Cargar datos reales desde Neon
  const cargarDatosCaja = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/caja");
      const json = await res.json();
      if (res.ok && json.success) {
        setDataCaja(json.data);
      }
    } catch (e) {
      console.error("Error al cargar datos de caja:", e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatosCaja();
  }, [cargarDatosCaja]);

  // Cálculos de Diferencias (Cuadre)
  const cashNum = parseFloat(declaredCash) || 0;
  const cardNum = parseFloat(declaredCard) || 0;
  const transferNum = parseFloat(declaredTransfer) || 0;

  const cashDiff = cashNum - dataCaja.expectedCash;
  const cardDiff = cardNum - dataCaja.salesCard;
  const transferDiff = transferNum - dataCaja.salesTransfer;
  const totalDiff = cashDiff + cardDiff + transferDiff;

  const getDiffColor = (diff: number) => {
    if (diff > 0) return "text-emerald-600 dark:text-emerald-400";
    if (diff < 0) return "text-rose-600 dark:text-rose-400";
    return "text-zinc-500 dark:text-zinc-400";
  };

  const getDiffText = (diff: number) => {
    if (diff > 0) return `+ $${diff.toFixed(2)} (Sobrante)`;
    if (diff < 0) return `- $${Math.abs(diff).toFixed(2)} (Faltante)`;
    return "✓ Cuadrado";
  };

  // Registrar movimiento real (Ingreso o Gasto) en Neon
  const handleGuardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoMovimiento);
    if (!monto || monto <= 0) {
      alert("Ingresa un monto válido");
      return;
    }
    if (!conceptoMovimiento.trim()) {
      alert("Ingresa un concepto o motivo");
      return;
    }

    setGuardandoMovimiento(true);
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MOVIMIENTO",
          type: tipoMovimiento,
          amount: monto,
          concept: conceptoMovimiento.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo registrar el movimiento");
      }

      setMontoMovimiento("");
      setConceptoMovimiento("");
      setMostrarModalMovimiento(false);
      await cargarDatosCaja();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  // Asignar Fondo Inicial en Neon
  const handleGuardarFondoInicial = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoFondo);
    if (isNaN(monto) || monto < 0) {
      alert("Ingresa un monto válido");
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
        throw new Error(json.error || "No se pudo actualizar el fondo inicial");
      }

      setMontoFondo("");
      setMostrarModalFondo(false);
      await cargarDatosCaja();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoFondo(false);
    }
  };

  // Confirmar Cierre de Caja en Neon
  const handleConfirmarCierre = async () => {
    if (!confirm("¿Deseas confirmar y guardar el cierre de caja de la jornada actual?")) {
      return;
    }

    setCerrandoCaja(true);
    try {
      const res = await fetch("/api/caja", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          declaredCash: cashNum,
          declaredCard: cardNum,
          declaredTransfer: transferNum,
          expectedCash: dataCaja.expectedCash,
          diffCash: cashDiff,
          diffCard: cardDiff,
          diffTransfer: transferDiff,
          notes: notes.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al procesar cierre de caja");
      }

      setCierreExitoso(json.cierre);
      await cargarDatosCaja();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCerrandoCaja(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/pos"
            className="text-sm font-medium text-amber-600 hover:text-amber-500 flex items-center gap-1 w-fit"
          >
            &larr; Volver a Punto de Venta
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-amber-500 bg-opacity-10 flex items-center justify-center text-2xl">
                💵
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Caja
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarModalFondo(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-amber-500 shadow-sm transition-all"
            >
              ⚙️ Fondo Inicial (${dataCaja.initialCash.toFixed(2)})
            </button>
            <button
              onClick={() => {
                setTipoMovimiento("GASTO");
                setMostrarModalMovimiento(true);
              }}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 shadow-sm transition-all"
            >
              - Registrar Gasto
            </button>
            <button
              onClick={() => {
                setTipoMovimiento("INGRESO");
                setMostrarModalMovimiento(true);
              }}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 shadow-sm transition-all"
            >
              + Ingreso Extra
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Declaración del Cajero */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-amber-50/50 dark:bg-amber-500/5">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>📝</span> Declaración del Cajero
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Conteo físico de caja.
              </p>
            </div>

            <div className="p-6 flex-grow space-y-5">
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Efectivo Contado en Caja
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all dark:text-white text-lg font-mono font-bold"
                    value={declaredCash}
                    onChange={(e) => setDeclaredCash(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Lotes de Tarjeta (Vouchers)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all dark:text-white text-lg font-mono font-bold"
                    value={declaredCard}
                    onChange={(e) => setDeclaredCard(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Transferencias / Otros
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-zinc-500 font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all dark:text-white text-lg font-mono font-bold"
                    value={declaredTransfer}
                    onChange={(e) => setDeclaredTransfer(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Observaciones
                </label>
                <textarea
                  placeholder="Detalla cualquier gasto, sobrante o faltante..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all dark:text-white resize-none h-20 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right Side: Resumen Real del Sistema */}
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🖥️</span> Resumen del Sistema
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                  {dataCaja.totalTransactions} transacciones
                </span>
              </div>

              <div className="p-6 space-y-3.5">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">Fondo Inicial de Caja</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                    ${dataCaja.initialCash.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">Ventas en Efectivo</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    + ${dataCaja.salesCash.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">Ventas en Tarjeta</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    + ${dataCaja.salesCard.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">Ventas Transferencias</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    + ${dataCaja.salesTransfer.toFixed(2)}
                  </span>
                </div>

                {dataCaja.totalIncome > 0 && (
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-600 dark:text-zinc-400 text-sm">Ingresos Extras</span>
                    <span className="font-mono font-bold text-emerald-600">
                      + ${dataCaja.totalIncome.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">Salidas / Gastos</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    - ${dataCaja.totalExpenses.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-zinc-900 dark:text-white">Efectivo Esperado</span>
                  <span className="text-2xl font-black font-mono text-zinc-900 dark:text-white">
                    ${dataCaja.expectedCash.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Diferencias / Cuadre */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex-grow">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>⚖️</span> Diferencias (Cuadre)
                </h3>
              </div>

              <div className="p-6 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Efectivo</span>
                  <span className={`text-sm font-bold ${getDiffColor(cashDiff)}`}>
                    {getDiffText(cashDiff)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Tarjetas</span>
                  <span className={`text-sm font-bold ${getDiffColor(cardDiff)}`}>
                    {getDiffText(cardDiff)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Transferencias</span>
                  <span className={`text-sm font-bold ${getDiffColor(transferDiff)}`}>
                    {getDiffText(transferDiff)}
                  </span>
                </div>

                <div
                  className={`mt-4 p-4 rounded-xl border ${
                    totalDiff === 0
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                      : "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-900 dark:text-white">Diferencia Total</span>
                    <span className={`text-lg font-black ${getDiffColor(totalDiff)}`}>
                      {totalDiff > 0 ? "+" : ""}
                      ${totalDiff.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Movimientos de Caja Registrados */}
        {dataCaja.movements && dataCaja.movements.length > 0 && (
          <div className="mt-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h4 className="font-bold text-base text-zinc-900 dark:text-white mb-4">
              Movimientos de Caja Registrados
            </h4>
            <div className="space-y-2">
              {dataCaja.movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        m.type === "INGRESO"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/60"
                      }`}
                    >
                      {m.type}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{m.concept}</span>
                  </div>
                  <span
                    className={`font-mono font-bold text-sm ${
                      m.type === "INGRESO" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {m.type === "INGRESO" ? "+" : "-"} ${m.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 rounded-xl font-bold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Imprimir Arqueo Previo
          </button>
          <button
            onClick={handleConfirmarCierre}
            disabled={cerrandoCaja}
            className="px-8 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-transform active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>🔒</span> {cerrandoCaja ? "Guardando..." : "Confirmar Cierre de Caja"}
          </button>
        </div>

        {/* MODAL: Registrar Gasto o Ingreso */}
        {mostrarModalMovimiento && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {tipoMovimiento === "GASTO" ? "Registrar Gasto de Caja" : "Registrar Ingreso Extra"}
                </h3>
                <button
                  onClick={() => setMostrarModalMovimiento(false)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarMovimiento} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Concepto o Motivo
                  </label>
                  <input
                    type="text"
                    placeholder={tipoMovimiento === "GASTO" ? "Ej. Compra de agua, insumos de limpieza..." : "Ej. Ingreso cambio, aporte temporal..."}
                    value={conceptoMovimiento}
                    onChange={(e) => setConceptoMovimiento(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium outline-none focus:border-amber-500 dark:text-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Monto ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={montoMovimiento}
                    onChange={(e) => setMontoMovimiento(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base font-bold outline-none focus:border-amber-500 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalMovimiento(false)}
                    className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoMovimiento}
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
                  >
                    {guardandoMovimiento ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Configurar Fondo Inicial */}
        {mostrarModalFondo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl relative">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Fondo Inicial de Caja
                </h3>
                <button
                  onClick={() => setMostrarModalFondo(false)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarFondoInicial} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Monto de Apertura ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={montoFondo}
                    onChange={(e) => setMontoFondo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-lg font-black outline-none focus:border-amber-500 dark:text-white"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalFondo(false)}
                    className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoFondo}
                    className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
                  >
                    {guardandoFondo ? "Guardando..." : "Asignar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Cierre Exitoso */}
        {cierreExitoso && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4">
                ✅
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                ¡Cierre de Caja Registrado!
              </h3>
              <p className="text-xs text-zinc-500 mb-4">El arqueo diario ha sido guardado exitosamente.</p>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-left text-xs space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-zinc-500">N° Comprobante:</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                    {cierreExitoso.requestNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Efectivo Declarado:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    ${parseFloat(cierreExitoso.totalEstimated).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Estado:</span>
                  <span className="font-bold text-emerald-600">{cierreExitoso.status}</span>
                </div>
              </div>

              <button
                onClick={() => setCierreExitoso(null)}
                className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 text-white dark:text-zinc-900 rounded-lg font-bold text-sm transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
