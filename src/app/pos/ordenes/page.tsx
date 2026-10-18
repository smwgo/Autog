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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string; bg: string }> = {
  "En Diagnóstico": {
    label: "En Diagnóstico",
    color: "bg-amber-500",
    badge: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    bg: "bg-amber-500",
  },
  "Reparando": {
    label: "Reparando",
    color: "bg-blue-500",
    badge: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
    bg: "bg-blue-500",
  },
  "Espera de Repuestos": {
    label: "Espera de Repuestos",
    color: "bg-rose-500",
    badge: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10",
    bg: "bg-rose-500",
  },
  "Listo para Entregar": {
    label: "Listo para Entregar",
    color: "bg-emerald-500",
    badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    bg: "bg-emerald-500",
  },
};

export default function PosOrdenesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODAS");
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Seguimiento de órdenes de trabajo, servicio en taller y facturación POS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/taller"
              className="h-10 sm:h-11 px-4 rounded-xl sm:rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
            >
              <span>🔧</span> Ir a Taller
            </Link>
            <Link
              href="/taller/ordenes/nueva"
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>+</span> Nueva Orden
            </Link>
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
              placeholder="Buscar por # Orden, placa, vehículo, cliente o mecánico..."
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

          {/* Filtros de Estado */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "TODAS", label: "Todas" },
              { id: "DIAGNOSTICO", label: "Diagnóstico" },
              { id: "REPARANDO", label: "Reparando" },
              { id: "REPUESTOS", label: "Repuestos" },
              { id: "LISTO", label: "Listo" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFiltroEstado(btn.id)}
                className={`h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filtroEstado === btn.id
                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/25"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {btn.label}
              </button>
            ))}
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
            <Link
              href="/taller/ordenes/nueva"
              className="mt-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-2"
            >
              <span>+</span> Crear Primera Orden
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordenesFiltradas.map((ord) => {
              const statusCfg = STATUS_CONFIG[ord.status] || {
                label: ord.status,
                color: "bg-zinc-500",
                badge: "border-zinc-500/30 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10",
                bg: "bg-zinc-500",
              };

              return (
                <div
                  key={ord.id || ord.dbId}
                  className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 group relative overflow-hidden"
                >
                  <div className="flex flex-col gap-3">
                    {/* Encabezado de la Tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {ord.orderNumber}
                          </span>
                          <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                            {ord.plate}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-1.5 leading-snug">
                          {ord.vehicle}
                        </h3>
                      </div>

                      {/* Badge de Estado */}
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${statusCfg.badge}`}>
                        {ord.status}
                      </span>
                    </div>

                    {/* Cliente y Mecánico */}
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 flex flex-col gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Cliente:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[170px]">
                          {ord.client}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Mecánico:</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {ord.mechanic || "No asignado"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Total estimado:</span>
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          ${Number(ord.totalCost || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progreso */}
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Progreso</span>
                        <span className="font-semibold text-zinc-600 dark:text-zinc-300">{ord.progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${statusCfg.bg}`}
                          style={{ width: `${Math.min(100, Math.max(5, ord.progress))}%` }}
                        />
                      </div>
                    </div>

                    {/* Lista corta de servicios */}
                    {ord.services && ord.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {ord.services.slice(0, 2).map((srv, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md truncate max-w-[180px]"
                          >
                            • {srv}
                          </span>
                        ))}
                        {ord.services.length > 2 && (
                          <span className="text-[10px] text-zinc-400 font-semibold self-center">
                            +{ord.services.length - 2} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
                    {/* Botón Cobrar en POS */}
                    <button
                      type="button"
                      onClick={() => handleCobrarEnPos(ord)}
                      className="flex-1 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer"
                      title="Cobrar en Punto de Venta"
                    >
                      <span>💳</span> Cobrar en POS
                    </button>

                    {/* Selector de Estado Rápido */}
                    <select
                      value={ord.status}
                      disabled={guardandoId === (ord.id || ord.dbId)}
                      onChange={(e) => handleCambiarEstado(ord.id || ord.dbId || "", e.target.value)}
                      className="h-9 px-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-zinc-200 dark:border-zinc-700 cursor-pointer focus:outline-none"
                    >
                      <option value="En Diagnóstico">En Diagnóstico</option>
                      <option value="Reparando">Reparando</option>
                      <option value="Espera de Repuestos">Espera Repuestos</option>
                      <option value="Listo para Entregar">Listo para Entregar</option>
                    </select>

                    {/* Botón Ver Detalle */}
                    <button
                      type="button"
                      onClick={() => setOrdenSeleccionada(ord)}
                      className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-xs font-bold transition-all shrink-0 cursor-pointer"
                      title="Ver Detalles Completos"
                    >
                      👁️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Detalle de Orden */}
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
                  className="flex-1 h-11 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ord = ordenSeleccionada;
                    setOrdenSeleccionada(null);
                    handleCobrarEnPos(ord);
                  }}
                  className="flex-1 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>💳</span> Cobrar en POS
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
