"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { getClientUserBranch, getClientActiveBranch } from "@/lib/branch";

interface SaleItem {
  id: string;
  code: string;
  name: string;
  price: number | string;
  quantity: number;
  total: number | string;
}

interface CustomerInfo {
  id: string;
  name: string;
  identification?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  subtotal: number | string;
  tax: number | string;
  discount?: number | string;
  total: number | string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: SaleItem[];
  customer?: CustomerInfo | null;
}

function formatearMontoCorto(val: number): string {
  const n = Math.round(Number(val || 0) * 100) / 100;
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function FacturasPosPage() {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODAS" | "COMPLETADA" | "ANULADA">("TODAS");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [mostrarMetricasMovil, setMostrarMetricasMovil] = useState(false);
  
  // Modales
  const [ventaDetalle, setVentaDetalle] = useState<Sale | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: "anular" | "eliminar"; sale: Sale } | null>(null);

  const [accionEnCurso, setAccionEnCurso] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const [negocio, setNegocio] = useState({
    nombre: "Lubricentro González",
    razonSocial: "Lubricentro González",
    ruc: "1792345678001",
    direccion: "Matriz - Quito, Ecuador",
    telefono: "0991234567",
    iva: 15,
  });

  const ticketRef = useRef<HTMLDivElement>(null);

  // Cargar configuración de negocio
  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        const res = await fetch("/api/gerencia/configuracion");
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setNegocio({
              nombre: data.config.nombreComercial || data.config.razonSocial || "Lubricentro González",
              razonSocial: data.config.razonSocial || "Lubricentro González",
              ruc: data.config.ruc || "1792345678001",
              direccion: data.config.direccion || "Matriz - Quito, Ecuador",
              telefono: data.config.telefono || "0991234567",
              iva: Number(data.config.iva) || 15,
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar ajustes de gerencia:", err);
      }
    }
    cargarConfiguracion();
  }, []);

  // Cargar ventas reales desde Neon
  const cargarVentas = useCallback(async (busqueda = "", silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);
      const activeBr = getClientActiveBranch();
      const uBr = getClientUserBranch();
      const params = new URLSearchParams();
      if (busqueda.trim()) params.set("busqueda", busqueda.trim());
      params.set("sede", activeBr);
      params.set("userBranch", uBr);
      const url = `/api/ventas?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setVentas(data.ventas || []);
      } else {
        setErrorMensaje(data.error || "No se pudieron obtener las facturas.");
      }
    } catch (err: any) {
      console.error("Error al cargar facturas:", err);
      setErrorMensaje("Error de conexión al cargar las facturas.");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  useEffect(() => {
    const handleBranch = () => {
      cargarVentas(searchTerm, true);
    };
    window.addEventListener("autog-branch-change", handleBranch);
    return () => window.removeEventListener("autog-branch-change", handleBranch);
  }, [cargarVentas, searchTerm]);

  // Manejo de búsqueda instantánea
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarVentas(searchTerm, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, cargarVentas]);



  // Ejecutar anulación o eliminación confirmada
  const handleEjecutarConfirmacion = async () => {
    if (!confirmModal) return;
    const { type, sale: v } = confirmModal;
    setConfirmModal(null);
    setAccionEnCurso(true);

    if (type === "anular") {
      try {
        const res = await fetch("/api/ventas", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: v.id, status: "Anulada" }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMensajeExito(`Factura ${v.saleNumber} anulada.`);
          setTimeout(() => setMensajeExito(null), 4000);
          await cargarVentas(searchTerm, true);
          if (ventaDetalle?.id === v.id) {
            setVentaDetalle((prev) => (prev ? { ...prev, status: "Anulada" } : null));
          }
        } else {
          setErrorMensaje(data.error || "No se pudo anular la factura.");
          setTimeout(() => setErrorMensaje(null), 4000);
        }
      } catch (err) {
        console.error("Error al anular factura:", err);
        setErrorMensaje("Error de conexión al anular la factura.");
        setTimeout(() => setErrorMensaje(null), 4000);
      } finally {
        setAccionEnCurso(false);
      }
    } else {
      try {
        const res = await fetch(`/api/ventas?id=${v.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMensajeExito(`Factura ${v.saleNumber} eliminada.`);
          setTimeout(() => setMensajeExito(null), 4000);
          if (ventaDetalle?.id === v.id) setVentaDetalle(null);
          await cargarVentas(searchTerm, true);
        } else {
          setErrorMensaje(data.error || "No se pudo eliminar la factura.");
          setTimeout(() => setErrorMensaje(null), 4000);
        }
      } catch (err) {
        console.error("Error al eliminar venta:", err);
        setErrorMensaje("Error de conexión al eliminar la factura.");
        setTimeout(() => setErrorMensaje(null), 4000);
      } finally {
        setAccionEnCurso(false);
      }
    }
  };



  const handleImprimir = () => {
    window.print();
  };

  // Filtrado por estado
  const ventasFiltradas = ventas.filter((v) => {
    if (filtroEstado === "COMPLETADA") return v.status?.toLowerCase() !== "anulada";
    if (filtroEstado === "ANULADA") return v.status?.toLowerCase() === "anulada";
    return true;
  });

  // Estadísticas en tiempo real
  const totalFacturado = ventas
    .filter((v) => v.status?.toLowerCase() !== "anulada")
    .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

  const totalCompletadas = ventas.filter((v) => v.status?.toLowerCase() !== "anulada").length;
  const totalAnuladas = ventas.filter((v) => v.status?.toLowerCase() === "anulada").length;

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-0 print:pb-0">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-grow px-3.5 py-4 sm:p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0">
        {/* Cabecera / Navegación */}
        <div className="print:hidden flex flex-col">
          {/* Header - Idéntico al estilo Venta (Móvil y Escritorio en una sola fila) */}
          <div className="order-1 mb-3 sm:mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link 
                href="/pos"
                title="Volver a Panel POS"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                Facturas
              </h1>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20 shrink-0">
                {ventas.length}
              </span>
            </div>

            <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0 ml-auto">
              <BranchTabs onChange={() => cargarVentas(searchTerm, true)} size="sm" />
              <Link
                href="/pos/facturas/nueva"
                title="Nueva Factura"
                aria-label="Nueva Factura"
                className="h-9 w-9 sm:w-auto sm:h-10 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Nueva Factura</span>
              </Link>
            </div>
          </div>

          {/* Notificaciones */}
          {mensajeExito && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
              <span>✓ {mensajeExito}</span>
              <button
                onClick={() => setMensajeExito(null)}
                className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {errorMensaje && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
              <span>⚠️ {errorMensaje}</span>
              <button
                onClick={() => setErrorMensaje(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Métricas: en móvil con el icono 📊, en escritorio siempre visibles */}
          <div className={`order-3 sm:order-2 mb-3 sm:mb-8 ${mostrarMetricasMovil ? "block" : "hidden"} sm:block`}>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {[
                { icono: "💰", valor: `$${formatearMontoCorto(totalFacturado)}`, label: "Facturado", cls: "bg-cyan-500/15 border-cyan-500/25 text-cyan-500 dark:text-cyan-400", txt: "text-zinc-900 dark:text-white" },
                { icono: "✅", valor: String(totalCompletadas), label: "Completadas", cls: "bg-emerald-500/15 border-emerald-500/25 text-emerald-500 dark:text-emerald-400", txt: "text-emerald-600 dark:text-emerald-400" },
                { icono: "⚠️", valor: String(totalAnuladas), label: "Anuladas", cls: "bg-rose-500/15 border-rose-500/25 text-rose-500 dark:text-rose-400", txt: "text-rose-500 dark:text-rose-400" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-white dark:bg-zinc-900/80 p-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-center sm:text-left min-w-0"
                >
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border flex items-center justify-center text-base sm:text-xl shrink-0 ${m.cls}`}>
                    {m.icono}
                  </div>
                  <div className="min-w-0 max-w-full">
                    <p className={`text-base sm:text-2xl font-bold leading-tight tabular-nums truncate ${m.txt}`}>
                      {m.valor}
                    </p>
                    <h3 className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-sm font-medium truncate">{m.label}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="order-2 sm:order-3 flex flex-row items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
            <div className="relative min-w-0 flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
                🔍
              </span>
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm [&::-webkit-search-cancel-button]:hidden"
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

            <div className="relative sm:w-48 shrink-0 flex items-center gap-2">
              {/* Filtro: icono en móvil, desplegable con texto en escritorio */}
              <button
                type="button"
                onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
                title="Filtrar"
                aria-label="Filtrar"
                className={`relative w-11 sm:w-full h-11 sm:px-4 rounded-xl border text-sm font-normal flex items-center justify-center sm:justify-between transition-all cursor-pointer shadow-sm active:scale-95 ${
                  filtroEstado !== "TODAS"
                    ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18l-7 8.25V19.5l-4 1.5v-8.25L3 4.5Z" />
                </svg>
                {filtroEstado !== "TODAS" && (
                  <span className="sm:hidden absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-zinc-950" />
                )}
                <span className="hidden sm:inline">
                  {filtroEstado === "COMPLETADA"
                    ? "Completadas"
                    : filtroEstado === "ANULADA"
                    ? "Anuladas"
                    : "Estado"}
                </span>
                <svg className={`hidden sm:block w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Métricas: solo móvil */}
              <button
                type="button"
                onClick={() => setMostrarMetricasMovil((v) => !v)}
                title="Métricas"
                aria-label="Métricas"
                className={`sm:hidden w-11 h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                  mostrarMetricasMovil
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M8 17v-5m4 5V8m4 9v-3" />
                </svg>
              </button>

              {filtroMenuAbierto && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setFiltroMenuAbierto(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-52 sm:w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {[
                      { id: "TODAS", label: "Todas" },
                      { id: "COMPLETADA", label: "Completadas" },
                      { id: "ANULADA", label: "Anuladas" },
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
                            ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-normal"
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
        </div>

        {/* Lista / Tabla de Facturas */}
        <div className="order-4 print:hidden">
          {cargando ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Cargando facturas...
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              No se encontraron facturas con los criterios seleccionados.
            </div>
          ) : (
            <>
              {/* Vista Móvil (Tarjetas adaptadas con orden idéntico a Clientes) */}
              <div className="md:hidden space-y-3.5">
                {ventasFiltradas.map((v) => {
                  const esAnulada = v.status?.toLowerCase() === "anulada";
                  const fecha = new Date(v.createdAt).toLocaleDateString("es-EC", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={v.id}
                      className={`bg-white dark:bg-zinc-900 rounded-2xl border shadow-xs overflow-hidden transition-colors ${
                        esAnulada ? "border-rose-200 dark:border-rose-500/25" : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {/* Fila 1: Icono + Cliente + Estado / Total */}
                      <div className="p-3.5 flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 border ${
                            esAnulada
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                          }`}
                        >
                          🧾
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[15px] leading-tight text-zinc-900 dark:text-zinc-100 truncate">
                            {v.customerName || "Consumidor Final"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">#{v.saleNumber}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide border ${
                                esAnulada
                                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {esAnulada ? "Anulada" : "Completada"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-black font-mono tabular-nums leading-tight ${esAnulada ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-white"}`}>
                            ${formatearMontoCorto(Number(v.total || 0))}
                          </p>
                          <p className="text-[11px] text-zinc-400 whitespace-nowrap">{fecha}</p>
                        </div>
                      </div>

                      {/* Fila 2: Datos ordenados (Documento / Pago) */}
                      <div className="px-3.5 pb-3 grid grid-cols-2 gap-2">
                        <div className="min-w-0 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Cédula / RUC</p>
                          <p className="text-[13px] font-mono font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {v.customer?.identification && !v.customer.identification.startsWith("CLI-") ? v.customer.identification : "—"}
                          </p>
                        </div>
                        <div className="min-w-0 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Pago</p>
                          <p className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {v.paymentMethod?.toLowerCase().includes("mixto")
                              ? "🔀"
                              : v.paymentMethod?.toLowerCase().includes("crédito") || v.paymentMethod?.toLowerCase().includes("credito")
                              ? "📋"
                              : v.paymentMethod?.toLowerCase().includes("tarjeta")
                              ? "💳"
                              : v.paymentMethod?.toLowerCase().includes("transf")
                              ? "🏦"
                              : "💵"}{" "}
                            {v.paymentMethod || "Efectivo"}
                          </p>
                        </div>
                      </div>

                      {/* Fila 3: Acción (zona táctil amplia) */}
                      <div className="flex items-stretch border-t border-zinc-100 dark:border-zinc-800">
                        <Link
                          href={`/pos/facturas/editar?id=${v.id}`}
                          className="flex-1 h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 active:bg-blue-50 dark:active:bg-blue-500/10 transition-colors cursor-pointer"
                          title="Editar factura"
                          aria-label="Editar factura"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Ver / Editar</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vista Desktop (Tabla) */}
              <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3.5 px-4"># Factura</th>
                        <th className="py-3.5 px-4">Fecha y Hora</th>
                        <th className="py-3.5 px-4">Cliente</th>
                        <th className="py-3.5 px-4">Método</th>
                        <th className="py-3.5 px-4 text-right">Total</th>
                        <th className="py-3.5 px-4 text-center">Estado</th>
                        <th className="py-3.5 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {ventasFiltradas.map((v) => {
                        const esAnulada = v.status?.toLowerCase() === "anulada";
                        const fecha = new Date(v.createdAt).toLocaleString("es-EC", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <tr
                            key={v.id}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                              {v.saleNumber}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                              {fecha}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                              <div>{v.customerName || "Consumidor Final"}</div>
                              {v.customer?.identification && (
                                <span className="text-[11px] text-zinc-400 font-mono">
                                  CI: {v.customer.identification}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                                {v.paymentMethod || "Efectivo"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                              ${Number(v.total || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  esAnulada
                                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {esAnulada ? "Anulada" : "Completada"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {/* Editar (Solo icono, en otra pagina) */}
                                <Link
                                  href={`/pos/facturas/editar?id=${v.id}`}
                                  className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                  title="Editar factura"
                                  aria-label="Editar factura"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>



        {/* Modal de Detalle / Factura Formato A4 (READ & PRINT) */}
        {ventaDetalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto print:static print:inset-auto print:p-0 print:bg-transparent print:backdrop-blur-none print:overflow-visible print:block print:w-full">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm 12mm 12mm 12mm;
                }
                body {
                  background: white !important;
                  color: black !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
              }
            `}} />

            <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-3 sm:p-5 max-w-4xl w-full shadow-2xl relative my-auto flex flex-col max-h-[94vh] border border-zinc-200 dark:border-zinc-800 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:bg-white print:text-black print:rounded-none print:max-h-none print:overflow-visible">
              
              {/* Header Modal (Oculto al imprimir) */}
              <div className="flex items-center justify-between pb-3 px-2 print:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-blue-600/15 text-blue-500 flex items-center justify-center text-sm font-bold">
                    📄
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                      Factura #{ventaDetalle.saleNumber}
                    </h3>
                    <p className="text-[11px] text-zinc-500">Vista previa de impresión en formato A4</p>
                  </div>
                </div>
                <button
                  onClick={() => setVentaDetalle(null)}
                  className="w-8 h-8 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
                  title="Cerrar vista previa"
                >
                  ✕
                </button>
              </div>

              {/* Hoja de Factura A4 Imprimible */}
              <div className="overflow-y-auto flex-grow rounded-xl bg-white text-zinc-900 shadow-sm print:shadow-none print:overflow-visible print:h-auto">
                <div
                  ref={ticketRef}
                  className="w-full bg-white text-zinc-900 p-6 sm:p-8 font-sans print:p-0 print:m-0 text-xs"
                >
                  {/* 1. Encabezado A4 (Emisor + Recuadro Factura) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pb-6 border-b border-zinc-200">
                    {/* Emisor */}
                    <div className="sm:col-span-7 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                          ⚙️
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-zinc-900 tracking-tight leading-tight uppercase">
                            {negocio.nombre}
                          </h2>
                          <p className="text-xs text-zinc-500 font-medium">{negocio.razonSocial}</p>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-600 pt-1 space-y-0.5">
                        <p>
                          <span className="font-semibold text-zinc-800">Dirección Matriz:</span> {negocio.direccion}
                        </p>
                        <p>
                          <span className="font-semibold text-zinc-800">Teléfono:</span> {negocio.telefono}
                        </p>
                        <p>
                          <span className="font-semibold text-zinc-800">Obligado a llevar contabilidad:</span> NO
                        </p>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          CONTRIBUYENTE RÉGIMEN GENERAL / RIMPE
                        </p>
                      </div>
                    </div>

                    {/* Recuadro Factura SRI / Formal */}
                    <div className="sm:col-span-5 border border-zinc-300 rounded-xl p-4 bg-zinc-50/60 print:bg-white flex flex-col justify-between space-y-2.5">
                      <div>
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                          R.U.C.
                        </span>
                        <span className="text-sm font-bold font-mono text-zinc-900">
                          {negocio.ruc}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                            FACTURA No.
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ventaDetalle.status?.toLowerCase() === "anulada"
                                ? "bg-rose-100 text-rose-700 border border-rose-300"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            }`}
                          >
                            {ventaDetalle.status?.toUpperCase() || "COMPLETADA"}
                          </span>
                        </div>
                        <span className="text-lg font-black font-mono text-blue-600 print:text-zinc-900 block">
                          #{ventaDetalle.saleNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-zinc-200">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Fecha de Emisión:</span>
                          <span className="font-medium text-zinc-800 text-[11px]">
                            {new Date(ventaDetalle.createdAt).toLocaleDateString("es-EC", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Hora:</span>
                          <span className="font-medium text-zinc-800 text-[11px]">
                            {new Date(ventaDetalle.createdAt).toLocaleTimeString("es-EC", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Datos del Cliente (Recuadro formal y limpio) */}
                  <div className="my-5 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 print:bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[11px] font-medium">Razón Social / Nombres:</span>
                      <span className="font-bold text-zinc-900 text-sm">
                        {ventaDetalle.customerName || "Consumidor Final"}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[11px] font-medium">Identificación (RUC / C.I.):</span>
                      <span className="font-semibold text-zinc-800 font-mono">
                        {ventaDetalle.customer?.identification || "9999999999999"}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[11px] font-medium">Forma de Pago:</span>
                      <span className="font-semibold text-zinc-800">
                        {ventaDetalle.paymentMethod || "Efectivo"}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[11px] font-medium">Teléfono / WhatsApp:</span>
                      <span className="text-zinc-800">{ventaDetalle.customer?.phone || "N/A"}</span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-zinc-500 block text-[11px] font-medium">Dirección:</span>
                      <span className="text-zinc-800">{ventaDetalle.customer?.address || "Quito, Ecuador"}</span>
                    </div>
                  </div>

                  {/* 3. Tabla de Productos y Servicios Formato A4 */}
                  <div className="rounded-xl border border-zinc-200 overflow-hidden mb-6">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200 uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">Cant.</th>
                          <th className="py-2.5 px-3 w-28">Código</th>
                          <th className="py-2.5 px-3">Descripción</th>
                          <th className="py-2.5 px-3 w-24 text-right">P. Unitario</th>
                          <th className="py-2.5 px-3 w-20 text-right">Desc.</th>
                          <th className="py-2.5 px-3 w-24 text-right">Precio Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-zinc-800">
                        {ventaDetalle.items?.map((item, idx) => {
                          const qty = Number(item.quantity || 1);
                          const price = Number(item.price || 0);
                          const totalLine = Number(item.total || qty * price);
                          return (
                            <tr key={idx} className="hover:bg-zinc-50/60 transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold">{qty}</td>
                              <td className="py-2.5 px-3 font-mono text-zinc-600">{item.code || "SRV"}</td>
                              <td className="py-2.5 px-3 font-medium text-zinc-900">{item.name}</td>
                              <td className="py-2.5 px-3 text-right font-mono">${price.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-500">$0.00</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">
                                ${totalLine.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Pie de Factura y Desglose de Totales A4 */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-1">
                    {/* Información adicional */}
                    <div className="md:col-span-7 space-y-3">
                      <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/40 text-xs text-zinc-600 space-y-1.5">
                        <p className="font-bold text-zinc-800 text-[11px] uppercase tracking-wider">
                          Información Adicional
                        </p>
                        <p>
                          <span className="font-semibold text-zinc-700">Forma de Pago:</span>{" "}
                          {ventaDetalle.paymentMethod || "Efectivo"} - Sin utilización del sistema financiero
                        </p>
                        <p>
                          <span className="font-semibold text-zinc-700">Correo Electrónico:</span>{" "}
                          {ventaDetalle.customer?.email || "N/A"}
                        </p>
                        <p className="text-[11px] text-zinc-500 pt-1">
                          Comprobante emitido con validez tributaria y contable. Gracias por su preferencia.
                        </p>
                      </div>
                    </div>

                    {/* Resumen de Valores (Caja derecha de Totales) */}
                    <div className="md:col-span-5 rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-200 text-xs">
                      <div className="flex justify-between py-2 px-3.5 bg-zinc-50/50">
                        <span className="text-zinc-600 font-medium">SUBTOTAL 15%:</span>
                        <span className="font-mono font-semibold text-zinc-900">
                          ${Number(ventaDetalle.subtotal || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 px-3.5 bg-zinc-50/50">
                        <span className="text-zinc-600 font-medium">SUBTOTAL 0%:</span>
                        <span className="font-mono font-semibold text-zinc-900">$0.00</span>
                      </div>
                      {Number(ventaDetalle.discount || 0) > 0 && (
                        <div className="flex justify-between py-2 px-3.5 bg-zinc-50/50 text-emerald-600">
                          <span className="font-medium">DESCUENTO:</span>
                          <span className="font-mono font-semibold">
                            -${Number(ventaDetalle.discount).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 px-3.5 bg-zinc-50/50">
                        <span className="text-zinc-600 font-medium">IVA ({negocio.iva}%):</span>
                        <span className="font-mono font-semibold text-zinc-900">
                          ${Number(ventaDetalle.tax || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2.5 px-3.5 bg-zinc-100 font-bold text-sm">
                        <span className="text-zinc-900">VALOR TOTAL:</span>
                        <span className="font-mono text-base text-blue-600 print:text-zinc-900">
                          ${Number(ventaDetalle.total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Pie de Página A4 */}
                  <div className="mt-8 pt-3 border-t border-zinc-200 text-center text-[10px] text-zinc-400">
                    Documento generado electrónicamente • Sistema AutoG POS • Formato A4
                  </div>
                </div>
              </div>

              {/* Botones de acción del Modal (Ocultos al imprimir) */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 px-1 print:hidden">
                <button
                  type="button"
                  onClick={handleImprimir}
                  className="flex-1 min-w-[130px] h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🖨️</span>
                  <span>Imprimir A4</span>
                </button>
                <Link
                  href={`/pos/facturas/editar?id=${ventaDetalle.id}`}
                  className="h-11 px-4 rounded-xl bg-zinc-200/80 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Editar</span>
                </Link>
                {ventaDetalle.status?.toLowerCase() !== "anulada" && (
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ type: "anular", sale: ventaDetalle })}
                    disabled={accionEnCurso}
                    className="h-11 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span>🚫</span>
                    <span>Anular</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmModal({ type: "eliminar", sale: ventaDetalle })}
                  disabled={accionEnCurso}
                  className="h-11 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Eliminar factura"
                >
                  <span>🗑️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVentaDetalle(null)}
                  className="px-4 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 font-semibold text-xs cursor-pointer flex items-center justify-center transition-colors"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODAL CONFIRMACIÓN (ANULAR / ELIMINAR) */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#0f141d] border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.type === "anular"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}>
                  {confirmModal.type === "anular" ? (
                    <span className="text-lg">🚫</span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </div>
                <h3 className="text-base font-bold text-white capitalize">{confirmModal.type}</h3>
              </div>

              <p className="text-sm text-zinc-300">
                ¿{confirmModal.type === "anular" ? "Anular" : "Eliminar"}{" "}
                <span className="font-bold text-white font-mono">{confirmModal.sale.saleNumber}</span>?
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  disabled={accionEnCurso}
                  className="h-10 rounded-xl border border-zinc-700 text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={accionEnCurso}
                  onClick={handleEjecutarConfirmacion}
                  className={`h-10 rounded-xl text-white text-xs font-bold active:scale-95 disabled:opacity-50 transition cursor-pointer ${
                    confirmModal.type === "anular"
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {accionEnCurso ? "..." : confirmModal.type === "anular" ? "Anular" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="print:hidden">
        <PosMobileNav />
      </div>
    </div>
  );
}
