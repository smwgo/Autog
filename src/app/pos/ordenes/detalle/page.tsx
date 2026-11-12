"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";

interface OrderDetail {
  id: string;
  dbId?: string;
  orderNumber: string;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone?: string;
  clientIdDoc?: string;
  clientEmail?: string;
  mechanic: string;
  status: string;
  progress: number;
  dateIn: string;
  createdAt?: string;
  estimatedOut: string;
  color: string;
  services: string[];
  items?: Array<{
    id?: string;
    code?: string;
    name: string;
    price: number;
    qty?: number;
    quantity?: number;
    total?: number;
  }>;
  inspectionFindings?: Array<{
    id?: string;
    view?: string;
    type?: string;
    desc?: string;
    description?: string;
    severity?: string;
  }>;
  receptionInventory?: Array<string | { item: string; present: boolean }>;
  receptionPhotos?: string[];
  payments?: any[];
  mileage?: number;
  fuelLevel?: string;
  generalCondition?: string;
  deliveryStatus?: string;
  quoteNumber?: string;
  quoteStatus?: string;
  notes?: string;
  totalCost?: number;
  isBilled: boolean;
  billingStatus: string;
  invoiceInfo?: {
    invoiceNumber: string;
    amount: number;
    status: string;
    date: string;
    paymentMethod?: string;
  } | null;
}

function getStatusBadge(status: string) {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("listo") || s.includes("entreg") || s.includes("terminad")) {
    return {
      label: status || "Listo para Entregar",
      badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      dot: "bg-emerald-500",
    };
  }
  if (s.includes("repar") || s.includes("proceso") || s.includes("pista")) {
    return {
      label: status || "En Reparación",
      badge: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
      dot: "bg-blue-500",
    };
  }
  if (s.includes("repuesto") || s.includes("pausa") || s.includes("espera")) {
    return {
      label: status || "Espera de Repuestos",
      badge: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10",
      dot: "bg-rose-500",
    };
  }
  if (s.includes("diagn") || s.includes("revis") || s.includes("inspec")) {
    return {
      label: status || "En Diagnóstico",
      badge: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
      dot: "bg-amber-500",
    };
  }
  return {
    label: status || "En Proceso",
    badge: "border-zinc-500/30 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10",
    dot: "bg-zinc-500",
  };
}

function DetalleOrdenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("id") || searchParams.get("orderNumber") || "";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizandoFacturacion, setActualizandoFacturacion] = useState(false);
  const [toastMensaje, setToastMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: "ok" | "err" = "ok") => {
    setToastMensaje({ tipo, texto });
    setTimeout(() => {
      setToastMensaje((prev) => (prev?.texto === texto ? null : prev));
    }, 3500);
  };

  const cargarOrden = useCallback(async () => {
    if (!orderId) {
      setCargando(false);
      return;
    }
    try {
      setCargando(true);
      const res = await fetch(`/api/taller/ordenes?id=${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      } else if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
        setOrder(data.orders[0]);
      } else {
        setOrder(null);
      }
    } catch (err: any) {
      console.error("Error al cargar orden:", err);
      mostrarToast("Error de conexión al cargar la orden", "err");
    } finally {
      setCargando(false);
    }
  }, [orderId]);

  useEffect(() => {
    cargarOrden();
  }, [cargarOrden]);

  // Cambiar estado de facturación (Pagado <-> En Orden)
  const toggleFacturacion = async () => {
    if (!order) return;
    const nuevoEstado = order.isBilled ? "En Proceso" : "Facturada";
    const labelEstado = order.isBilled ? "En Orden" : "Pagado";
    try {
      setActualizandoFacturacion(true);
      const res = await fetch("/api/taller/ordenes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.orderNumber || order.id || order.dbId,
          billingStatus: nuevoEstado,
          isBilled: !order.isBilled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar el estado");
      }
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              isBilled: !prev.isBilled,
              billingStatus: nuevoEstado,
            }
          : null
      );
      mostrarToast(`Orden marcada como: ${labelEstado}`);
    } catch (err: any) {
      mostrarToast(err.message || "Error al actualizar estado", "err");
    } finally {
      setActualizandoFacturacion(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
        <Header />
        <main className="flex-grow p-6 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-zinc-500">Cargando orden de trabajo...</p>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
        <Header />
        <main className="flex-grow p-6 max-w-3xl mx-auto w-full flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl">
            📂
          </div>
          <h2 className="text-xl font-bold">Orden no encontrada</h2>
          <p className="text-sm text-zinc-500">
            No se encontró la orden solicitada ({orderId || "sin código"}). Verifique el número de orden o vuelva a la lista.
          </p>
          <Link
            href="/pos/ordenes"
            className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm transition-all"
          >
            ← Volver a Órdenes
          </Link>
        </main>
      </div>
    );
  }

  const statusBadge = getStatusBadge(order.status);
  const totalEstimado = Number(order.totalCost || 0);
  const subtotal = totalEstimado > 0 ? totalEstimado / 1.15 : 0;
  const iva = totalEstimado - subtotal;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-20 md:pb-12 print:bg-white print:text-black print:pb-0">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-grow p-4 sm:p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col gap-6">
        {/* Toast Notificación */}
        {toastMensaje && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-bottom-3 ${
              toastMensaje.tipo === "ok"
                ? "bg-emerald-500/90 text-white border-emerald-400"
                : "bg-rose-500/90 text-white border-rose-400"
            }`}
          >
            <span>{toastMensaje.tipo === "ok" ? "✓" : "⚠️"}</span>
            <span>{toastMensaje.texto}</span>
          </div>
        )}

        {/* Barra superior de navegación y acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5">
            <Link
              href="/pos/ordenes"
              title="Volver a Órdenes"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-500/10 dark:bg-zinc-800/30 hover:bg-zinc-500/20 dark:hover:bg-zinc-800/60 border border-zinc-300/40 dark:border-zinc-700/30 text-zinc-700 dark:text-zinc-200 backdrop-blur-sm transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Orden #{order.orderNumber?.replace(/^#/, "") || "001"}
                </h1>
                {/* ETIQUETA PRINCIPAL: PAGADO O EN ORDEN */}
                {order.isBilled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ✓ PAGADO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    ⏳ EN ORDEN
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Ingresada el {order.dateIn} • Placa: {order.plate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Botón para cambiar estado */}
            <button
              type="button"
              onClick={toggleFacturacion}
              disabled={actualizandoFacturacion}
              className={`h-10 sm:h-11 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border shadow-sm cursor-pointer disabled:opacity-50 ${
                order.isBilled
                  ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-500/20"
              }`}
            >
              <span>{order.isBilled ? "↩️ Marcar En Orden" : "✓ Marcar como Pagado"}</span>
            </button>

            {/* Imprimir */}
            <button
              type="button"
              onClick={() => window.print()}
              className="h-10 sm:h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {/* BANNER PRINCIPAL DE ESTADOS */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl shrink-0 border border-amber-500/20">
              🚗
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                  {order.plate}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                  {order.vehicle}
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Cliente: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{order.client}</span>
                {order.clientPhone && <span> • Tel: {order.clientPhone}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100 dark:border-zinc-800">
            {/* Estado Simplificado: Pagado o En Orden */}
            <div className="flex flex-col items-start md:items-end">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Estado
              </span>
              {order.isBilled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Pagado {order.invoiceInfo ? `(#${order.invoiceInfo.invoiceNumber})` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  En Orden
                </span>
              )}
            </div>
          </div>
        </div>

        {/* GRILLA DE TARJETAS INFORMATIVAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Tarjeta 1: Vehículo */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 text-zinc-900 dark:text-white font-bold text-sm">
              <span className="text-amber-500">🚙</span>
              <span>Datos del Vehículo</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Modelo:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{order.vehicle}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Placa:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{order.plate}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Kilometraje:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {order.mileage ? `${order.mileage.toLocaleString()} km` : "No registrado"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Nivel Combustible:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{order.fuelLevel || "1/2"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500 dark:text-zinc-400">Condición General:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{order.generalCondition || "Bueno"}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Cliente */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 text-zinc-900 dark:text-white font-bold text-sm">
              <span className="text-blue-500">👤</span>
              <span>Datos del Cliente</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Nombre:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{order.client}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Teléfono:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {order.clientPhone ? (
                    <a href={`tel:${order.clientPhone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {order.clientPhone}
                    </a>
                  ) : (
                    "No registrado"
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Identificación:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{order.clientIdDoc || "Consumidor Final"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500 dark:text-zinc-400">Correo:</span>
                <span className="text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
                  {order.clientEmail || "Sin correo"}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Taller y Técnico */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 text-zinc-900 dark:text-white font-bold text-sm">
              <span className="text-indigo-500">⚙️</span>
              <span>Servicio & Taller</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Mecánico Asignado:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{order.mechanic}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Fecha Ingreso:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{order.dateIn}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-800/50">
                <span className="text-zinc-500 dark:text-zinc-400">Tiempo Estimado:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{order.estimatedOut}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500 dark:text-zinc-400">Entrega:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {order.deliveryStatus || "Pendiente de Firma"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SERVICIOS Y REPUESTOS */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-lg">📋</span>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Servicios Solicitados & Repuestos
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {(order.services?.length || 0) + (order.items?.length || 0)} ítems
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-5">Descripción / Concepto</th>
                  <th className="py-3 px-5">Tipo</th>
                  <th className="py-3 px-5 text-center">Cant.</th>
                  <th className="py-3 px-5 text-right">Precio Unit.</th>
                  <th className="py-3 px-5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {/* Servicios de la orden */}
                {order.services && order.services.length > 0 ? (
                  order.services.map((srv, idx) => {
                    const pricePerService = order.totalCost
                      ? Number(order.totalCost) / Math.max(1, order.services.length)
                      : 0;
                    return (
                      <tr key={`srv-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">
                              🔧
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{srv}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Mano de Obra
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono">1</td>
                        <td className="py-3.5 px-5 text-right font-mono text-zinc-600 dark:text-zinc-300">
                          ${pricePerService.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          ${pricePerService.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : null}

                {/* Repuestos o items específicos */}
                {order.items &&
                  order.items.map((it, idx) => {
                    const qty = it.qty || it.quantity || 1;
                    const price = Number(it.price || 0);
                    const tot = it.total ? Number(it.total) : qty * price;
                    return (
                      <tr key={`it-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-bold shrink-0">
                              📦
                            </span>
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{it.name}</p>
                              {it.code && <p className="font-mono text-[10px] text-zinc-400">{it.code}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Repuesto
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono">{qty}</td>
                        <td className="py-3.5 px-5 text-right font-mono text-zinc-600 dark:text-zinc-300">
                          ${price.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          ${tot.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                {(!order.services || order.services.length === 0) &&
                  (!order.items || order.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                        No hay servicios detallados registrados en esta orden.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {/* Resumen Totales */}
          <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-zinc-500">
              <p>Valores expresados en Dólares Americanos (USD).</p>
              {order.isBilled ? (
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  ✓ Esta orden se encuentra debidamente Pagada.
                </p>
              ) : (
                <p className="text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                  ⏳ Esta orden se encuentra En Orden.
                </p>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Subtotal Estimado:</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>IVA (15%):</span>
                <span className="font-mono">${iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-white pt-1.5 border-t border-zinc-200 dark:border-zinc-700">
                <span>Total:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">${totalEstimado.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* HALLAZGOS DE INSPECCIÓN (5 VISTAS) */}
        {order.inspectionFindings && order.inspectionFindings.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-rose-500 text-lg">🔍</span>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Hallazgos de Inspección de Recepción (5 Vistas)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {order.inspectionFindings.map((f, idx) => (
                <div
                  key={`find-${idx}`}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                      {f.view || "Vista"}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      {f.type || "Daño"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {f.desc || f.description || `Hallazgo #${idx + 1}`}
                  </p>
                  {f.severity && (
                    <span className="text-[10px] text-zinc-400">Severidad: {f.severity}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTAS Y DIAGNÓSTICO */}
        {order.notes && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-base">
              <span className="text-amber-500">📝</span>
              <span>Observaciones y Diagnóstico de Taller</span>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {order.notes}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PosOrdenDetallePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
          <div className="w-9 h-9 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      }
    >
      <DetalleOrdenContent />
    </Suspense>
  );
}
