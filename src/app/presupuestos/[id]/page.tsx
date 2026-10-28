"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

// ============================================================================
// INTERFACES
// ============================================================================

export type EspecialidadTipo = "TALLER" | "LUBRICENTRO" | "CARWASH" | "TECNICENTRO";

interface ItemPropuesta {
  id: string;
  productId?: string | null;
  code?: string;
  name: string;
  qty: number;
  costPrice: number;
  price: number;
  subtotalVenta: number;
  subtotalCosto: number;
  margin: number;
  marginPercent: number;
  supplierId?: string | null;
  supplierName?: string;
  supplierPhone?: string;
  purchaseStatus?: string;
  notes?: string;
  inStock?: boolean; // true = en stock taller, false = comprar a proveedor externo
  origin?: EspecialidadTipo;
  imageUrl?: string | null;
}

interface ServicioPropuesta {
  id: string;
  code?: string;
  name: string;
  category?: string;
  price: number;
  estimatedMinutes?: number;
  mechanic?: string;
  origin?: EspecialidadTipo;
}

interface EvidenciaItem {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  mimeType: string;
  durationSeconds?: number | null;
  transcriptionText?: string | null;
  uploadedBy?: string | null;
  createdAt?: string | null;
}

interface OrdenDetalleCompleta {
  id: string;
  orderNumber: string;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone?: string;
  clientIdDoc?: string;
  mechanic: string;
  status: string;
  progress: number;
  notes?: string;
  dateIn?: string;
  quoteNumber: string;
  quoteStatus: string;
  items: ItemPropuesta[];
  services: ServicioPropuesta[];
  evidencias: EvidenciaItem[];
}

export const ESPECIALIDADES = [
  {
    id: "TODOS" as const,
    shortName: "Todos",
    name: "Todas las Especialidades",
    color: "zinc",
    bgClass: "bg-zinc-500/10 dark:bg-white/10",
    borderClass: "border-zinc-500/30 dark:border-white/20",
    textClass: "text-zinc-900 dark:text-white",
    shadowClass: "shadow-sm shadow-zinc-500/10",
    dotClass: "bg-zinc-500",
    svg: (className = "w-4 h-4") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-13.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: "TALLER" as const,
    shortName: "Taller",
    name: "Taller Mecánico",
    color: "blue",
    bgClass: "bg-blue-500/10 dark:bg-blue-500/15",
    borderClass: "border-blue-500/30 dark:border-blue-400/35",
    textClass: "text-blue-600 dark:text-blue-300",
    shadowClass: "shadow-sm shadow-blue-500/10",
    dotClass: "bg-blue-500",
    svg: (className = "w-4 h-4") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39" />
      </svg>
    ),
  },
  {
    id: "LUBRICENTRO" as const,
    shortName: "Lubricentro",
    name: "Lubricentro Express",
    color: "amber",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/15",
    borderClass: "border-amber-500/30 dark:border-amber-400/35",
    textClass: "text-amber-600 dark:text-amber-300",
    shadowClass: "shadow-sm shadow-amber-500/10",
    dotClass: "bg-amber-500",
    svg: (className = "w-4 h-4") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    ),
  },
  {
    id: "CARWASH" as const,
    shortName: "Car Wash",
    name: "Car Wash & Detailing",
    color: "purple",
    bgClass: "bg-purple-500/10 dark:bg-purple-500/15",
    borderClass: "border-purple-500/30 dark:border-purple-400/35",
    textClass: "text-purple-600 dark:text-purple-300",
    shadowClass: "shadow-sm shadow-purple-500/10",
    dotClass: "bg-purple-500",
    svg: (className = "w-4 h-4") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    id: "TECNICENTRO" as const,
    shortName: "Tecnicentro",
    name: "Tecnicentro Automotriz",
    color: "emerald",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/15",
    borderClass: "border-emerald-500/30 dark:border-emerald-400/35",
    textClass: "text-emerald-600 dark:text-emerald-300",
    shadowClass: "shadow-sm shadow-emerald-500/10",
    dotClass: "bg-emerald-500",
    svg: (className = "w-4 h-4") => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
      </svg>
    ),
  },
];

