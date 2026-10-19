"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";

interface OrderItem {
  id: string;
  dbId?: string;
  orderNumber: string;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone?: string;
  mechanic: string;
  status: string;
  progress: number;
  dateIn: string;
  estimatedOut: string;
  color: string;
  services: string[];
  notes?: string;
  totalCost?: number;
  isBilled?: boolean;
  billingStatus?: string;
}

function getBillingBadge(billingStatus?: string, isBilled?: boolean) {
  const billed = isBilled || billingStatus?.toLowerCase() === "facturada";
  if (billed) {
    return {
      label: "Facturada",
      badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      dot: "bg-emerald-500",
    };
  }
  return {
    label: "En Proceso",
    badge: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    dot: "bg-amber-500",
  };
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

export default function PosOrdenesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODAS");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrderItem | null>(null);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [toastMensaje, setToastMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: "ok" | "err" = "ok") => {
    setToastMensaje({ tipo, texto });
    setTimeout(() => {
      setToastMensaje((prev) => (prev?.texto === texto ? null : prev));
    }, 3500);
  };

  const cargarOrdenes = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/taller/ordenes", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
      mostrarToast("Error de conexión al cargar órdenes", "err");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  // Cambiar estado rápido de una orden
  const handleCambiarEstado = async (orderId: string, nuevoEstado: string) => {
    try {
      setGuardandoId(orderId);
      let nuevoProgreso = 25;
      if (nuevoEstado === "Reparando") nuevoProgreso = 60;
      if (nuevoEstado === "Espera de Repuestos") nuevoProgreso = 40;
      if (nuevoEstado === "Listo para Entregar") nuevoProgreso = 100;

      const res = await fetch("/api/taller/ordenes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: nuevoEstado,
          progress: nuevoProgreso,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar el estado");
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId || o.dbId === orderId
            ? { ...o, status: nuevoEstado, progress: nuevoProgreso }
            : o
        )
      );

      if (ordenSeleccionada && (ordenSeleccionada.id === orderId || ordenSeleccionada.dbId === orderId)) {
        setOrdenSeleccionada((prev) =>
          prev ? { ...prev, status: nuevoEstado, progress: nuevoProgreso } : null
        );
      }

      mostrarToast(`Orden actualizada a: ${nuevoEstado}`);
    } catch (err: any) {
      mostrarToast(err.message || "Error al actualizar orden", "err");
    } finally {
      setGuardandoId(null);
    }
  };

  // Cargar orden directamente en POS Venta para cobrarla
  const handleCobrarEnPos = (ord: OrderItem) => {
    try {
      const itemsFormatted = (ord.services && ord.services.length > 0
        ? ord.services
        : ["Servicio de Taller Mecánico"]
      ).map((srv, idx) => ({
        id: `ord-item-${idx}`,
        code: `OT-${idx + 1}`,
        name: srv,
        price: ord.totalCost ? Number(ord.totalCost) / Math.max(1, ord.services.length) : 25,
        qty: 1,
      }));

      const payload = {
        id: ord.id || ord.dbId,
        requestNumber: ord.orderNumber,
        customerName: ord.client,
        customerPhone: ord.clientPhone || "",
        type: "TALLER",
        vehicle: `${ord.vehicle} (${ord.plate})`,
        itemsSummary: `Orden ${ord.orderNumber} - ${ord.vehicle}`,
        totalEstimated: ord.totalCost || 0,
        itemsJson: itemsFormatted,
        notes: `Facturación de Orden ${ord.orderNumber} • Placa: ${ord.plate} • Mecánico: ${ord.mechanic}`,
      };

      sessionStorage.setItem("pos_despacho_solicitud", JSON.stringify(payload));
      router.push("/pos/venta");
    } catch (e) {
      console.error("Error al cargar orden en POS:", e);
      router.push("/pos/venta");
    }
  };

  // Filtrado de órdenes
  const ordenesFiltradas = orders.filter((o) => {
    const matchEstado =
      filtroEstado === "TODAS" ||
      o.status.toLowerCase() === filtroEstado.toLowerCase() ||
      (filtroEstado === "DIAGNOSTICO" && o.status.toLowerCase().includes("diagn")) ||
      (filtroEstado === "REPARANDO" && o.status.toLowerCase().includes("repar")) ||
      (filtroEstado === "REPUESTOS" && o.status.toLowerCase().includes("repuest")) ||
      (filtroEstado === "LISTO" && o.status.toLowerCase().includes("listo"));

    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.client.toLowerCase().includes(q) ||
      o.plate.toLowerCase().includes(q) ||
      o.vehicle.toLowerCase().includes(q) ||
      o.mechanic.toLowerCase().includes(q);

    return matchEstado && matchSearch;
  });

  const totalOrdenes = orders.length;
  const totalDiagnostico = orders.filter((o) => o.status.toLowerCase().includes("diagn")).length;
  const totalReparando = orders.filter((o) => o.status.toLowerCase().includes("repar")).length;
  const totalListos = orders.filter((o) => o.status.toLowerCase().includes("listo")).length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-20 md:pb-8">
      <Header />

      <main className="flex-grow p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-6">
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

        {/* Cabecera / Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/pos"
              title="Volver a POS"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-500/10 dark:bg-zinc-800/30 hover:bg-zinc-500/20 dark:hover:bg-zinc-800/60 border border-zinc-300/40 dark:border-zinc-700/30 text-zinc-700 dark:text-zinc-200 backdrop-blur-sm transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Órdenes
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                  {cargando ? "..." : totalOrdenes}
                </span>
              </div>
            </div>
          </div>


        </div>

        {/* Métricas KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
              📋
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando ? "..." : totalOrdenes}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Totales</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
              🔍
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {cargando ? "..." : totalDiagnostico}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Diagnóstico</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
              ⚙️
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {cargando ? "..." : totalReparando}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Reparación</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              ✅
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {cargando ? "..." : totalListos}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Listos para Cobrar</span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-9 h-11 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 text-zinc-900 dark:text-white text-xs sm:text-sm font-medium placeholder:text-zinc-400 focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selector de Estado Desplegable */}
          <div className="relative min-w-[160px] sm:w-48 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
              className="w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center justify-between gap-2 shadow-sm hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-amber-500 text-xs">●</span>
                <span className="truncate">
                  {filtroEstado === "TODAS"
                    ? "Todas"
                    : filtroEstado === "DIAGNOSTICO"
                    ? "Diagnóstico"
                    : filtroEstado === "REPARANDO"
                    ? "Reparando"
                    : filtroEstado === "REPUESTOS"
                    ? "Repuestos"
                    : filtroEstado === "LISTO"
                    ? "Listo"
                    : "Estado"}
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMenuAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltroMenuAbierto(false)} />
                <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "TODAS", label: "Todas" },
                    { id: "DIAGNOSTICO", label: "Diagnóstico" },
                    { id: "REPARANDO", label: "Reparando" },
                    { id: "REPUESTOS", label: "Repuestos" },
                    { id: "LISTO", label: "Listo" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setFiltroEstado(opcion.id);
                        setFiltroMenuAbierto(false);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        filtroEstado === opcion.id
                          ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opcion.label}</span>
                      {filtroEstado === opcion.id && (
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Lista de Órdenes */}
        {cargando ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-sm font-medium text-zinc-500">Cargando órdenes de trabajo...</p>
          </div>
        ) : ordenesFiltradas.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl">
              📂
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No se encontraron órdenes</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              {searchTerm || filtroEstado !== "TODAS"
                ? "No hay órdenes que coincidan con la búsqueda o filtro aplicado."
                : "No hay órdenes registradas actualmente en el sistema."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Vista Móvil (Lista Compacta) */}
            <div className="md:hidden space-y-2.5">
              {ordenesFiltradas.map((ord) => {
                const statusCfg = getStatusBadge(ord.status);

                return (
                  <div
                    key={ord.id || ord.dbId}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                          🚗
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {ord.vehicle}
                            </p>
                            <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              #{ord.orderNumber}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{ord.plate}</span>
                            <span> • {ord.client}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          ${Number(ord.totalCost || 0).toFixed(2)}
                        </p>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badge}`}>
                          {ord.status}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const badgeCfg = getStatusBadge(ord.status);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeCfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badgeCfg.dot}`} />
                              {badgeCfg.label}
                            </span>
                          );
                        })()}

                        {(() => {
                          const billingCfg = getBillingBadge(ord.billingStatus, ord.isBilled);
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${billingCfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${billingCfg.dot}`} />
                              {billingCfg.label}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <button
                          type="button"
                          onClick={() => setOrdenSeleccionada(ord)}
                          className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-xs font-bold transition-all shrink-0 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          title="Vista Rápida"
                        >
                          👁️
                        </button>
                        <Link
                          href={`/pos/ordenes/detalle?id=${encodeURIComponent(ord.orderNumber || ord.id || ord.dbId || "")}`}
                          className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-xs font-bold transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
                          title="Ver Orden Completa"
                        >
                          📋
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vista Desktop / Tablet (Tabla compacta idéntica a Clientes) */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Orden / Vehículo</th>
                      <th className="py-2.5 px-4">Placa & Servicios</th>
                      <th className="py-2.5 px-4">Cliente</th>
                      <th className="py-2.5 px-4">Total</th>
                      <th className="py-2.5 px-4">Estado de Proceso</th>
                      <th className="py-2.5 px-4">Facturación</th>
                      <th className="py-2.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {ordenesFiltradas.map((ord) => {
                      const badgeCfg = getStatusBadge(ord.status);
                      const billingCfg = getBillingBadge(ord.billingStatus, ord.isBilled);

                      return (
                        <tr
                          key={ord.id || ord.dbId}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                        >
                          {/* Orden / Vehículo con avatar estilo Clientes */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                                🚗
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                    {ord.vehicle}
                                  </span>
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    #{ord.orderNumber}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Placa & Servicios (estilo badge vehículo de Clientes) */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                                {ord.plate}
                              </span>
                              {ord.services && ord.services[0] && (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[180px]" title={ord.services.join(", ")}>
                                  {ord.services[0]}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cliente & Mecánico en línea compacta */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="text-sm">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {ord.client}
                              </span>
                              {ord.mechanic && (
                                <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1.5" title={`Mecánico: ${ord.mechanic}`}>
                                  • {ord.mechanic.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Total Estimado */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              ${Number(ord.totalCost || 0).toFixed(2)}
                            </span>
                          </td>

                          {/* Estado real según proceso de taller */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeCfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badgeCfg.dot}`} />
                              {badgeCfg.label}
                            </span>
                          </td>

                          {/* Estado de Facturación (Facturada / En Proceso) */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${billingCfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${billingCfg.dot}`} />
                              {billingCfg.label}
                            </span>
                          </td>

                          {/* Acciones: vista rápida y ver orden completa */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setOrdenSeleccionada(ord)}
                                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-xs font-bold transition-all shrink-0 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                title="Vista Rápida"
                              >
                                👁️
                              </button>
                              <Link
                                href={`/pos/ordenes/detalle?id=${encodeURIComponent(ord.orderNumber || ord.id || ord.dbId || "")}`}
                                className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-xs font-bold transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
                                title="Ver Orden Completa"
                              >
                                📋
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
          </div>
        )}

        {/* Modal de Detalle Rápido de Orden */}
        {ordenSeleccionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center text-lg">
                    📋
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      Orden {ordenSeleccionada.orderNumber}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Placa: {ordenSeleccionada.plate} • {ordenSeleccionada.vehicle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOrdenSeleccionada(null)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="text-zinc-400 block">Cliente:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{ordenSeleccionada.client}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Teléfono:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{ordenSeleccionada.clientPhone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Mecánico:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{ordenSeleccionada.mechanic}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Total Estimado:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      ${Number(ordenSeleccionada.totalCost || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">Servicios Incluidos:</span>
                  <div className="flex flex-col gap-1.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    {ordenSeleccionada.services && ordenSeleccionada.services.length > 0 ? (
                      ordenSeleccionada.services.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                          <span className="text-amber-500">✓</span>
                          <span>{s}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-zinc-400">Sin servicios detallados</span>
                    )}
                  </div>
                </div>

                {ordenSeleccionada.notes && (
                  <div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Notas / Diagnóstico:</span>
                    <p className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 italic">
                      "{ordenSeleccionada.notes}"
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setOrdenSeleccionada(null)}
                  className="flex-1 h-11 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
                <Link
                  href={`/pos/ordenes/detalle?id=${encodeURIComponent(ordenSeleccionada.orderNumber || ordenSeleccionada.id || ordenSeleccionada.dbId || "")}`}
                  className="flex-1 h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Ver Orden Completa</span>
                  <span>↗</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
