"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { getClientUserBranch, getClientActiveBranch } from "@/lib/branch";

interface CreditAccount {
  id: string;
  customerName: string;
  identification: string;
  phone: string;
  creditLimit: number;
  currentBalance: number;
  dueDate: string;
  status: "AL_DIA" | "POR_VENCER" | "VENCIDO";
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  notes?: string;
}

export default function CreditosPage() {
  const [creditos, setCreditos] = useState<CreditAccount[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "AL_DIA" | "POR_VENCER" | "VENCIDO">("TODOS");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);

  // Modal registrar abono (PUT)
  const [cuentaAbono, setCuentaAbono] = useState<CreditAccount | null>(null);
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [metodoAbono, setMetodoAbono] = useState("Efectivo");
  const [notaAbono, setNotaAbono] = useState("");


  // Modal Flotante de Confirmación de Eliminación
  const [creditoAEliminar, setCreditoAEliminar] = useState<CreditAccount | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchCreditos = useCallback(async () => {
    try {
      setCargando(true);
      const activeBr = getClientActiveBranch();
      const uBr = getClientUserBranch();
      const params = new URLSearchParams();
      params.set("sede", activeBr);
      params.set("userBranch", uBr);
      params.set("t", Date.now().toString());
      const res = await fetch(`/api/pos/creditos?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.creditos)) {
        setCreditos(data.creditos);
      }
    } catch (err) {
      console.error("Error cargando créditos desde base de datos:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const handleBranch = () => {
      fetchCreditos();
    };
    window.addEventListener("autog-branch-change", handleBranch);
    return () => window.removeEventListener("autog-branch-change", handleBranch);
  }, [fetchCreditos]);

  useEffect(() => {
    fetchCreditos();
  }, [fetchCreditos]);

  // REGISTRAR ABONO EN NEON DB (PUT /api/pos/creditos)
  const handleAplicarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaAbono || montoAbono <= 0) return;

    if (montoAbono > cuentaAbono.currentBalance) {
      alert("El monto de abono no puede ser mayor a la deuda actual.");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/pos/creditos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cuentaAbono.id,
          paymentAmount: Number(montoAbono),
          paymentMethod: metodoAbono,
          paymentNote: notaAbono,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al aplicar abono");
      }

      setCuentaAbono(null);
      setMontoAbono(0);
      setNotaAbono("");
      await fetchCreditos();
    } catch (err: any) {
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };


  // CONFIRMAR ELIMINAR CRÉDITO EN NEON DB (DELETE)
  const confirmarEliminarCredito = async () => {
    if (!creditoAEliminar) return;
    const itemAEliminar = creditoAEliminar;
    setEliminando(true);

    // Actualización optimista inmediata en la UI
    setCreditos((prev) => prev.filter((c) => c.id !== itemAEliminar.id));
    setCreditoAEliminar(null);

    try {
      const res = await fetch(
        `/api/pos/creditos?id=${encodeURIComponent(itemAEliminar.id)}`,
        { 
          method: "DELETE",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar cuenta de crédito");
      }
      await fetchCreditos();
    } catch (err: any) {
      console.error("Error al eliminar crédito:", err);
      await fetchCreditos();
    } finally {
      setEliminando(false);
    }
  };

  const filtrados = creditos.filter((c) => {
    const coincideTexto =
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.identification.includes(searchTerm) ||
      c.phone.includes(searchTerm);

    if (!coincideTexto) return false;
    if (filtroEstado !== "TODOS" && c.status !== filtroEstado) return false;
    return true;
  });

  const carteraTotal = creditos.reduce((acc, c) => acc + c.currentBalance, 0);
  const cupoTotalOtorgado = creditos.reduce((acc, c) => acc + c.creditLimit, 0);
  const totalVencidos = creditos.filter((c) => c.status === "VENCIDO").length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header */}
        <div className="order-1 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/pos"
              title="Volver a Panel POS"
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Créditos
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              {creditos.length}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2 w-full sm:w-auto sm:ml-auto">
            <BranchTabs onChange={() => fetchCreditos()} size="sm" />
            <Link
              href="/pos/creditos/nuevo"
              className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nuevo Crédito</span>
            </Link>
          </div>
        </div>


        {/* KPIs / Resumen de Cartera Desplegable en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Cartera por Cobrar */}
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center text-xl shrink-0">
                💰
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  ${carteraTotal.toFixed(2)}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Por Cobrar</h3>
              </div>
            </div>

            {/* Cupo Otorgado */}
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                🛡️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  ${cupoTotalOtorgado.toFixed(2)}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Cupo Otorgado</h3>
              </div>
            </div>

            {/* Cuentas Vencidas */}
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-rose-500 dark:text-rose-400">
                  {totalVencidos}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Cuentas Vencidas</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Buscador y Filtros */}
        <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm"
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

          <div className="relative w-full sm:w-48 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <span>
                {filtroEstado === "AL_DIA"
                  ? "Al Día"
                  : filtroEstado === "POR_VENCER"
                  ? "Por Vencer"
                  : filtroEstado === "VENCIDO"
                  ? "Vencidos"
                  : "Estado"}
              </span>
              <svg className={`w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMenuAbierto && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setFiltroMenuAbierto(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "TODOS", label: "Estado" },
                    { id: "AL_DIA", label: "Al Día" },
                    { id: "POR_VENCER", label: "Por Vencer" },
                    { id: "VENCIDO", label: "Vencidos" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setFiltroEstado(opcion.id as any);
                        setFiltroMenuAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        filtroEstado === opcion.id
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opcion.label}</span>
                      {filtroEstado === opcion.id && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Cuentas de Crédito */}
        <div className="order-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {cargando ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Cargando cuentas por cobrar...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No se encontraron cuentas de crédito con los filtros seleccionados.
            </div>
          ) : (
            <>
              {/* Mobile Card List (md:hidden) */}
              <div className="space-y-3.5 p-3 sm:p-4 md:hidden">
                {filtrados.map((cuenta) => {
                  const porcentajeUso = Math.min(
                    100,
                    Math.round((cuenta.currentBalance / Math.max(1, cuenta.creditLimit)) * 100)
                  );
                  const esVencido = cuenta.status === "VENCIDO";

                  return (
                    <div
                      key={cuenta.id}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
                              esVencido
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                            }`}
                          >
                            💳
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {cuenta.customerName}
                              </p>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                                  cuenta.status === "AL_DIA"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : cuenta.status === "POR_VENCER"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                }`}
                              >
                                {cuenta.status === "AL_DIA"
                                  ? "Al Día"
                                  : cuenta.status === "POR_VENCER"
                                  ? "Por Vencer"
                                  : "Vencido"}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">ID: {cuenta.identification}</span>
                              {cuenta.phone && <span> • 📞 {cuenta.phone}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Acciones Rápidas (Toque táctil >= 44px) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCuentaAbono(cuenta);
                              setMontoAbono(cuenta.currentBalance);
                            }}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer border border-cyan-200 dark:border-cyan-500/30"
                            title="Abonar a la cuenta"
                            aria-label="Abonar a la cuenta"
                          >
                            💵
                          </button>
                          <Link
                            href={`/pos/creditos/nuevo?id=${cuenta.id}`}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-95 transition-all"
                            title="Editar línea de crédito"
                            aria-label="Editar crédito"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Link>
                          <button
                            type="button"
                            disabled={guardando || eliminando}
                            onClick={() => setCreditoAEliminar(cuenta)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all disabled:opacity-50"
                            title="Eliminar crédito"
                            aria-label="Eliminar crédito"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Barra de Uso de Cupo */}
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-lg p-2.5 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium">Uso: {porcentajeUso}%</span>
                          <span className="text-zinc-400 font-mono">Cupo: ${cuenta.creditLimit.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              porcentajeUso > 90
                                ? "bg-rose-500"
                                : porcentajeUso > 70
                                ? "bg-amber-500"
                                : "bg-cyan-500"
                            }`}
                            style={{ width: `${porcentajeUso}%` }}
                          />
                        </div>
                      </div>

                      {/* Datos secundarios (Total Deuda, Cupo, Vencimiento) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-500/20 font-bold font-mono text-xs">
                          💰 Debe: ${cuenta.currentBalance.toFixed(2)}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 text-xs font-medium">
                          📅 Vence: {cuenta.dueDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Cliente</th>
                      <th className="py-3.5 px-4">RUC / Cédula</th>
                      <th className="py-3.5 px-4">Uso de Cupo</th>
                      <th className="py-3.5 px-4 text-right">Saldo Deudor</th>
                      <th className="py-3.5 px-4">Vencimiento</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filtrados.map((cuenta) => {
                      const porcentajeUso = Math.min(
                        100,
                        Math.round((cuenta.currentBalance / Math.max(1, cuenta.creditLimit)) * 100)
                      );

                      return (
                        <tr
                          key={cuenta.id}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                            <div>{cuenta.customerName}</div>
                            <span className="text-xs font-normal text-zinc-400">
                              📞 {cuenta.phone}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                            {cuenta.identification}
                          </td>
                          <td className="py-3.5 px-4 min-w-[160px]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-zinc-500 font-semibold">{porcentajeUso}%</span>
                              <span className="text-zinc-400">Cupo: ${cuenta.creditLimit}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  porcentajeUso > 90
                                    ? "bg-rose-500"
                                    : porcentajeUso > 70
                                    ? "bg-amber-500"
                                    : "bg-cyan-500"
                                }`}
                                style={{ width: `${porcentajeUso}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-zinc-900 dark:text-white text-base">
                            ${cuenta.currentBalance.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-xs">
                            {cuenta.dueDate}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                cuenta.status === "AL_DIA"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : cuenta.status === "POR_VENCER"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              }`}
                            >
                              {cuenta.status === "AL_DIA"
                                ? "Al Día"
                                : cuenta.status === "POR_VENCER"
                                ? "Por Vencer"
                                : "Vencido"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setCuentaAbono(cuenta);
                                  setMontoAbono(cuenta.currentBalance);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                              >
                                Abonar
                              </button>
                              <Link
                                href={`/pos/creditos/nuevo?id=${cuenta.id}`}
                                className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer flex items-center justify-center"
                                title="Editar línea de crédito"
                              >
                                ✏️
                              </Link>
                              <button
                                type="button"
                                disabled={guardando || eliminando}
                                onClick={() => setCreditoAEliminar(cuenta)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer active:scale-95"
                                title="Eliminar crédito"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Registrar Abono */}
        {cuentaAbono && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>💵</span>
                  <span>Registrar Abono a Cuenta</span>
                </h3>
                <button
                  onClick={() => setCuentaAbono(null)}
                  className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Cliente:</p>
                <p className="font-bold text-zinc-900 dark:text-white text-sm">
                  {cuentaAbono.customerName}
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-cyan-500/20 text-xs">
                  <span className="text-zinc-500">Saldo pendiente:</span>
                  <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm">
                    ${cuentaAbono.currentBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleAplicarAbono} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Monto a Abonar ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={cuentaAbono.currentBalance}
                    required
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(Number(e.target.value))}
                    className="w-full px-3.5 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold text-lg text-cyan-600 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setMontoAbono(cuentaAbono.currentBalance)}
                      className="h-9 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-200 active:scale-95 flex items-center justify-center"
                    >
                      Pagar Total (${cuentaAbono.currentBalance})
                    </button>
                    {cuentaAbono.currentBalance > 50 && (
                      <button
                        type="button"
                        onClick={() => setMontoAbono(Math.round(cuentaAbono.currentBalance / 2))}
                        className="h-9 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-200 active:scale-95 flex items-center justify-center"
                      >
                        50%
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={metodoAbono}
                    onChange={(e) => setMetodoAbono(e.target.value)}
                    className="w-full px-3.5 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none text-base sm:text-sm"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Referencia / Nota (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notaAbono}
                    onChange={(e) => setNotaAbono(e.target.value)}
                    placeholder="Comprobante # o notas adicionales..."
                    className="w-full px-3.5 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none text-base sm:text-sm"
                  />
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex-1 h-11 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center active:scale-98"
                  >
                    {guardando ? "Procesando..." : "Registrar Abono"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCuentaAbono(null)}
                    className="px-5 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 font-semibold text-sm cursor-pointer flex items-center justify-center"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Modal Flotante de Confirmación de Eliminación */}
        {creditoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-150 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-xl mx-auto mb-3">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                ¿Eliminar crédito?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                Se eliminará la cuenta de <strong className="text-zinc-900 dark:text-white font-medium">{creditoAEliminar.customerName}</strong>.
                {creditoAEliminar.currentBalance > 0 && (
                  <span className="block mt-2 text-xs font-semibold text-rose-500">
                    ⚠️ Deuda: ${creditoAEliminar.currentBalance.toFixed(2)}
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreditoAEliminar(null)}
                  disabled={eliminando}
                  className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminarCredito}
                  disabled={eliminando}
                  className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-rose-500/20"
                >
                  {eliminando ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Nav for Mobile */}
      <PosMobileNav />
    </div>
  );
}