function deducirEspecialidad(nombre: string, categoria: string = ""): EspecialidadTipo {
  const texto = `${nombre} ${categoria}`.toLowerCase();
  if (texto.includes("aceite") || texto.includes("lubric") || texto.includes("valvulina") || texto.includes("filtro de aceite")) {
    return "LUBRICENTRO";
  }
  if (texto.includes("lavado") || texto.includes("carwash") || texto.includes("car wash") || texto.includes("detailing") || texto.includes("cera") || texto.includes("shampoo")) {
    return "CARWASH";
  }
  if (texto.includes("llanta") || texto.includes("neumat") || texto.includes("alineac") || texto.includes("balanceo") || texto.includes("bater")) {
    return "TECNICENTRO";
  }
  return "TALLER";
}

export default function PaginaDetallePropuesta() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [orden, setOrden] = useState<OrdenDetalleCompleta | null>(null);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [especialidadFiltro, setEspecialidadFiltro] = useState<EspecialidadTipo | "TODOS">("TODOS");

  // Estado editable de repuestos y servicios
  const [repuestos, setRepuestos] = useState<ItemPropuesta[]>([]);
  const [servicios, setServicios] = useState<ServicioPropuesta[]>([]);

  // Notificaciones y modales
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [modalWhatsApp, setModalWhatsApp] = useState(false);
  const [modalNuevoRepuesto, setModalNuevoRepuesto] = useState(false);
  const [modalNuevoServicio, setModalNuevoServicio] = useState(false);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);

  // Formulario rápido para nuevo repuesto
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCosto, setNuevoCosto] = useState("0");
  const [nuevoPvp, setNuevoPvp] = useState("0");
  const [nuevaCantidad, setNuevaCantidad] = useState("1");
  const [nuevoOrigen, setNuevoOrigen] = useState<EspecialidadTipo>("TALLER");
  const [nuevoProveedor, setNuevoProveedor] = useState("Proveedor General");
  const [nuevoEnStock, setNuevoEnStock] = useState(false);

  // Formulario rápido para nuevo servicio
  const [nuevoServicioNombre, setNuevoServicioNombre] = useState("");
  const [nuevoServicioPrecio, setNuevoServicioPrecio] = useState("0");
  const [nuevoServicioOrigen, setNuevoServicioOrigen] = useState<EspecialidadTipo>("TALLER");

  const mostrarToast = (msg: string, tipo: "ok" | "err" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // Cargar datos de la orden desde Neon PostgreSQL
  useEffect(() => {
    async function cargarDetalle() {
      if (!id) return;
      try {
        setCargando(true);
        setError("");
        const res = await fetch(`/api/presupuestos/detalle?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data.success && data.order) {
          const ord = data.order;
          setOrden(ord);
          setProveedores(data.proveedores || []);

          // Inicializar repuestos con origen deducido y flag de inStock
          const itemsInit = (ord.items || []).map((it: any) => ({
            ...it,
            origin: it.origin || deducirEspecialidad(it.name, it.category),
            inStock: it.inStock !== undefined ? Boolean(it.inStock) : Boolean(it.purchaseStatus === "STOCK_LOCAL"),
          }));
          setRepuestos(itemsInit);

          // Inicializar servicios
          const srvInit = (ord.services || []).map((sv: any) => ({
            ...sv,
            origin: sv.origin || deducirEspecialidad(sv.name, sv.category),
          }));
          setServicios(srvInit);
        } else {
          setError(data.error || "No se encontró el presupuesto solicitado.");
        }
      } catch {
        setError("Error de conexión al cargar el presupuesto.");
      } finally {
        setCargando(false);
      }
    }
    cargarDetalle();
  }, [id]);

  // Modificar cantidad
  const handleUpdateQty = (itemId: string, delta: number) => {
    setRepuestos((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const newQty = Math.max(1, (it.qty || 1) + delta);
          const subtotalVenta = Number((it.price * newQty).toFixed(2));
          const subtotalCosto = Number((it.costPrice * newQty).toFixed(2));
          const margin = Number(((it.price - it.costPrice) * newQty).toFixed(2));
          return { ...it, qty: newQty, subtotalVenta, subtotalCosto, margin };
        }
        return it;
      })
    );
  };

  // Modificar precios en línea
  const handleUpdatePrice = (itemId: string, field: "costPrice" | "price", valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setRepuestos((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const costPrice = field === "costPrice" ? val : it.costPrice;
          const price = field === "price" ? val : it.price;
          const subtotalVenta = Number((price * it.qty).toFixed(2));
          const subtotalCosto = Number((costPrice * it.qty).toFixed(2));
          const margin = Number(((price - costPrice) * it.qty).toFixed(2));
          const marginPercent = price > 0 ? Math.round(((price - costPrice) / price) * 100) : 0;
          return { ...it, costPrice, price, subtotalVenta, subtotalCosto, margin, marginPercent };
        }
        return it;
      })
    );
  };

  // Modificar switch En Stock vs Comprar a Proveedor
  const handleToggleStock = (itemId: string) => {
    setRepuestos((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const nextStock = !it.inStock;
          return {
            ...it,
            inStock: nextStock,
            purchaseStatus: nextStock ? "STOCK_LOCAL" : "POR_PEDIR",
          };
        }
        return it;
      })
    );
  };

  // Modificar proveedor asignado
  const handleUpdateSupplier = (itemId: string, supplierName: string) => {
    setRepuestos((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, supplierName } : it))
    );
  };

  // Eliminar repuesto
  const handleDeleteItem = (itemId: string) => {
    setRepuestos((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Eliminar servicio
  const handleDeleteService = (srvId: string) => {
    setServicios((prev) => prev.filter((sv) => sv.id !== srvId));
  };

  // Modificar precio de servicio en línea
  const handleUpdateServicePrice = (srvId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setServicios((prev) =>
      prev.map((sv) => (sv.id === srvId ? { ...sv, price: val } : sv))
    );
  };

  // Totales financieros calculados en tiempo real
  const calculos = useMemo(() => {
    const totalCostoRepuestos = repuestos.reduce((acc, it) => acc + (it.inStock ? 0 : it.subtotalCosto), 0);
    const totalVentaRepuestos = repuestos.reduce((acc, it) => acc + it.subtotalVenta, 0);
    const totalVentaServicios = servicios.reduce((acc, sv) => acc + sv.price, 0);
    const totalPvpCliente = Number((totalVentaRepuestos + totalVentaServicios).toFixed(2));
    const margenTotal = Number((totalPvpCliente - totalCostoRepuestos).toFixed(2));
    const margenPorcentaje = totalPvpCliente > 0 ? Math.round((margenTotal / totalPvpCliente) * 100) : 0;

    return {
      totalCostoCompras: totalCostoRepuestos,
      totalPvpCliente,
      margenTotal,
      margenPorcentaje,
      itemsPorComprar: repuestos.filter((r) => !r.inStock),
      itemsEnStock: repuestos.filter((r) => r.inStock),
    };
  }, [repuestos, servicios]);

  // Filtrar ítems y servicios según la especialidad seleccionada
  const repuestosVisibles = useMemo(() => {
    if (especialidadFiltro === "TODOS") return repuestos;
    return repuestos.filter((it) => it.origin === especialidadFiltro);
  }, [repuestos, especialidadFiltro]);

  const serviciosVisibles = useMemo(() => {
    if (especialidadFiltro === "TODOS") return servicios;
    return servicios.filter((sv) => sv.origin === especialidadFiltro);
  }, [servicios, especialidadFiltro]);

  // Guardar Cambios en Neon PostgreSQL
  const handleGuardarBorrador = async () => {
    if (!orden) return;
    try {
      setGuardando(true);
      const res = await fetch("/api/presupuestos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orden.id,
          items: repuestos,
          services: servicios,
          quoteStatus: orden.quoteStatus || "Cotizando",
        }),
      });
      const data = await res.json();
      if (data.success) {
        mostrarToast("Cambios guardados correctamente.");
      } else {
        mostrarToast(data.error || "No se pudo guardar.", "err");
      }
    } catch {
      mostrarToast("Error de conexión al guardar cambios.", "err");
    } finally {
      setGuardando(false);
    }
  };

  // Autorizar Cobro y Enviar al POS de Venta
  const handleAutorizarYEnviarAPos = async () => {
    if (!orden) return;
    if (repuestos.length === 0 && servicios.length === 0) {
      mostrarToast("Agrega al menos un repuesto o servicio antes de autorizar.", "err");
      return;
    }
    try {
      setAutorizando(true);
      const res = await fetch("/api/presupuestos/autorizar-cobro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orden.id,
          items: repuestos,
          services: servicios,
        }),
      });
      const data = await res.json();
      if (data.success) {
        mostrarToast("¡Presupuesto autorizado y enviado a Caja POS con éxito!");
        setOrden((prev) => (prev ? { ...prev, quoteStatus: "Aprobado", status: "EN_CAJA" } : null));
      } else {
        mostrarToast(data.error || "No se pudo autorizar el cobro.", "err");
      }
    } catch {
      mostrarToast("Error de red al transferir a POS.", "err");
    } finally {
      setAutorizando(false);
    }
  };

  // Agregar nuevo repuesto
  const handleAgregarRepuesto = () => {
    if (!nuevoNombre.trim()) return;
    const qty = parseInt(nuevaCantidad, 10) || 1;
    const cost = parseFloat(nuevoCosto) || 0;
    const pvp = parseFloat(nuevoPvp) || 0;
    const subtotalVenta = Number((pvp * qty).toFixed(2));
    const subtotalCosto = Number((cost * qty).toFixed(2));
    const margin = Number(((pvp - cost) * qty).toFixed(2));
    const marginPercent = pvp > 0 ? Math.round(((pvp - cost) / pvp) * 100) : 0;

    const nuevoItem: ItemPropuesta = {
      id: `rep_manual_${Date.now()}`,
      name: nuevoNombre.trim(),
      qty,
      costPrice: cost,
      price: pvp,
      subtotalVenta,
      subtotalCosto,
      margin,
      marginPercent,
      supplierName: nuevoEnStock ? "Bodega Taller" : nuevoProveedor,
      purchaseStatus: nuevoEnStock ? "STOCK_LOCAL" : "POR_PEDIR",
      inStock: nuevoEnStock,
      origin: nuevoOrigen,
    };

    setRepuestos((prev) => [...prev, nuevoItem]);
    setNuevoNombre("");
    setNuevoCosto("0");
    setNuevoPvp("0");
    setNuevaCantidad("1");
    setModalNuevoRepuesto(false);
    mostrarToast("Repuesto agregado al expediente.");
  };

  // Agregar nuevo servicio
  const handleAgregarServicio = () => {
    if (!nuevoServicioNombre.trim()) return;
    const precio = parseFloat(nuevoServicioPrecio) || 0;
    const nuevoSrv: ServicioPropuesta = {
      id: `srv_manual_${Date.now()}`,
      name: nuevoServicioNombre.trim(),
      category: "Mano de Obra",
      price: precio,
      mechanic: orden?.mechanic || "Taller",
      origin: nuevoServicioOrigen,
    };
    setServicios((prev) => [...prev, nuevoSrv]);
    setNuevoServicioNombre("");
    setNuevoServicioPrecio("0");
    setModalNuevoServicio(false);
    mostrarToast("Servicio técnico agregado.");
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">Cargando expediente de la propuesta...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111113] border border-rose-500/30 rounded-3xl p-6 text-center space-y-4">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-lg font-bold text-white">{error || "Propuesta no disponible"}</h2>
            <Link
              href="/presupuestos"
              className="inline-flex h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold items-center justify-center transition-all cursor-pointer"
            >
              ← Volver a Propuestas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const esAprobado = orden.quoteStatus === "Aprobado" || orden.status === "EN_CAJA";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans pb-32 text-zinc-900 dark:text-white selection:bg-blue-500/30">
      <Header />

      {/* Toast Notificaciones */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 animate-bounce ${
            toast.tipo === "ok"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span>{toast.tipo === "ok" ? "✓" : "✕"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Subheader / Ficha del Vehículo y Estado */}
      <section className="border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c]/80 backdrop-blur-md sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Navegación y Datos del Auto */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/presupuestos"
              title="Volver a lista de propuestas"
              className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              ←
            </Link>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold border border-blue-500/30">
                  #{orden.orderNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-white font-mono text-xs font-bold border border-zinc-200 dark:border-white/10 uppercase">
                  {orden.plate}
                </span>
                <h1 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white truncate">
                  {orden.vehicle}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Cliente: <strong className="text-zinc-800 dark:text-zinc-200">{orden.client}</strong> {orden.clientPhone && `• Tel: ${orden.clientPhone}`} • Mecánico: <strong className="text-zinc-800 dark:text-zinc-200">{orden.mechanic}</strong>
              </p>
            </div>
          </div>

          {/* Etiqueta de Estado y Acciones Rápidas */}
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={() => setModalWhatsApp(true)}
              className="h-10 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-600 dark:text-emerald-300 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Generar catálogo con fotos grandes para proveedores"
            >
              <span>📲</span>
              <span className="hidden sm:inline">Catálogo Proveedores WhatsApp</span>
            </button>

            <span
              className={`h-10 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
                esAprobado
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${esAprobado ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
              <span>{esAprobado ? "✓ Aprobado" : "Enviado"}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Selector Superior de Especialidad idéntico a Taller (Taller, Lubricentro, Car Wash, Tecnicentro + Engranaje) */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-2xl bg-white/80 dark:bg-[#0d0d0e] border border-zinc-200 dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-xl gap-1 shrink-0 overflow-x-auto max-w-full">
              {ESPECIALIDADES.map((mod) => {
                const isActivo = especialidadFiltro === mod.id;
                const countItems =
                  mod.id === "TODOS"
                    ? repuestos.length + servicios.length
                    : repuestos.filter((r) => r.origin === mod.id).length + servicios.filter((s) => s.origin === mod.id).length;

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setEspecialidadFiltro(mod.id)}
                    className={`h-9 px-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isActivo
                        ? `${mod.bgClass} border ${mod.borderClass} ${mod.textClass} ${mod.shadowClass} backdrop-blur-sm`
                        : "border border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                    }`}
                    title={mod.name}
                  >
                    {mod.svg("w-4 h-4 shrink-0")}
                    <span className="whitespace-nowrap">{mod.shortName}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActivo ? "bg-white/20" : "bg-zinc-200 dark:bg-white/10"}`}>
                      {countItems}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* BOTÓN ENGRANAJE IDÉNTICO A TALLER */}
            <button
              type="button"
              className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/80 dark:bg-[#0d0d0e] border border-zinc-200 dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer group shrink-0"
              title="Especialidades del Taller"
              aria-label="Especialidades"
            >
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalNuevoRepuesto(true)}
              className="h-9 px-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <span>+</span>
              <span>Repuesto / Insumo</span>
            </button>

            <button
              type="button"
              onClick={() => setModalNuevoServicio(true)}
              className="h-9 px-3.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1"
            >
              <span>+</span>
              <span>Servicio Técnico</span>
            </button>
          </div>
        </div>

        {/* Sección 1: Repuestos & Insumos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>⚙️</span>
              <span>Repuestos e Insumos ({repuestosVisibles.length})</span>
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Marca si está en bodega o si se compra a proveedor
            </span>
          </div>

          {repuestosVisibles.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 text-xs">
              No hay repuestos registrados para esta especialidad.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {repuestosVisibles.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-white/10 p-4 shadow-sm hover:border-zinc-300 dark:hover:border-white/20 transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
                >
                  {/* Datos del Repuesto & Switch de Stock */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-500 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
                      {item.origin === "LUBRICENTRO" ? "🛢️" : item.origin === "CARWASH" ? "🚿" : item.origin === "TECNICENTRO" ? "⚙️" : "🔧"}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10">
                          {item.origin || "Taller"}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                          {item.name}
                        </h3>
                      </div>

                      {/* Selector Stock Taller vs Pedir Proveedor */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStock(item.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                            item.inStock
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
                              : "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300"
                          }`}
                        >
                          <span>{item.inStock ? "📦 En Stock Taller" : "🚚 Por Comprar Externo"}</span>
                        </button>

                        {!item.inStock && (
                          <select
                            value={item.supplierName || "Proveedor General"}
                            onChange={(e) => handleUpdateSupplier(item.id, e.target.value)}
                            className="h-7 px-2 rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Proveedor General">Proveedor General</option>
                            <option value="Bosch Store">Bosch Store</option>
                            <option value="Repuestos Pichincha">Repuestos Pichincha</option>
                            <option value="Llantera Express">Llantera Express</option>
                            <option value="Distribuidora de Lubricantes">Distribuidora de Lubricantes</option>
                            {proveedores.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cantidad, Costo, PVP y Margen */}
                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-white/5">
                    {/* Stepper Cantidad */}
                    <div className="flex items-center border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden bg-zinc-50 dark:bg-black">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-bold text-zinc-900 dark:text-white">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    {/* Costo de Compra */}
                    <div className="w-24">
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Costo Unit ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.costPrice}
                        onChange={(e) => handleUpdatePrice(item.id, "costPrice", e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* PVP Venta Cliente */}
                    <div className="w-24">
                      <label className="text-[10px] text-zinc-400 block mb-0.5">PVP Venta ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={(e) => handleUpdatePrice(item.id, "price", e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-zinc-50 dark:bg-black border border-emerald-500/30 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Margen */}
                    <div className="w-24 text-right">
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Margen</label>
                      <span className={`text-xs font-mono font-black ${item.margin >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        ${item.margin.toFixed(2)} ({item.marginPercent}%)
                      </span>
                    </div>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="w-8 h-8 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer text-sm"
                      title="Eliminar repuesto"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sección 2: Servicios & Mano de Obra */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>👨‍🔧</span>
              <span>Servicios Técnicos & Mano de Obra ({serviciosVisibles.length})</span>
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Mantenimientos, diagnósticos y servicios
            </span>
          </div>

          {serviciosVisibles.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 text-xs">
              No hay servicios registrados para esta especialidad.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {serviciosVisibles.map((sv) => (
                <div
                  key={sv.id}
                  className="bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-white/10 p-4 shadow-sm hover:border-zinc-300 dark:hover:border-white/20 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-500 dark:text-purple-400 flex items-center justify-center text-lg shrink-0">
                      🛠️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10">
                          {sv.origin || "Taller"}
                        </span>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                          {sv.name}
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Técnico asignado: <strong className="text-zinc-800 dark:text-zinc-200">{sv.mechanic || orden.mechanic}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="w-28 text-right">
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Precio Servicio ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={sv.price}
                        onChange={(e) => handleUpdateServicePrice(sv.id, e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-zinc-50 dark:bg-black border border-purple-500/30 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-right"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteService(sv.id)}
                      className="w-8 h-8 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer text-sm"
                      title="Eliminar servicio"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sección 3: Evidencias y Fotos de Inspección */}
        {orden.evidencias && orden.evidencias.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>📸</span>
              <span>Evidencias y Fotos de Inspección ({orden.evidencias.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {orden.evidencias.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setFotoZoom(ev.url)}
                  className="h-28 rounded-2xl bg-zinc-100 dark:bg-[#111113] border border-zinc-200 dark:border-white/10 overflow-hidden cursor-pointer relative group shadow-sm"
                >
                  <img src={ev.url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-bold">
                    🔍 Ver
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Barra Inferior Sticky con Resumen Financiero y Acciones */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-[#0a0a0c]/90 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Métricas Financieras */}
          <div className="flex items-center justify-between md:justify-start gap-4 sm:gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Costo Compras</span>
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                ${calculos.totalCostoCompras.toFixed(2)}
              </span>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10" />

            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">PVP Total Cliente</span>
              <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                ${calculos.totalPvpCliente.toFixed(2)}
              </span>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10" />

            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Margen</span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                ${calculos.margenTotal.toFixed(2)} ({calculos.margenPorcentaje}%)
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              disabled={guardando}
              onClick={handleGuardarBorrador}
              className="h-11 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "💾 Guardar Cambios"}
            </button>

            <button
              type="button"
              disabled={autorizando}
              onClick={handleAutorizarYEnviarAPos}
              className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <span>🚀</span>
              <span>{autorizando ? "Transfiriendo..." : "Autorizar Cobro y Pasar a POS →"}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Catálogo WhatsApp para Proveedores */}
      {modalWhatsApp && (
        <div
          onClick={() => setModalWhatsApp(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-up"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>📲</span>
                  <span>Catálogo Digital para Proveedores</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Comparte fotos grandes y requerimientos sin precios de venta ni datos confidenciales.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalWhatsApp(false)}
                className="w-8 h-8 rounded-xl bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Opción 1: Pedido Individual */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">1. Pedido de este Vehículo ({orden.plate})</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                    Individual
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Envía únicamente los {calculos.itemsPorComprar.length} repuestos requeridos para el {orden.vehicle}.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hola, te comparto el pedido de repuestos para el vehículo ${orden.vehicle} (Placa: ${orden.plate}). Puedes revisar fotos grandes y especificaciones aquí: ${window.location.origin}/pedidos-proveedor/${orden.id}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <span>💬 Enviar por WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/pedidos-proveedor/${orden.id}`);
                      mostrarToast("Enlace copiado al portapapeles.");
                    }}
                    className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
                  >
                    Copiar Link
                  </button>
                </div>
              </div>

              {/* Opción 2: Consolidado del Día */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">2. Consolidado de Pedidos del Día</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">
                    Del Día
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Agrupa todos los repuestos por comprar de todos los vehículos recibidos hoy.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hola, te comparto el consolidado general de repuestos requeridos para el taller hoy. Puedes revisar fotos y lista completa aquí: ${window.location.origin}/pedidos-proveedor/diario`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
                  >
                    <span>💬 Enviar Consolidado</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/pedidos-proveedor/diario`);
                      mostrarToast("Enlace del día copiado.");
                    }}
                    className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
                  >
                    Copiar Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Nuevo Repuesto */}
      {modalNuevoRepuesto && (
        <div
          onClick={() => setModalNuevoRepuesto(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">+ Agregar Repuesto / Insumo</h3>
              <button
                type="button"
                onClick={() => setModalNuevoRepuesto(false)}
                className="w-8 h-8 rounded-xl bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Descripción del Repuesto</label>
                <input
                  type="text"
                  placeholder="Ej: Filtro de Aceite Bosch Original"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={nuevaCantidad}
                    onChange={(e) => setNuevaCantidad(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoCosto}
                    onChange={(e) => setNuevoCosto(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">PVP ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoPvp}
                    onChange={(e) => setNuevoPvp(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-black border border-emerald-500/30 text-xs text-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Especialidad</label>
                  <select
                    value={nuevoOrigen}
                    onChange={(e) => setNuevoOrigen(e.target.value as EspecialidadTipo)}
                    className="w-full h-10 px-2 rounded-xl bg-black border border-white/10 text-xs text-white"
                  >
                    <option value="TALLER">🔧 Taller</option>
                    <option value="LUBRICENTRO">🛢️ Lubricentro</option>
                    <option value="CARWASH">🚿 Car Wash</option>
                    <option value="TECNICENTRO">⚙️ Tecnicentro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Disponibilidad</label>
                  <button
                    type="button"
                    onClick={() => setNuevoEnStock(!nuevoEnStock)}
                    className={`w-full h-10 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      nuevoEnStock
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    }`}
                  >
                    {nuevoEnStock ? "📦 En Stock" : "🚚 Por Comprar"}
                  </button>
                </div>
              </div>

              {!nuevoEnStock && (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Proveedor Externo</label>
                  <input
                    type="text"
                    value={nuevoProveedor}
                    onChange={(e) => setNuevoProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                    className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-xs text-white"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAgregarRepuesto}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  Agregar Repuesto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Nuevo Servicio */}
      {modalNuevoServicio && (
        <div
          onClick={() => setModalNuevoServicio(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">+ Agregar Servicio Técnico</h3>
              <button
                type="button"
                onClick={() => setModalNuevoServicio(false)}
                className="w-8 h-8 rounded-xl bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  placeholder="Ej: Cambio de Aceite y Filtros"
                  value={nuevoServicioNombre}
                  onChange={(e) => setNuevoServicioNombre(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Precio Servicio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoServicioPrecio}
                    onChange={(e) => setNuevoServicioPrecio(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-black border border-purple-500/30 text-xs text-purple-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Especialidad</label>
                  <select
                    value={nuevoServicioOrigen}
                    onChange={(e) => setNuevoServicioOrigen(e.target.value as EspecialidadTipo)}
                    className="w-full h-10 px-2 rounded-xl bg-black border border-white/10 text-xs text-white"
                  >
                    <option value="TALLER">🔧 Taller</option>
                    <option value="LUBRICENTRO">🛢️ Lubricentro</option>
                    <option value="CARWASH">🚿 Car Wash</option>
                    <option value="TECNICENTRO">⚙️ Tecnicentro</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAgregarServicio}
                  className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  Agregar Servicio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Foto Evidencia */}
      {fotoZoom && (
        <div
          onClick={() => setFotoZoom(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setFotoZoom(null)}
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 flex items-center justify-center text-lg z-10 cursor-pointer"
            >
              ✕
            </button>
            <img src={fotoZoom} alt="Foto ampliada" className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10" />
          </div>
        </div>
      )}
    </div>
  );
}
