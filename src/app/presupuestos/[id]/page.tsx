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
  inStock?: boolean; // true = sí hay en bodega taller, false = pedir a proveedor externo
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
  mileage?: number | string | null;
  fuelLevel?: string | null;
  notes?: string;
  dateIn?: string;
  createdAt?: any;
  quoteNumber: string;
  quoteStatus: string;
  quoteApprovedAt?: string | null;
  quoteTaxRate?: number;
  quoteDiscount?: number;
  items: ItemPropuesta[];
  services: ServicioPropuesta[];
  evidencias: EvidenciaItem[];
}

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

function renderBadgeEspecialidad(origen?: EspecialidadTipo) {
  switch (origen) {
    case "LUBRICENTRO":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
          <span>🛢️</span>
          <span>Lubricentro</span>
        </span>
      );
    case "CARWASH":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
          <span>🚿</span>
          <span>Car Wash</span>
        </span>
      );
    case "TECNICENTRO":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
          <span>⚙️</span>
          <span>Tecnicentro</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300">
          <span>🔧</span>
          <span>Taller</span>
        </span>
      );
  }
}

export default function PaginaDetallePropuesta() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [orden, setOrden] = useState<OrdenDetalleCompleta | null>(null);
  const [proveedores, setProveedores] = useState<any[]>([]);

  // Estado editable de repuestos, servicios y notas
  const [repuestos, setRepuestos] = useState<ItemPropuesta[]>([]);
  const [servicios, setServicios] = useState<ServicioPropuesta[]>([]);
  const [notasFactura, setNotasFactura] = useState("");
  const [porcentajeIva, setPorcentajeIva] = useState(15);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);

  // Notificaciones y modales
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [modalWhatsApp, setModalWhatsApp] = useState(false);
  const [modalNuevoRepuesto, setModalNuevoRepuesto] = useState(false);
  const [modalNuevoServicio, setModalNuevoServicio] = useState(false);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [esAprobadoLocal, setEsAprobadoLocal] = useState<boolean | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

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
        if (!res.ok) {
          let errText = `Error (${res.status})`;
          try {
            const errJson = await res.json();
            errText = errJson.error || errText;
          } catch {}
          setError(errText);
          return;
        }
        const data = await res.json();
        if (data.success && data.order) {
          const ord = data.order;
          setOrden(ord);
          setProveedores(data.proveedores || []);
          setNotasFactura(ord.notes || "");
          setPorcentajeIva(Number(ord.quoteTaxRate ?? 15));
          setPorcentajeDescuento(Number(ord.quoteDiscount ?? 0));

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

  // Modificar Casillero: Sí hay en Bodega (Taller) vs Pedir a Proveedor Externo
  const handleToggleStock = (itemId: string) => {
    setRepuestos((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const nextStock = !it.inStock;
          return {
            ...it,
            inStock: nextStock,
            purchaseStatus: nextStock ? "STOCK_LOCAL" : "POR_PEDIR",
            supplierName: nextStock ? "Bodega Taller" : (it.supplierName === "Bodega Taller" ? "Proveedor General" : it.supplierName),
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

  // Totales financieros calculados en tiempo real estilo liquidación de Factura
  const calculos = useMemo(() => {
    const subtotalRepuestos = repuestos.reduce((acc, it) => acc + (it.price * it.qty), 0);
    const subtotalServicios = servicios.reduce((acc, sv) => acc + sv.price, 0);
    const subtotalBruto = Number((subtotalRepuestos + subtotalServicios).toFixed(2));

    const descuento = Number((subtotalBruto * (porcentajeDescuento / 100)).toFixed(2));
    const subtotalNeto = Math.max(0, Number((subtotalBruto - descuento).toFixed(2)));

    const iva = Number((subtotalNeto * (porcentajeIva / 100)).toFixed(2));
    const totalFacturaCliente = Number((subtotalNeto + iva).toFixed(2));

    // Solo se pagan a proveedores los repuestos que NO están en bodega
    const itemsPorComprar = repuestos.filter((r) => !r.inStock);
    const itemsEnBodega = repuestos.filter((r) => r.inStock);

    const totalCostoComprasExternas = Number(
      itemsPorComprar.reduce((acc, it) => acc + (it.costPrice * it.qty), 0).toFixed(2)
    );

    // Margen para el taller = PVP Neto - Costos de Compras Externas
    const margenNetoTaller = Number((subtotalNeto - totalCostoComprasExternas).toFixed(2));
    const margenPorcentaje = subtotalNeto > 0 ? Math.round((margenNetoTaller / subtotalNeto) * 100) : 0;

    return {
      subtotalRepuestos,
      subtotalServicios,
      subtotalBruto,
      descuento,
      subtotalNeto,
      iva,
      totalFacturaCliente,
      totalCostoComprasExternas,
      margenNetoTaller,
      margenPorcentaje,
      itemsPorComprar,
      itemsEnBodega,
    };
  }, [repuestos, servicios, porcentajeDescuento, porcentajeIva]);

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
          notes: notasFactura,
          quoteStatus: orden.quoteStatus || "Cotizando",
        }),
      });
      if (!res.ok) {
        let errText = `Error al guardar (${res.status})`;
        try {
          const errJson = await res.json();
          errText = errJson.error || errText;
        } catch {}
        mostrarToast(errText, "err");
        return;
      }
      const data = await res.json();
      if (data.success) {
        mostrarToast("Factura / Presupuesto guardado correctamente.");
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
      mostrarToast("Agrega al menos un ítem o servicio a la factura antes de autorizar.", "err");
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
          notes: notasFactura,
        }),
      });
      if (!res.ok) {
        let errText = `Error al transferir a POS (${res.status})`;
        try {
          const errJson = await res.json();
          errText = errJson.error || errText;
        } catch {}
        mostrarToast(errText, "err");
        return;
      }
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
    mostrarToast("Ítem agregado a la factura.");
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
    mostrarToast("Mano de obra agregada a la factura.");
  };

  const handleImprimir = () => {
    window.print();
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">Cargando factura proforma del vehículo...</p>
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
          <div className="max-w-md w-full bg-white dark:bg-[#111113] border border-rose-500/30 rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{error || "Factura / Presupuesto no disponible"}</h2>
            <Link
              href="/presupuestos"
              className="inline-flex h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold items-center justify-center transition-all cursor-pointer"
            >
              ← Volver a Presupuestos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const esAprobado = esAprobadoLocal !== null ? esAprobadoLocal : (orden.quoteStatus === "Aprobado" || orden.status === "EN_CAJA");

  const limpiarNumeroOrden = (val?: string | number | null) => {
    if (!val) return "";
    return String(val).replace(/\bOT\b/gi, "").replace(/#+/g, "").trim();
  };

  const handleToggleEstado = async () => {
    if (cambiandoEstado) return;
    const nuevoEstado = esAprobado ? "Pendiente" : "Aprobado";
    try {
      setCambiandoEstado(true);
      const res = await fetch("/api/presupuestos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orden.id, quoteStatus: nuevoEstado }),
      });
      if (res.ok) {
        setEsAprobadoLocal(nuevoEstado === "Aprobado");
        mostrarToast(`Estado: ${nuevoEstado === "Aprobado" ? "Aprobado" : "En Espera"}`);
      } else {
        mostrarToast("No se pudo cambiar el estado", "err");
      }
    } catch {
      mostrarToast("Error de conexión al cambiar estado", "err");
    } finally {
      setCambiandoEstado(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#08080a] font-sans pb-36 text-zinc-900 dark:text-white selection:bg-blue-500/30">
      {/* Toast Notificaciones */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 animate-bounce print:hidden ${
            toast.tipo === "ok"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          <span>{toast.tipo === "ok" ? "✓" : "✕"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* CABECERA Y BARRA DE ACCIONES FIJAS SUPERIORES (NO SE IMPRIME, INMÓVIL AL SCROLL) */}
      <div className="print:hidden sticky top-0 z-40 bg-white dark:bg-[#08080a] shadow-xs">
        <Header />

        {/* Barra de Herramientas y Acciones Superior */}
        <section className="border-b border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <Link
                href="/presupuestos"
                title="Volver al panel de presupuestos"
                className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer active:scale-95 shrink-0 mt-0.5 sm:mt-0"
              >
                ←
              </Link>

              <div className="min-w-0 space-y-0.5">
                {/* 1. Orden de Servicio */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Orden de Servicio:</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    #{limpiarNumeroOrden(orden.orderNumber)}
                  </span>
                </div>

                {/* 2. Placa */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 font-semibold">Placa:</span>
                  <span className="font-mono font-black uppercase px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-white border border-zinc-300 dark:border-white/10">
                    {orden.plate}
                  </span>
                </div>

                {/* 3. Vehículo y Cliente */}
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 flex-wrap">
                  <span>
                    Vehículo: <strong className="font-bold text-zinc-900 dark:text-white">{orden.vehicle}</strong>
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">•</span>
                  <span>
                    Cliente: <strong className="font-bold text-zinc-900 dark:text-white">{orden.client}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                type="button"
                onClick={handleImprimir}
                className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 text-base transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                title="Imprimir Proforma"
                aria-label="Imprimir Proforma"
              >
                <span>🖨️</span>
              </button>

              <button
                type="button"
                onClick={() => setModalWhatsApp(true)}
                className="w-10 h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-600 dark:text-emerald-300 text-base transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs shrink-0"
                title="Catálogo Proveedores WhatsApp"
                aria-label="Catálogo Proveedores WhatsApp"
              >
                <span>📲</span>
              </button>

              <button
                type="button"
                disabled={cambiandoEstado}
                onClick={handleToggleEstado}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-black shadow-xs shrink-0 transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                  esAprobado
                    ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                    : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-600 dark:text-amber-400"
                }`}
                title={esAprobado ? "Propuesta Aprobada (clic para poner En Espera)" : "Propuesta En Espera (clic para Aprobar)"}
                aria-label={esAprobado ? "Estado: Aprobado" : "Estado: En Espera"}
              >
                <span>{cambiandoEstado ? "..." : (esAprobado ? "✓" : "⏳")}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* DOCUMENTO PRINCIPAL FORMATO FACTURA / PROFORMA */}
      <main className="max-w-6xl mx-auto p-3 sm:p-6 md:p-8 mt-4 sm:mt-6 print:m-0 print:p-0 print:max-w-none">
        <div className="bg-white dark:bg-[#0f0f13] border border-zinc-200 dark:border-white/10 rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl space-y-8 print:border-none print:shadow-none print:p-4 print:rounded-none">
          
          {/* CABECERA DE LA FACTURA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-3">
                {/* Logotipo Oficial Auto / G */}
                <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-2xl font-black tracking-tight leading-none">
                    <span className="text-blue-600 dark:text-blue-500">Auto</span>
                    <span className="text-zinc-400 dark:text-zinc-500 font-light px-0.5">/</span>
                    <span className="text-zinc-900 dark:text-white">G</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-1">
                    Centro Automotriz
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:text-right w-full sm:w-auto p-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 space-y-1.5 shrink-0">
              <div className="flex items-center gap-2 sm:justify-end flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                  Propuesta
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    esAprobado
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  {esAprobado ? "✓ Aprobado" : "⏳ En Espera"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-mono font-black text-zinc-900 dark:text-white pt-1">
                {orden.quoteNumber ? orden.quoteNumber.replace(/\bOT\b/gi, "").replace(/#+/g, "").trim() : `COT-${limpiarNumeroOrden(orden.orderNumber)}`}
              </h3>
              <p className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-200 pt-0.5">
                Fecha: <strong className="font-bold text-zinc-900 dark:text-white">{orden.dateIn ? new Date(orden.dateIn).toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}</strong>
              </p>
            </div>
          </div>

          {/* FICHA TÉCNICA DEL CLIENTE Y VEHÍCULO (ESTILO FACTURA) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cuadro Cliente */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-white/5">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Datos del Cliente</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  Titular
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Cliente / Razón Social:</span>
                  <strong className="text-zinc-900 dark:text-white font-semibold text-sm">{orden.client}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Cédula / RUC:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{orden.clientIdDoc || "9999999999"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Teléfono / WhatsApp:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{orden.clientPhone || "S/N"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Estado Operativo:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{orden.status || "En Taller"}</span>
                </div>
              </div>
            </div>

            {/* Cuadro Vehículo */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-white/5">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🚗</span>
                  <span>Datos del Vehículo</span>
                </span>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-amber-400 text-black border border-amber-500 uppercase">
                  {orden.plate}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[10px]">Marca / Modelo / Año:</span>
                  <strong className="text-zinc-900 dark:text-white font-semibold text-sm">{orden.vehicle}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Mecánico Responsable:</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{orden.mechanic || "Taller Principal"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Kilometraje Actual:</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {orden.mileage ? `${Number(orden.mileage).toLocaleString()} km` : "N/D"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px]">Combustible / Estado:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Tanque: {orden.fuelLevel || "1/2"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLA PRINCIPAL DE FACTURA: TODO LO QUE SE PIDIÓ (REPUESTOS, INSUMOS, SERVICIOS) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>📋</span>
                  <span>Detalle de Factura & Presupuesto</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Consolidado completo de todo lo pedido (Taller, Lubricentro, Car Wash y Tecnicentro).
                </p>
              </div>

              {/* Botones para agregar líneas directamente a la factura */}
              <div className="flex items-center gap-2 print:hidden flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalNuevoRepuesto(true)}
                  className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>+</span>
                  <span>Agregar Repuesto / Insumo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalNuevoServicio(true)}
                  className="h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>+</span>
                  <span>Agregar Mano de Obra</span>
                </button>
              </div>
            </div>

            {/* Banner Informativo del Casillero */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-300 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs shrink-0">
                  ℹ️
                </span>
                <span>
                  Usa el <strong>Casillero de Disponibilidad</strong> en cada repuesto para definir si <span className="text-emerald-600 dark:text-emerald-400 font-bold">sí hay en bodega</span> o si <span className="text-amber-600 dark:text-amber-400 font-bold">hay que pedirlo a proveedores externos</span>.
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span>📦</span> {calculos.itemsEnBodega.length} en Bodega
                </span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span>🚚</span> {calculos.itemsPorComprar.length} a Proveedor
                </span>
              </div>
            </div>

            {/* TABLA ESTILO FACTURA PROFORMA */}
            <div className="border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#121216] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04] text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 w-28">Área / Origen</th>
                      <th className="py-3 px-3 min-w-[220px]">Descripción del Ítem / Servicio</th>
                      <th className="py-3 px-3 w-64 text-center">
                        Disponibilidad (Casillero)
                      </th>
                      <th className="py-3 px-2 w-20 text-center">Cant.</th>
                      <th className="py-3 px-3 w-24 text-right">Costo Unit.</th>
                      <th className="py-3 px-3 w-24 text-right">PVP Unit.</th>
                      <th className="py-3 px-3 w-24 text-right">Subtotal</th>
                      <th className="py-3 px-3 w-24 text-right print:hidden">Margen</th>
                      <th className="py-3 px-2 w-10 text-center print:hidden"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-200 dark:divide-white/5 text-xs">
                    {repuestos.length === 0 && servicios.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-zinc-400 text-sm">
                          No hay repuestos ni servicios agregados en esta orden.
                        </td>
                      </tr>
                    ) : null}

                    {/* LÍNEAS DE REPUESTOS E INSUMOS */}
                    {repuestos.map((item, idx) => {
                      const itemNum = idx + 1;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* 1. Número */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-zinc-400">
                            {itemNum}
                          </td>

                          {/* 2. Área / Especialidad (Taller, Lubricentro, Car Wash, Tecnicentro) */}
                          <td className="py-3 px-3">
                            {renderBadgeEspecialidad(item.origin)}
                          </td>

                          {/* 3. Descripción */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <span className="font-bold text-zinc-900 dark:text-white block">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                                <span>{item.code || `REP-${itemNum}`}</span>
                                {item.notes && <span>• {item.notes}</span>}
                              </div>
                            </div>
                          </td>

                          {/* 4. CASILLERO DE DISPONIBILIDAD (SÍ HAY EN BODEGA VS PEDIR A PROVEEDOR EXTERNO) */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1.5 items-center justify-center">
                              {/* Casillero / Switch interactivo */}
                              <label
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                  item.inStock
                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                                    : "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={item.inStock}
                                    onChange={() => handleToggleStock(item.id)}
                                    className="w-4 h-4 rounded-md accent-emerald-600 cursor-pointer"
                                  />
                                  <span>{item.inStock ? "Sí hay en Bodega" : "Pedir a Proveedor"}</span>
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                                  {item.inStock ? "Bodega" : "Externo"}
                                </span>
                              </label>

                              {/* Si es externo, selector del proveedor asignado */}
                              {!item.inStock && (
                                <select
                                  value={item.supplierName || "Proveedor General"}
                                  onChange={(e) => handleUpdateSupplier(item.id, e.target.value)}
                                  className="w-full h-7 px-2 rounded-lg bg-zinc-50 dark:bg-black border border-amber-500/30 text-[11px] text-zinc-700 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  title="Proveedor asignado"
                                >
                                  <option value="Proveedor General">📦 Proveedor General</option>
                                  <option value="Bosch Store">Bosch Store</option>
                                  <option value="Repuestos Pichincha">Repuestos Pichincha</option>
                                  <option value="Llantera Express">Llantera Express</option>
                                  <option value="Distribuidora de Lubricantes">Distribuidora Lubricantes</option>
                                  {proveedores.map((p) => (
                                    <option key={p.id} value={p.name}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>

                          {/* 5. Cantidad */}
                          <td className="py-3 px-2 text-center">
                            <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-black print:border-none print:bg-transparent">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, -1)}
                                className="w-6 h-7 flex items-center justify-center text-zinc-500 hover:text-black dark:hover:text-white font-bold text-xs print:hidden"
                              >
                                -
                              </button>
                              <span className="w-7 text-center font-mono font-bold text-zinc-900 dark:text-white">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, 1)}
                                className="w-6 h-7 flex items-center justify-center text-zinc-500 hover:text-black dark:hover:text-white font-bold text-xs print:hidden"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* 6. Costo Unitario */}
                          <td className="py-3 px-3 text-right">
                            <div className="print:hidden">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.costPrice}
                                onChange={(e) => handleUpdatePrice(item.id, "costPrice", e.target.value)}
                                className="w-20 h-7 px-1.5 text-right rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 font-mono font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              />
                            </div>
                            <span className="hidden print:inline font-mono">
                              ${Number(item.costPrice).toFixed(2)}
                            </span>
                          </td>

                          {/* 7. PVP Unitario */}
                          <td className="py-3 px-3 text-right">
                            <div className="print:hidden">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price}
                                onChange={(e) => handleUpdatePrice(item.id, "price", e.target.value)}
                                className="w-20 h-7 px-1.5 text-right rounded-lg bg-zinc-50 dark:bg-black border border-emerald-500/30 font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                              />
                            </div>
                            <span className="hidden print:inline font-mono font-bold">
                              ${Number(item.price).toFixed(2)}
                            </span>
                          </td>

                          {/* 8. Subtotal */}
                          <td className="py-3 px-3 text-right font-mono font-black text-zinc-900 dark:text-white">
                            ${item.subtotalVenta.toFixed(2)}
                          </td>

                          {/* 9. Margen */}
                          <td className="py-3 px-3 text-right font-mono text-[11px] font-bold print:hidden">
                            <span className={item.margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>
                              ${item.margin.toFixed(2)} ({item.marginPercent}%)
                            </span>
                          </td>

                          {/* 10. Eliminar */}
                          <td className="py-3 px-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 inline-flex items-center justify-center transition-colors cursor-pointer text-xs"
                              title="Eliminar repuesto"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* LÍNEAS DE SERVICIOS / MANO DE OBRA */}
                    {servicios.map((sv, idx) => {
                      const itemNum = repuestos.length + idx + 1;
                      return (
                        <tr
                          key={sv.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors group bg-purple-500/[0.02]"
                        >
                          {/* 1. Número */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-zinc-400">
                            {itemNum}
                          </td>

                          {/* 2. Área / Especialidad */}
                          <td className="py-3 px-3">
                            {renderBadgeEspecialidad(sv.origin)}
                          </td>

                          {/* 3. Descripción del Servicio */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <span className="font-bold text-zinc-900 dark:text-white block">
                                {sv.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                                <span>{sv.code || `SRV-${idx + 1}`}</span>
                                <span>• Mano de Obra Técnica</span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Casillero para Mano de Obra */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 font-semibold text-xs">
                              <span>👨‍🔧 Mano de Obra Taller</span>
                              <span className="text-[10px] text-zinc-400 font-normal">
                                ({sv.mechanic || orden.mechanic})
                              </span>
                            </div>
                          </td>

                          {/* 5. Cantidad */}
                          <td className="py-3 px-2 text-center font-mono font-bold text-zinc-900 dark:text-white">
                            1
                          </td>

                          {/* 6. Costo Unitario */}
                          <td className="py-3 px-3 text-right font-mono text-zinc-400 text-xs">
                            $0.00
                          </td>

                          {/* 7. PVP Unitario */}
                          <td className="py-3 px-3 text-right">
                            <div className="print:hidden">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={sv.price}
                                onChange={(e) => handleUpdateServicePrice(sv.id, e.target.value)}
                                className="w-20 h-7 px-1.5 text-right rounded-lg bg-zinc-50 dark:bg-black border border-purple-500/30 font-mono font-bold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                              />
                            </div>
                            <span className="hidden print:inline font-mono font-bold">
                              ${Number(sv.price).toFixed(2)}
                            </span>
                          </td>

                          {/* 8. Subtotal */}
                          <td className="py-3 px-3 text-right font-mono font-black text-zinc-900 dark:text-white">
                            ${Number(sv.price).toFixed(2)}
                          </td>

                          {/* 9. Margen */}
                          <td className="py-3 px-3 text-right font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 print:hidden">
                            ${Number(sv.price).toFixed(2)} (100%)
                          </td>

                          {/* 10. Eliminar */}
                          <td className="py-3 px-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDeleteService(sv.id)}
                              className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 inline-flex items-center justify-center transition-colors cursor-pointer text-xs"
                              title="Eliminar servicio"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* LIQUIDACIÓN DE LA FACTURA & TOTALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-white/10">
            {/* Izquierda: Observaciones y Control de Compras a Proveedores */}
            <div className="space-y-4">
              {/* Observaciones */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span>📝</span>
                  <span>Términos y Observaciones de la Proforma</span>
                </label>
                <textarea
                  rows={3}
                  value={notasFactura}
                  onChange={(e) => setNotasFactura(e.target.value)}
                  placeholder="Garantía de repuestos e insumos, validez de la oferta (15 días), recomendaciones técnicas..."
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-black border border-zinc-200 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 print:border-none print:p-0"
                />
              </div>

              {/* Resumen de Compras a Proveedores Externos (Control Interno de Taller) */}
              <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 space-y-2.5 print:hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span>🚚</span>
                    <span>Requerimientos a Proveedores Externos</span>
                  </span>
                  <span className="text-xs font-mono font-black text-amber-700 dark:text-amber-300">
                    {calculos.itemsPorComprar.length} repuestos
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Costo total estimado que el taller debe pagar a proveedores:{" "}
                  <strong className="text-zinc-900 dark:text-white font-mono font-bold">
                    ${calculos.totalCostoComprasExternas.toFixed(2)}
                  </strong>
                </p>
                {calculos.itemsPorComprar.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setModalWhatsApp(true)}
                    className="w-full h-8 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>💬 Enviar lista a Proveedores por WhatsApp</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                    ✓ Todos los repuestos de esta factura están disponibles en Bodega.
                  </span>
                )}
              </div>
            </div>

            {/* Derecha: Liquidación Financiera de Factura */}
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>Subtotal Repuestos e Insumos:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  ${calculos.subtotalRepuestos.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>Subtotal Mano de Obra y Servicios:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  ${calculos.subtotalServicios.toFixed(2)}
                </span>
              </div>

              <div className="h-px bg-zinc-200 dark:bg-white/10" />

              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>Subtotal Bruto:</span>
                <span className="font-black text-zinc-900 dark:text-white text-sm">
                  ${calculos.subtotalBruto.toFixed(2)}
                </span>
              </div>

              {/* Descuento editable */}
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2 font-sans">
                  <span>Descuento:</span>
                  <div className="inline-flex items-center gap-1 print:hidden">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={porcentajeDescuento}
                      onChange={(e) => setPorcentajeDescuento(parseFloat(e.target.value) || 0)}
                      className="w-12 h-6 px-1 text-center rounded bg-white dark:bg-black border border-zinc-300 dark:border-white/10 text-xs font-mono font-bold"
                    />
                    <span className="text-[10px]">%</span>
                  </div>
                </div>
                <span className="text-rose-500 font-bold">
                  -${calculos.descuento.toFixed(2)}
                </span>
              </div>

              {/* IVA editable */}
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2 font-sans">
                  <span>IVA ({porcentajeIva}%):</span>
                  <div className="inline-flex items-center gap-1 print:hidden">
                    <select
                      value={porcentajeIva}
                      onChange={(e) => setPorcentajeIva(Number(e.target.value))}
                      className="h-6 px-1 rounded bg-white dark:bg-black border border-zinc-300 dark:border-white/10 text-[11px] font-mono"
                    >
                      <option value={15}>15%</option>
                      <option value={12}>12%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                </div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  ${calculos.iva.toFixed(2)}
                </span>
              </div>

              {/* TOTAL FACTURA / PRESUPUESTO */}
              <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-600/30 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-sans font-black text-blue-700 dark:text-blue-300 block">
                    TOTAL FACTURA PROFORMA
                  </span>
                  <span className="text-[10px] text-zinc-500 font-sans">
                    Precio total final para el cliente
                  </span>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                  ${calculos.totalFacturaCliente.toFixed(2)}
                </span>
              </div>

              {/* RENTABILIDAD / MARGEN TALLER (Solo visible internamente) */}
              <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 flex items-center justify-between text-xs print:hidden">
                <span className="font-sans font-bold text-emerald-800 dark:text-emerald-300">
                  Utilidad Neta del Taller:
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ${calculos.margenNetoTaller.toFixed(2)} ({calculos.margenPorcentaje}%)
                </span>
              </div>
            </div>
          </div>

          {/* EVIDENCIAS Y FOTOS DE INSPECCIÓN */}
          {orden.evidencias && orden.evidencias.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-white/10 print:hidden">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>📸</span>
                <span>Evidencias y Fotos de Inspección ({orden.evidencias.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {orden.evidencias.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setFotoZoom(ev.url)}
                    className="h-28 rounded-2xl bg-zinc-100 dark:bg-[#111113] border border-zinc-200 dark:border-white/10 overflow-hidden cursor-pointer relative group shadow-xs"
                  >
                    <img src={ev.url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-bold">
                      🔍 Ver
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FIRMAS EN FACTURA (Visible en impresión o PDF) */}
          <div className="hidden print:grid grid-cols-2 gap-12 pt-16 mt-8 border-t border-zinc-300 text-center text-xs">
            <div className="space-y-2">
              <div className="border-b border-black w-48 mx-auto" />
              <p className="font-bold">Firma del Cliente</p>
              <p className="text-[10px] text-zinc-500">Aceptación de Presupuesto y Repuestos</p>
            </div>
            <div className="space-y-2">
              <div className="border-b border-black w-48 mx-auto" />
              <p className="font-bold">AutoG Centro Automotriz</p>
              <p className="text-[10px] text-zinc-500">Mecánico: {orden.mechanic}</p>
            </div>
          </div>
        </div>
      </main>

      {/* BARRA INFERIOR STICKY CON ACCIONES (NO SE IMPRIME) */}
      <footer className="print:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Métricas Rápidas */}
          <div className="flex items-center justify-between md:justify-start gap-4 sm:gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Compras Externas</span>
              <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                ${calculos.totalCostoComprasExternas.toFixed(2)}
              </span>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10" />

            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">PVP Total Factura</span>
              <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                ${calculos.totalFacturaCliente.toFixed(2)}
              </span>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10" />

            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Margen Taller</span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                ${calculos.margenNetoTaller.toFixed(2)} ({calculos.margenPorcentaje}%)
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
              {guardando ? "Guardando..." : "💾 Guardar Presupuesto"}
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

      {/* MODAL CATÁLOGO WHATSAPP PARA PROVEEDORES */}
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
                  Comparte especificaciones y fotos grandes sin precios de venta ni datos confidenciales.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalWhatsApp(false)}
                className="w-8 h-8 rounded-xl bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
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

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">2. Consolidado del Día</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">
                    Del Día
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Agrupa todos los repuestos por comprar de todos los vehículos recibidos hoy en el taller.
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

      {/* MODAL AGREGAR NUEVO REPUESTO A LA FACTURA */}
      {modalNuevoRepuesto && (
        <div
          onClick={() => setModalNuevoRepuesto(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">+ Agregar Repuesto / Insumo a Factura</h3>
              <button
                type="button"
                onClick={() => setModalNuevoRepuesto(false)}
                className="w-8 h-8 rounded-xl bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Descripción del Repuesto o Producto</label>
                <input
                  type="text"
                  placeholder="Ej: Pastillas de Freno Bosch Delanteras"
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
                  <label className="text-xs text-zinc-400 block mb-1">PVP Venta ($)</label>
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
                  <label className="text-xs text-zinc-400 block mb-1">Área / Origen</label>
                  <select
                    value={nuevoOrigen}
                    onChange={(e) => setNuevoOrigen(e.target.value as EspecialidadTipo)}
                    className="w-full h-10 px-2 rounded-xl bg-black border border-white/10 text-xs text-white cursor-pointer"
                  >
                    <option value="TALLER">🔧 Taller</option>
                    <option value="LUBRICENTRO">🛢️ Lubricentro</option>
                    <option value="CARWASH">🚿 Car Wash</option>
                    <option value="TECNICENTRO">⚙️ Tecnicentro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Disponibilidad (Casillero)</label>
                  <button
                    type="button"
                    onClick={() => setNuevoEnStock(!nuevoEnStock)}
                    className={`w-full h-10 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      nuevoEnStock
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    }`}
                  >
                    <span>{nuevoEnStock ? "📦 Sí hay en Bodega" : "🚚 Pedir a Proveedor"}</span>
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
                    placeholder="Nombre del proveedor externo"
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
                  Agregar a la Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR NUEVO SERVICIO / MANO DE OBRA */}
      {modalNuevoServicio && (
        <div
          onClick={() => setModalNuevoServicio(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">+ Agregar Mano de Obra / Servicio</h3>
              <button
                type="button"
                onClick={() => setModalNuevoServicio(false)}
                className="w-8 h-8 rounded-xl bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Descripción del Servicio Técnico</label>
                <input
                  type="text"
                  placeholder="Ej: Cambio de Pastillas y Rectificación de Discos"
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
                  <label className="text-xs text-zinc-400 block mb-1">Área / Origen</label>
                  <select
                    value={nuevoServicioOrigen}
                    onChange={(e) => setNuevoServicioOrigen(e.target.value as EspecialidadTipo)}
                    className="w-full h-10 px-2 rounded-xl bg-black border border-white/10 text-xs text-white cursor-pointer"
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
                  Agregar a la Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZOOM FOTO EVIDENCIA */}
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
