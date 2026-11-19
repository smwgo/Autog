"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { getClientUserBranch, getClientActiveBranch } from "@/lib/branch";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Paginacion, paginarLista } from "@/components/Paginacion";

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
  services: any[];
  items?: any[];
  notes?: string;
  totalCost?: number;
  quoteTaxRate?: number;
  quoteDiscount?: number;
  quoteDiscountType?: string;
  isBilled?: boolean;
  billingStatus?: string;
  quoteStatus?: string;
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
    (ord.status || "").toLowerCase().includes("pagad") ||
    (ord.quoteStatus || "").toLowerCase() === "pagado";

  if (pagado) {
    return {
      tipo: "pagado",
      label: "✓ Pagado",
      badge: "border-sky-500/30 text-sky-700 dark:text-sky-300 bg-sky-500/15",
      dot: "bg-sky-500",
    };
  }
  if (esOrdenEnHistorial(ord)) {
    return {
      tipo: "terminado",
      label: "Terminado",
      badge: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10",
      dot: "bg-purple-500",
    };
  }
  const st = (ord.status || "").trim().toLowerCase();
  const qs = (ord.quoteStatus || "").trim().toLowerCase();

  if (st === "pausada" || st === "pausa") {
    return {
      tipo: "pausa",
      label: "Pausa",
      badge: "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/15",
      dot: "bg-amber-500",
    };
  }
  if (
    qs === "aprobado" ||
    qs === "aceptado" ||
    st === "aprobado" ||
    st === "en proceso" ||
    st === "reparando" ||
    st === "trabajando"
  ) {
    return {
      tipo: "trabajando",
      label: "Trabajando",
      badge: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15",
      dot: "bg-emerald-500",
    };
  }
  return {
    tipo: "espera",
    label: "En espera",
    badge: "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10",
    dot: "bg-amber-500/70",
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
  const [mostrarMetricasMovil, setMostrarMetricasMovil] = useState(false);
  const [menuTallerFilaId, setMenuTallerFilaId] = useState<string | null>(null);
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

  useRealtimeSync({
    channels: ["ordenes", "presupuestos", "taller"],
    onEvent: (ev) => {
      if (ev.action === "deleted" && ev.entityId) {
        setOrders((prev) =>
          prev.filter(
            (o) =>
              o.id !== ev.entityId &&
              o.dbId !== ev.entityId &&
              o.orderNumber !== ev.entityId
          )
        );
      }
    },
    onRefresh: () => cargarOrdenes(),
  });

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

  // Sincronizar estado (Trabajando / Pausa / En espera) con Taller
  const handleSincronizarEstadoTaller = async (
    ord: OrderItem,
    nuevoEstado: "Aprobado" | "Pausada" | "Pendiente"
  ) => {
    const targetId = ord.dbId || ord.id || ord.orderNumber;
    if (!targetId) return;
    try {
      setGuardandoId(targetId);
      const res = await fetch("/api/presupuestos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: targetId, quoteStatus: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo sincronizar estado con Taller");
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === ord.id || o.dbId === ord.dbId
            ? {
                ...o,
                status:
                  nuevoEstado === "Pausada"
                    ? "Pausada"
                    : nuevoEstado === "Aprobado"
                    ? "En Proceso"
                    : "Pendiente",
                quoteStatus: nuevoEstado === "Pausada" ? o.quoteStatus : nuevoEstado,
              }
            : o
        )
      );
      mostrarToast(
        nuevoEstado === "Aprobado"
          ? "✓ Orden aprobada · Trabajando en Taller"
          : nuevoEstado === "Pausada"
          ? "⏸ Orden en Pausa · Pausada en Taller"
          : "⏳ Orden en espera en Taller"
      );
    } catch (err: any) {
      mostrarToast(err.message || "Error al actualizar estado", "err");
    } finally {
      setGuardandoId(null);
    }
  };

  // Cargar orden directamente en POS Venta para cobrarla
  const handleCobrarEnPos = (ord: OrderItem) => {
    try {
      const rawItems = Array.isArray(ord.items) ? ord.items : [];
      const rawServices = Array.isArray(ord.services) ? ord.services : [];

      const partsOnly = rawItems.filter((it: any) => it && typeof it === "object" && it.type !== "SERVICE");
      const extraSrvs = rawItems.filter((it: any) => it && typeof it === "object" && it.type === "SERVICE");

      const seenSrvIds = new Set<string>();
      const seenSrvNames = new Set<string>();
      const uniqueServices: any[] = [];
      for (const sv of [
        ...rawServices.filter((s: any) => s && typeof s === "object"),
        ...extraSrvs,
        ...rawServices.filter((s: any) => typeof s === "string"),
      ]) {
        if (!sv) continue;
        const obj = typeof sv === "string" ? { name: sv, price: 0, qty: 1 } : sv;
        const idKey = String(obj.id || "").trim().toLowerCase();
        const nameKey = String(obj.name || obj.description || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
        if (!idKey && !nameKey) continue;
        if (idKey && seenSrvIds.has(idKey)) continue;
        if (nameKey && seenSrvNames.has(nameKey)) continue;
        if (idKey) seenSrvIds.add(idKey);
        if (nameKey) seenSrvNames.add(nameKey);
        uniqueServices.push(obj);
      }

      const qTax = ord.quoteTaxRate !== undefined && ord.quoteTaxRate !== null ? Number(ord.quoteTaxRate) : 15;
      const qDisc = Number(ord.quoteDiscount ?? 0);
      const qDiscType = ord.quoteDiscountType || "PERCENT";

      const itemsFormatted: any[] = [];

      partsOnly.forEach((it: any, idx: number) => {
        itemsFormatted.push({
          id: it.productId || it.id || `ord-rep-${idx}`,
          productId: it.productId || null,
          code: it.code || `REP-${idx + 1}`,
          name: it.name || "Repuesto",
          price: Number(it.price) || 0,
          qty: Math.max(1, Number(it.qty) || 1),
          isService: false,
          quoteTaxRate: qTax,
          quoteDiscount: qDisc,
          quoteDiscountType: qDiscType,
        });
      });

      uniqueServices.forEach((sv: any, idx: number) => {
        itemsFormatted.push({
          id: sv.id || `ord-srv-${idx}`,
          code: sv.code || `OT-${idx + 1}`,
          name: sv.name || "Servicio de Taller",
          price: Number(sv.price) || 0,
          qty: Math.max(1, Number(sv.qty) || 1),
          isService: true,
          quoteTaxRate: qTax,
          quoteDiscount: qDisc,
          quoteDiscountType: qDiscType,
        });
      });

      if (itemsFormatted.length === 0) {
        const basePriceWithoutTax = ord.totalCost
          ? Number((Number(ord.totalCost) / (1 + qTax / 100)).toFixed(2))
          : 25;
        itemsFormatted.push({
          id: "ord-item-0",
          code: "OT-1",
          name: "Servicio de Taller Mecánico",
          price: basePriceWithoutTax,
          qty: 1,
          isService: true,
          quoteTaxRate: qTax,
          quoteDiscount: qDisc,
          quoteDiscountType: qDiscType,
        });
      }

      const payload = {
        id: ord.id || ord.dbId,
        requestNumber: ord.orderNumber,
        customerName: ord.client,
        customerPhone: ord.clientPhone || "",
        type: "TALLER",
        vehicle: `${ord.vehicle} (${ord.plate})`,
        itemsSummary: `Orden ${ord.orderNumber} - ${ord.vehicle}`,
        totalEstimated: ord.totalCost || 0,
        quoteTaxRate: qTax,
        quoteDiscount: qDisc,
        quoteDiscountType: qDiscType,
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

  const [paginaActual, setPaginaActual] = useState(1);
  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filtroEstado, seccionActiva]);

  const { itemsPaginados: ordenesPaginadas, paginaValida } = paginarLista(
    ordenesFiltradas,
    paginaActual
  );

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
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-8">
      <Header />

      <main className="flex-grow px-3.5 py-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col gap-3.5 sm:gap-6">
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <Link
              href="/pos"
              title="Volver a POS"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-amber-500 transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-xs"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
              Órdenes
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
              {cargando ? "..." : totalOrdenes}
            </span>
          </div>

          {/* Selector de Sede + Botón + Nueva Orden en móvil, y Selector de Sección en desktop */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 ml-auto">
            <div className="flex items-center gap-2">
              <BranchTabs onChange={() => cargarOrdenes()} size="sm" />
              <Link
                href="/taller"
                title="Nueva Orden en Taller"
                aria-label="Nueva Orden"
                className="h-9 w-9 sm:w-auto sm:h-9 sm:px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Nueva Orden</span>
              </Link>
            </div>

            <div className="hidden sm:flex items-center p-1 rounded-2xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/60 dark:border-zinc-800">
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
        </div>

        {/* En una sola línea: Buscador + Filtro + Métricas */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none select-none">
              🔍
            </span>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar placa, cliente, vehículo u orden..."
              className="w-full pl-10 pr-9 h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-amber-500 text-zinc-900 dark:text-white text-base sm:text-sm font-normal placeholder:text-zinc-400 focus:outline-none transition-all shadow-xs"
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

          {/* Botón Filtro (icono con punto azul en móvil, selector en desktop) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
              title="Filtrar órdenes"
              aria-label="Filtrar órdenes"
              className={`relative w-11 h-11 sm:w-48 sm:px-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center sm:justify-between gap-2 shadow-xs transition-all cursor-pointer active:scale-95 ${
                filtroEstado !== "TODAS" || seccionActiva === "HISTORIAL"
                  ? "bg-blue-50 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-amber-500/50"
              }`}
            >
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {(filtroEstado !== "TODAS" || seccionActiva === "HISTORIAL") && (
                <span className="sm:hidden absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-zinc-950" />
              )}
              <div className="hidden sm:flex items-center gap-2 truncate">
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
                className={`hidden sm:block w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`}
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
                <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="sm:hidden px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    Vista
                  </div>
                  <div className="sm:hidden border-b border-zinc-100 dark:border-zinc-800">
                    {[
                      { id: "ACTIVAS", label: `🔧 Activas (${ordenesActivasList.length})` },
                      { id: "HISTORIAL", label: `📋 Historial (${ordenesHistorialList.length})` },
                    ].map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => {
                          setSeccionActiva(sec.id as "ACTIVAS" | "HISTORIAL");
                          setFiltroMenuAbierto(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          seccionActiva === sec.id
                            ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                        }`}
                      >
                        <span>{sec.label}</span>
                        {seccionActiva === sec.id && (
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="sm:hidden px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Estado
                  </div>
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
                          ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
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
                ? "bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>

        {/* Métricas KPI (4 recuadros pequeños en fila en móvil, empiezan ocultos) */}
        <div className={`${mostrarMetricasMovil ? "block" : "hidden"} sm:block animate-in fade-in slide-in-from-top-1 duration-150`}>
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-2.5 sm:p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs sm:shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-3.5 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                📋
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  {cargando ? "..." : totalOrdenes}
                </p>
                <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate block">Totales</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-2.5 sm:p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs sm:shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-3.5 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                ⏳
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-amber-600 dark:text-amber-400 leading-tight truncate">
                  {cargando ? "..." : totalEnOrden}
                </p>
                <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate block">En Orden</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-2.5 sm:p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs sm:shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-3.5 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                ✅
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight truncate">
                  {cargando ? "..." : totalPagados}
                </p>
                <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate block">Pagados</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-2.5 sm:p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs sm:shadow-sm flex flex-col sm:flex-row items-center gap-1 sm:gap-3.5 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm sm:text-xl shrink-0">
                🗂️
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-2xl font-bold text-purple-600 dark:text-purple-400 leading-tight truncate">
                  {cargando ? "..." : ordenesHistorialList.length}
                </p>
                <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate block">Historial</span>
              </div>
            </div>
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
            {/* Vista Móvil (Ordenada como Clientes: Cabecera, 2 recuadros, servicios deslizables y barra de botones abajo) */}
            <div className="md:hidden space-y-3">
              {ordenesPaginadas.map((ord, idx) => {
                const estadoCfg = getEstadoSimplificado(ord);
                const cleanPhone = (ord.clientPhone || "").replace(/\D/g, "");
                const waPhone = cleanPhone.startsWith("0")
                  ? `593${cleanPhone.slice(1)}`
                  : cleanPhone.startsWith("593")
                  ? cleanPhone
                  : cleanPhone
                  ? `593${cleanPhone}`
                  : "";

                return (
                  <div
                    key={ord.id || ord.dbId}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs transition-colors"
                  >
                    <div className="p-3.5 space-y-3">
                      {/* 1. Icono, Vehículo + Orden, Estado, Placa y Fecha */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 0h17.25M3.75 14.25l2.25-6.75h12l2.25 6.75" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {ord.vehicle}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${estadoCfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                              {estadoCfg.label}
                            </span>
                          </div>

                          <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {formatNumeroOrden(ord.orderNumber, idx)}
                            </span>
                            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                              {ord.plate}
                            </span>
                            {ord.dateIn && (
                              <>
                                <span>•</span>
                                <span>📅 {ord.dateIn}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. Dos recuadros: Cliente/WhatsApp y Total Estimado */}
                      <div className="grid grid-cols-2 gap-2">
                        {waPhone ? (
                          <a
                            href={`https://wa.me/${waPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 rounded-xl px-3 py-2 block active:scale-98 transition-transform"
                          >
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 block">
                              Cliente • WhatsApp ↗
                            </span>
                            <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-300 truncate block">
                              💬 {ord.client}
                            </span>
                          </a>
                        ) : (
                          <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-3 py-2">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                              Cliente
                            </span>
                            <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate block">
                              👤 {ord.client}
                            </span>
                          </div>
                        )}

                        <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-3 py-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                            Total Orden
                          </span>
                          <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            ${Number(ord.totalCost || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* 3. Servicios / Trabajos deslizables de lado */}
                      {ord.services && ord.services.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {ord.services.map((srv, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60 text-[11px] font-medium whitespace-nowrap shrink-0"
                            >
                              <span>🔧</span>
                              <span>{srv}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4. Botones grandes abajo */}
                    <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80">
                      <div className="relative flex items-center justify-center">
                        {ord.isBilled || estadoCfg.tipo === "pagado" || estadoCfg.tipo === "terminado" ? (
                          <span className="h-11 w-full flex items-center justify-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                            <span>✓</span>
                            <span>{estadoCfg.label}</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={guardandoId === (ord.dbId || ord.id)}
                              onClick={() =>
                                setMenuTallerFilaId(
                                  menuTallerFilaId === (ord.dbId || ord.id) ? null : ord.dbId || ord.id
                                )
                              }
                              className="h-11 w-full flex items-center justify-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <span className={`w-2 h-2 rounded-full ${estadoCfg.dot}`} />
                              <span>Estado</span>
                              <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {menuTallerFilaId === (ord.dbId || ord.id) && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuTallerFilaId(null)} />
                                <div className="absolute bottom-12 left-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuTallerFilaId(null);
                                      handleSincronizarEstadoTaller(ord, "Aprobado");
                                    }}
                                    className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-emerald-500/10 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Trabajando</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuTallerFilaId(null);
                                      handleSincronizarEstadoTaller(ord, "Pausada");
                                    }}
                                    className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-amber-500/10 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span>Pausa</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuTallerFilaId(null);
                                      handleSincronizarEstadoTaller(ord, "Pendiente");
                                    }}
                                    className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-amber-500/10 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-amber-500/70" />
                                    <span>En espera</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCobrarEnPos(ord)}
                        className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <span>🛒</span>
                        <span>Cobrar</span>
                      </button>

                      <Link
                        href={`/pos/ordenes/detalle?id=${encodeURIComponent(ord.orderNumber || ord.id || ord.dbId || "")}`}
                        className="h-11 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 active:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <span>📄</span>
                        <span>Detalle</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="md:hidden bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
              <Paginacion
                paginaActual={paginaValida}
                totalElementos={ordenesFiltradas.length}
                onCambiarPagina={setPaginaActual}
                className="border-t-0"
              />
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
                    {ordenesPaginadas.map((ord, idx) => {
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

                          {/* Estado Taller Simplificado */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {ord.isBilled || estadoCfg.tipo === "pagado" || estadoCfg.tipo === "terminado" ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal border ${estadoCfg.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                                {estadoCfg.label}
                              </span>
                            ) : (
                              <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  disabled={guardandoId === (ord.dbId || ord.id)}
                                  onClick={() => setMenuTallerFilaId(menuTallerFilaId === (ord.dbId || ord.id) ? null : (ord.dbId || ord.id))}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-normal border transition-all hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50 ${estadoCfg.badge}`}
                                  title="Estado Taller (Trabajando, Pausa, En espera)"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                                  <span>{estadoCfg.label}</span>
                                  <svg className="w-3 h-3 opacity-60 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                {menuTallerFilaId === (ord.dbId || ord.id) && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuTallerFilaId(null)} />
                                    <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 text-xs">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMenuTallerFilaId(null);
                                          handleSincronizarEstadoTaller(ord, "Aprobado");
                                        }}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-emerald-500/10 transition-colors ${
                                          estadoCfg.tipo === "trabajando" ? "text-emerald-600 font-bold bg-emerald-500/5" : "text-zinc-700 dark:text-zinc-300"
                                        }`}
                                      >
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span>Trabajando</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMenuTallerFilaId(null);
                                          handleSincronizarEstadoTaller(ord, "Pausada");
                                        }}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-amber-500/10 transition-colors ${
                                          estadoCfg.tipo === "pausa" ? "text-amber-600 font-bold bg-amber-500/5" : "text-zinc-700 dark:text-zinc-300"
                                        }`}
                                      >
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span>Pausa</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMenuTallerFilaId(null);
                                          handleSincronizarEstadoTaller(ord, "Pendiente");
                                        }}
                                        className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-amber-500/10 transition-colors ${
                                          estadoCfg.tipo === "espera" ? "text-amber-600 font-bold bg-amber-500/5" : "text-zinc-700 dark:text-zinc-300"
                                        }`}
                                      >
                                        <span className="w-2 h-2 rounded-full bg-amber-500/70" />
                                        <span>En espera</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Acción: ver orden completa */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
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
              <Paginacion
                paginaActual={paginaValida}
                totalElementos={ordenesFiltradas.length}
                onCambiarPagina={setPaginaActual}
              />
            </div>
          </div>
        )}
      </main>

      <PosMobileNav />
    </div>
  );
}
