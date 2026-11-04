"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
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

export default function FacturasPosPage() {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODAS" | "COMPLETADA" | "ANULADA">("TODAS");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  
  // Modales
  const [ventaDetalle, setVentaDetalle] = useState<Sale | null>(null);

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



  // UPDATE: Anular venta en Neon y devolver inventario
  const handleAnular = async (v: Sale) => {
    if (
      !confirm(
        `¿Seguro de anular la factura ${v.saleNumber}? Se reincorporará el stock de ${v.items?.length || 0} producto(s) y se ajustará el cuadre de caja si fue en efectivo.`
      )
    ) {
      return;
    }

    try {
      setAccionEnCurso(true);
      const res = await fetch("/api/ventas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: v.id, status: "Anulada" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`Factura ${v.saleNumber} anulada e inventario reabastecido.`);
        setTimeout(() => setMensajeExito(null), 4000);
        await cargarVentas(searchTerm, true);
        if (ventaDetalle?.id === v.id) {
          setVentaDetalle((prev) => (prev ? { ...prev, status: "Anulada" } : null));
        }
      } else {
        alert(data.error || "No se pudo anular la factura.");
      }
    } catch (err) {
      console.error("Error al anular factura:", err);
      alert("Error de conexión al anular la factura.");
    } finally {
      setAccionEnCurso(false);
    }
  };

  // DELETE: Eliminar venta definitivamente de Neon
  const handleEliminar = async (v: Sale) => {
    if (
      !confirm(
        `⚠️ ATENCIÓN: ¿Deseas ELIMINAR definitivamente la factura ${v.saleNumber}? Esta acción borrará el registro y sus líneas de detalle de forma permanente.`
      )
    ) {
      return;
    }

    try {
      setAccionEnCurso(true);
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
        alert(data.error || "No se pudo eliminar la factura.");
      }
    } catch (err) {
      console.error("Error al eliminar venta:", err);
      alert("Error de conexión al eliminar la factura.");
    } finally {
      setAccionEnCurso(false);
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0">
        {/* Cabecera / Navegación */}
        <div className="print:hidden flex flex-col">
          {/* Header - Idéntico al estilo Venta (Móvil y Escritorio en una sola fila) */}
          <div className="order-1 mb-4 sm:mb-8 flex items-center justify-between gap-3">
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
                Historial
              </h1>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20 shrink-0">
                {ventas.length}
              </span>
              <BranchTabs onChange={() => cargarVentas(searchTerm, true)} size="sm" />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/pos/facturas/nueva"
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nueva Factura</span>
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

          {/* KPIs / Resumen Desplegable en Móvil */}
          <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
              {/* Facturado */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center text-xl shrink-0">
                  💰
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    ${totalFacturado.toFixed(2)}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Facturado</h3>
                </div>
              </div>

              {/* Facturas Válidas */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                  ✅
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {totalCompletadas}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Completadas</h3>
                </div>
              </div>

              {/* Anuladas */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center text-xl shrink-0">
                  ⚠️
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-rose-500 dark:text-rose-400">
                    {totalAnuladas}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Anuladas</h3>
                </div>
              </div>
            </div>
          </CollapsibleMetrics>

          {/* Filtros y Buscador */}
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
                  {filtroEstado === "COMPLETADA"
                    ? "Completadas"
                    : filtroEstado === "ANULADA"
                    ? "Anuladas"
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
                      { id: "TODAS", label: "Estado" },
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
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Icono de factura estilo cliente */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
                              esAnulada
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                            }`}
                          >
                            🧾
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {v.customerName || "Consumidor Final"}
                              </p>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                                  esAnulada
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                }`}
                              >
                                {esAnulada ? "Anulada" : "Completada"}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">#{v.saleNumber}</span>
                              {v.customer?.identification && !v.customer.identification.startsWith("CLI-") && (
                                <span> • CI: {v.customer.identification}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Acciones Rápidas */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/pos/facturas/editar?id=${v.id}`}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-95 transition-all cursor-pointer"
                            title="Editar factura"
                            aria-label="Editar factura"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Link>
                        </div>
                      </div>

                      {/* Datos secundarios (Total, Método de pago, Fecha) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-500/20 font-bold font-mono text-xs">
                          💰 ${Number(v.total || 0).toFixed(2)}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 text-xs font-medium">
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
                        </span>

                        <span className="text-zinc-400 ml-auto text-[11px] whitespace-nowrap">
                          {fecha}
                        </span>
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
                    onClick={() => handleAnular(ventaDetalle)}
                    disabled={accionEnCurso}
                    className="h-11 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span>🚫</span>
                    <span>Anular</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleEliminar(ventaDetalle)}
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
      </main>

      <div className="print:hidden">
        <PosMobileNav />
      </div>
    </div>
  );
}
