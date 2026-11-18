"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { getClientUserBranch, getClientActiveBranch } from "@/lib/branch";
import { Paginacion, paginarLista } from "@/components/Paginacion";

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
  const [mostrarMetricasMovil, setMostrarMetricasMovil] = useState(false);

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

  const [paginaActual, setPaginaActual] = useState(1);
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filtroEstado]);

  const { itemsPaginados: filtradosPaginados, paginaValida } = paginarLista(
    filtrados,
    paginaActual
  );

  const carteraTotal = creditos.reduce((acc, c) => acc + c.currentBalance, 0);
  const cupoTotalOtorgado = creditos.reduce((acc, c) => acc + c.creditLimit, 0);
  const totalVencidos = creditos.filter((c) => c.status === "VENCIDO").length;

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow px-3.5 py-4 sm:p-6 md:p-8 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-8 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header */}
        <div className="order-1 mb-3.5 sm:mb-8 flex items-center justify-between gap-2">
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
              Créditos
            </h1>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20 shrink-0">
              {creditos.length}
            </span>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 ml-auto">
            <BranchTabs onChange={() => fetchCreditos()} size="sm" />
            <Link
              href="/pos/creditos/nuevo"
              title="Nuevo Crédito"
              aria-label="Nuevo Crédito"
              className="h-9 w-9 sm:w-auto sm:h-10 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nuevo Crédito</span>
            </Link>
          </div>
        </div>

        {/* KPIs / Resumen de Cartera (4 recuadros pequeños en fila en móvil, empiezan ocultos) */}
        <div className={`order-3 sm:order-2 mb-3 sm:mb-8 ${mostrarMetricasMovil ? "block" : "hidden"} sm:block animate-in fade-in slide-in-from-top-1 duration-150`}>
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-4">
            {/* Total Cuentas */}
            <div className="bg-white dark:bg-zinc-900/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs sm:shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-center sm:text-left backdrop-blur-sm">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                💳
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  {creditos.length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-sm font-medium truncate">Cuentas</h3>
              </div>
            </div>

            {/* Cartera por Cobrar */}
            <div className="bg-white dark:bg-zinc-900/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs sm:shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-center sm:text-left backdrop-blur-sm">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                💰
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  ${carteraTotal.toFixed(0)}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-sm font-medium truncate">Por Cobrar</h3>
              </div>
            </div>

            {/* Cupo Otorgado */}
            <div className="bg-white dark:bg-zinc-900/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs sm:shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-center sm:text-left backdrop-blur-sm">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                🛡️
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  ${cupoTotalOtorgado.toFixed(0)}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-sm font-medium truncate">Cupo</h3>
              </div>
            </div>

            {/* Cuentas Vencidas */}
            <div className="bg-white dark:bg-zinc-900/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs sm:shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-center sm:text-left backdrop-blur-sm">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                ⚠️
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-rose-500 dark:text-rose-400 leading-tight truncate">
                  {totalVencidos}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-sm font-medium truncate">Vencidas</h3>
              </div>
            </div>
          </div>
        </div>

        {/* En una sola línea: Buscador + Filtro + Métricas */}
        <div className="order-2 sm:order-3 flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none pointer-events-none">
              🔍
            </span>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cédula o teléfono..."
              className="w-full pl-10 pr-9 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
              title="Filtrar créditos"
              aria-label="Filtrar créditos"
              className={`relative w-11 h-11 sm:w-48 sm:px-4 rounded-xl border text-sm font-normal flex items-center justify-center sm:justify-between transition-all cursor-pointer shadow-xs active:scale-95 ${
                filtroEstado !== "TODOS"
                  ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {filtroEstado !== "TODOS" && (
                <span className="sm:hidden absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-zinc-950" />
              )}
              <span className="hidden sm:inline truncate">
                {filtroEstado === "AL_DIA"
                  ? "Al Día"
                  : filtroEstado === "POR_VENCER"
                  ? "Por Vencer"
                  : filtroEstado === "VENCIDO"
                  ? "Vencidos"
                  : "Estado: Todos"}
              </span>
              <svg className={`hidden sm:block w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMenuAbierto && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setFiltroMenuAbierto(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "TODOS", label: "Todos" },
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
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-medium"
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

          {/* Botón Métricas (solo móvil) */}
          <button
            type="button"
            onClick={() => setMostrarMetricasMovil(!mostrarMetricasMovil)}
            title="Mostrar u ocultar métricas"
            aria-label="Mostrar métricas"
            className={`sm:hidden w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
              mostrarMetricasMovil
                ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>

        {/* Cuentas de Crédito */}
        <div className="order-4 md:bg-white md:dark:bg-zinc-900 md:rounded-2xl md:border md:border-zinc-200 md:dark:border-zinc-800 md:shadow-sm overflow-hidden">
          {cargando ? (
            <div className="p-12 text-center text-zinc-500 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              Cargando cuentas por cobrar...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              No se encontraron cuentas de crédito con los filtros seleccionados.
            </div>
          ) : (
            <>
              {/* Mobile Card List (md:hidden) - Ordenado como Clientes */}
              <div className="space-y-3 md:hidden">
                {filtradosPaginados.map((cuenta) => {
                  const porcentajeUso = Math.min(
                    100,
                    Math.round((cuenta.currentBalance / Math.max(1, cuenta.creditLimit)) * 100)
                  );
                  const esVencido = cuenta.status === "VENCIDO";
                  const cleanPhone = (cuenta.phone || "").replace(/\D/g, "");
                  const waPhone = cleanPhone.startsWith("0")
                    ? `593${cleanPhone.slice(1)}`
                    : cleanPhone.startsWith("593")
                    ? cleanPhone
                    : cleanPhone
                    ? `593${cleanPhone}`
                    : "";

                  return (
                    <div
                      key={cuenta.id}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs transition-colors"
                    >
                      <div className="p-3.5 space-y-3">
                        {/* 1. Inicial, Nombre, Estado y Fecha de Vencimiento */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border ${
                              esVencido
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                            }`}
                          >
                            {(cuenta.customerName || "C").charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {cuenta.customerName}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border shrink-0 ${
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

                            <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                💰 Debe: ${cuenta.currentBalance.toFixed(2)}
                              </span>
                              <span>•</span>
                              <span>📅 Vence: {cuenta.dueDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Dos recuadros: Cédula/RUC y WhatsApp */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-3 py-2">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                              Cédula / RUC
                            </span>
                            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white truncate block">
                              {cuenta.identification || "Sin documento"}
                            </span>
                          </div>

                          {waPhone ? (
                            <a
                              href={`https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 rounded-xl px-3 py-2 block active:scale-98 transition-transform"
                            >
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 block">
                                WhatsApp ↗
                              </span>
                              <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 truncate block">
                                💬 {cuenta.phone}
                              </span>
                            </a>
                          ) : (
                            <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-3 py-2">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                                Teléfono
                              </span>
                              <span className="text-xs text-zinc-400 truncate block">
                                Sin WhatsApp
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 3. Barra de Uso de Cupo y etiquetas deslizables */}
                        <div className="w-full bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-200/70 dark:border-zinc-800">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Uso de cupo: {porcentajeUso}%</span>
                            <span className="text-zinc-500 dark:text-zinc-400 font-mono">Cupo: ${cuenta.creditLimit.toFixed(2)}</span>
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
                      </div>

                      {/* 4. Botones grandes abajo */}
                      <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80">
                        <button
                          type="button"
                          onClick={() => {
                            setCuentaAbono(cuenta);
                            setMontoAbono(cuenta.currentBalance);
                          }}
                          className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 active:bg-cyan-100 transition-colors cursor-pointer"
                        >
                          <span>💵</span>
                          <span>Abonar</span>
                        </button>

                        <Link
                          href={`/pos/creditos/nuevo?id=${cuenta.id}`}
                          className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <span>✏️</span>
                          <span>Editar</span>
                        </Link>

                        <button
                          type="button"
                          disabled={guardando || eliminando}
                          onClick={() => setCreditoAEliminar(cuenta)}
                          className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span>🗑️</span>
                          <span>Eliminar</span>
                        </button>
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
                    {filtradosPaginados.map((cuenta) => {
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
              <Paginacion
                paginaActual={paginaValida}
                totalElementos={filtrados.length}
                onCambiarPagina={setPaginaActual}
              />
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
