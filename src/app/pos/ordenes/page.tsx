"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { getClientUserBranch, getClientActiveBranch } from "@/lib/branch";

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

function esOrdenEnHistorial(ord: OrderItem): boolean {
  const st = (ord.status || "").trim().toLowerCase();
  return (
    st === "finalizado" ||
    st === "terminado" ||
    st === "entregado" ||
    st === "entregada" ||
    st === "05 entregada" ||
    st === "historial"
  );
}

function getEstadoSimplificado(ord: OrderItem) {
  const pagado =
    Boolean(ord.isBilled) ||
    ord.billingStatus?.toLowerCase() === "facturada" ||
    (ord.status || "").toLowerCase().includes("factur") ||
    (ord.status || "").toLowerCase().includes("pagad");

  if (pagado) {
    return {
      label: "Pagado",
      badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      dot: "bg-emerald-500",
    };
  }
  if (esOrdenEnHistorial(ord)) {
    return {
      label: "Terminado",
      badge: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10",
      dot: "bg-purple-500",
    };
  }
  return {
    label: "En Orden",
    badge: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    dot: "bg-amber-500",
  };
}

function formatNumeroOrden(numStr?: string, fallbackIdx?: number) {
  if (!numStr) return "#001";
  const clean = numStr.replace(/^#/, "").trim();
  if (/^\d+$/.test(clean)) {
    return `#${clean.padStart(3, "0")}`;
  }
  const match = clean.match(/(?:OT-)?(?:20\d{2}-)?(\d+)$/i);
  if (match && match[1]) {
    const n = parseInt(match[1], 10);
    if (n < 1000) return `#${String(n).padStart(3, "0")}`;
    return typeof fallbackIdx === "number" ? `#${String(fallbackIdx + 1).padStart(3, "0")}` : "#001";
  }
  return typeof fallbackIdx === "number" ? `#${String(fallbackIdx + 1).padStart(3, "0")}` : "#001";
}

export default function PosOrdenesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [seccionActiva, setSeccionActiva] = useState<"ACTIVAS" | "HISTORIAL">("ACTIVAS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODAS");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [toastMensaje, setToastMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("seccion") === "historial") {
        setSeccionActiva("HISTORIAL");
      }
    }
  }, []);

  const mostrarToast = (texto: string, tipo: "ok" | "err" = "ok") => {
    setToastMensaje({ tipo, texto });
    setTimeout(() => {
      setToastMensaje((prev) => (prev?.texto === texto ? null : prev));
    }, 3500);
  };

  const cargarOrdenes = useCallback(async () => {
    try {
      setCargando(true);
      const activeBr = getClientActiveBranch();
      const uBr = getClientUserBranch();
      const params = new URLSearchParams();
      params.set("sede", activeBr);
      params.set("userBranch", uBr);
      const res = await fetch(`/api/taller/ordenes?${params.toString()}`, { cache: "no-store" });
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

  useEffect(() => {
    const handleBranch = () => {
      cargarOrdenes();
    };
    window.addEventListener("autog-branch-change", handleBranch);
    return () => window.removeEventListener("autog-branch-change", handleBranch);
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

  const ordenesActivasList = orders.filter((o) => !esOrdenEnHistorial(o));
  const ordenesHistorialList = orders.filter((o) => esOrdenEnHistorial(o));
  const baseSeccion = seccionActiva === "HISTORIAL" ? ordenesHistorialList : ordenesActivasList;

  // Filtrado de órdenes
  const ordenesFiltradas = baseSeccion.filter((o) => {
    const isPagado =
      Boolean(o.isBilled) ||
      o.billingStatus?.toLowerCase() === "facturada" ||
      (o.status || "").toLowerCase().includes("factur") ||
      (o.status || "").toLowerCase().includes("pagad");

    const matchEstado =
      filtroEstado === "TODAS" ||
      (filtroEstado === "PAGADO" && isPagado) ||
      (filtroEstado === "EN_ORDEN" && !isPagado);

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

  const totalOrdenes = baseSeccion.length;
  const totalPagados = baseSeccion.filter(
    (o) =>
      Boolean(o.isBilled) ||
      o.billingStatus?.toLowerCase() === "facturada" ||
      (o.status || "").toLowerCase().includes("factur") ||
      (o.status || "").toLowerCase().includes("pagad")
  ).length;
  const totalEnOrden = totalOrdenes - totalPagados;

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
                  {seccionActiva === "HISTORIAL" ? "Historial de Órdenes" : "Órdenes"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                  {cargando ? "..." : totalOrdenes}
                </span>
                <BranchTabs onChange={() => cargarOrdenes()} size="sm" />
              </div>
            </div>
          </div>

          {/* Selector de Sección: Órdenes Activas vs Historial de Órdenes */}
          <div className="flex items-center p-1 rounded-2xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/60 dark:border-zinc-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSeccionActiva("ACTIVAS")}
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                seccionActiva === "ACTIVAS"
                  ? "bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-300 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>🔧</span>
              <span>Órdenes Activas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-amber-500/15 text-amber-600 dark:text-amber-300">
                {cargando ? "..." : ordenesActivasList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSeccionActiva("HISTORIAL")}
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                seccionActiva === "HISTORIAL"
                  ? "bg-purple-500/15 border border-purple-500/35 text-purple-600 dark:text-purple-300 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>📋</span>
              <span>Historial de Órdenes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-purple-500/15 text-purple-600 dark:text-purple-300">
                {cargando ? "..." : ordenesHistorialList.length}
              </span>
            </button>
          </div>
        </div>

        {/* Métricas KPI Simplificadas */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
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
              ⏳
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {cargando ? "..." : totalEnOrden}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">En Orden</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              ✅
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {cargando ? "..." : totalPagados}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Pagados</span>
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

          {/* Selector de Estado Desplegable Simplificado */}
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
                    : filtroEstado === "EN_ORDEN"
                    ? "En Orden"
                    : filtroEstado === "PAGADO"
                    ? "Pagado"
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
                    { id: "EN_ORDEN", label: "En Orden" },
                    { id: "PAGADO", label: "Pagado" },
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
              {ordenesFiltradas.map((ord, idx) => {
                return (
                  <div
                    key={ord.id || ord.dbId}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 0h17.25M3.75 14.25l2.25-6.75h12l2.25 6.75" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-normal text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {ord.vehicle}
                            </p>
                            <span className="font-mono text-[11px] font-normal text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              {formatNumeroOrden(ord.orderNumber, idx)}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                            <span className="font-normal text-zinc-700 dark:text-zinc-300">{ord.plate}</span>
                            <span> • {ord.client}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-normal text-sm text-emerald-600 dark:text-emerald-400">
                          ${Number(ord.totalCost || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                      {(() => {
                        const estadoCfg = getEstadoSimplificado(ord);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-normal border ${estadoCfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                            {estadoCfg.label}
                          </span>
                        );
                      })()}

                      <Link
                        href={`/pos/ordenes/detalle?id=${encodeURIComponent(ord.orderNumber || ord.id || ord.dbId || "")}`}
                        className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
                        title="Ver Orden Completa"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </Link>
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
                      <th className="py-2.5 px-4">Placa</th>
                      <th className="py-2.5 px-4">Cliente</th>
                      <th className="py-2.5 px-4">Total</th>
                      <th className="py-2.5 px-4">Estado</th>
                      <th className="py-2.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {ordenesFiltradas.map((ord, idx) => {
                      const estadoCfg = getEstadoSimplificado(ord);

                      return (
                        <tr
                          key={ord.id || ord.dbId}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                        >
                          {/* Orden / Vehículo con avatar estilo Clientes */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 0h17.25M3.75 14.25l2.25-6.75h12l2.25 6.75" />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-normal text-zinc-900 dark:text-zinc-100 text-sm">
                                    {ord.vehicle}
                                  </span>
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-normal uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    {formatNumeroOrden(ord.orderNumber, idx)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Placa */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-normal px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                              {ord.plate}
                            </span>
                          </td>

                          {/* Cliente */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-normal text-sm text-zinc-900 dark:text-zinc-100">
                              {ord.client}
                            </span>
                          </td>

                          {/* Total Estimado */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="font-normal text-sm text-emerald-600 dark:text-emerald-400">
                              ${Number(ord.totalCost || 0).toFixed(2)}
                            </span>
                          </td>

                          {/* Estado Simplificado: Pagado o En Orden */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal border ${estadoCfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                              {estadoCfg.label}
                            </span>
                          </td>

                          {/* Acción: ver orden completa */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end">
                              <Link
                                href={`/pos/ordenes/detalle?id=${encodeURIComponent(ord.orderNumber || ord.id || ord.dbId || "")}`}
                                className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer"
                                title="Ver Orden Completa"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
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
          </div>
        )}
      </main>
    </div>
  );
}
