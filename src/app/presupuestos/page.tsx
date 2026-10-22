"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ============================================================================
// INTERFACES Y TIPOS
// ============================================================================

interface EvidenciaItem {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number | null;
  transcriptionText?: string | null;
  transcriptionStatus?: string;
  uploadedBy?: string | null;
  createdAt?: string | null;
}

interface RepuestoPresupuesto {
  id: string;
  productId?: string | null;
  code: string;
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
  purchaseStatus: "POR_PEDIR" | "PEDIDO_WHATSAPP" | "COMPRADO" | "RECIBIDO";
  notes?: string;
}

interface ServicioPresupuesto {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  estimatedMinutes: number;
  mechanic?: string;
}

interface OrdenResumen {
  id: string;
  orderNumber: string;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone?: string | null;
  mechanic: string;
  status: string;
  progress: number;
  mileage?: number | null;
  fuelLevel?: string | null;
  notes?: string | null;
  dateIn: string;
  createdAt: string;
  tipoNegocio: "Taller" | "Lubricentro" | "Carwash" | "Tecnicentro";
  quoteNumber: string;
  quoteStatus: string;
  quoteApprovedAt?: string | null;
  posRequestId?: string | null;
  itemsCount: number;
  servicesCount: number;
  findingsCount: number;
  totalVentaEstimada: number;
  totalCostoEstimado: number;
  utilidadEstimada: number;
  margenPercent: number;
  evidencias: {
    total: number;
    fotos: number;
    audios: number;
    videos: number;
    transcripciones: number;
  };
}

interface ProveedorItem {
  id: string;
  name: string;
  contact: string;
  phone?: string | null;
  email?: string | null;
}

const OPCIONES_TIPO = [
  { id: "TODOS", label: "Todos los Tipos", short: "Todos", icon: "🏢" },
  { id: "Taller", label: "Taller Mecánico", short: "Taller", icon: "🔧" },
  { id: "Lubricentro", label: "Lubricentro Express", short: "Lubricentro", icon: "🛢️" },
  { id: "Carwash", label: "Carwash / Lavado", short: "Carwash", icon: "🚿" },
  { id: "Tecnicentro", label: "Tecnicentro", short: "Tecnicentro", icon: "⚙️" },
];

const OPCIONES_ESTADO = [
  { id: "TODOS", label: "Todos los Estados", short: "Todas", icon: "📋" },
  { id: "PENDIENTE", label: "Por Cotizar", short: "Por Cotizar", icon: "⏳" },
  { id: "APROBADO", label: "Aprobadas", short: "Aprobadas", icon: "✅" },
  { id: "EN_CAJA", label: "En Caja POS", short: "En Caja POS", icon: "💳" },
];

export default function PanelPresupuestosPage() {
  const router = useRouter();

  // Estados principales de la vista
  const [ordenes, setOrdenes] = useState<OrdenResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [menuTipoAbierto, setMenuTipoAbierto] = useState(false);
  const [menuEstadoAbierto, setMenuEstadoAbierto] = useState(false);
  const [kpis, setKpis] = useState({
    total: 0,
    pendientesCotizar: 0,
    aprobadas: 0,
    totalValorizado: 0,
  });

  // Notificaciones Toast
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" | "info" } | null>(null);
  const mostrarToast = (msg: string, tipo: "ok" | "err" | "info" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  // Modal de Detalle / Editor de Presupuesto
  const [ordenActivaId, setOrdenActivaId] = useState<string | null>(null);
  const [ordenDetalle, setOrdenDetalle] = useState<any | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [tabEditor, setTabEditor] = useState<"evidencias" | "presupuesto" | "proveedores">("presupuesto");

  // Lista de proveedores y catálogos
  const [proveedores, setProveedores] = useState<ProveedorItem[]>([]);
  const [guardandoPresupuesto, setGuardandoPresupuesto] = useState(false);
  const [autorizandoCobro, setAutorizandoCobro] = useState(false);

  // Modales secundarios de creación rápida
  const [modalNuevoRepuesto, setModalNuevoRepuesto] = useState(false);
  const [modalNuevoServicio, setModalNuevoServicio] = useState(false);
  const [modalNuevoProveedor, setModalNuevoProveedor] = useState(false);

  // Estados para formulario de repuesto rápido
  const [nuevoRepNombre, setNuevoRepNombre] = useState("");
  const [nuevoRepCosto, setNuevoRepCosto] = useState<number | string>("");
  const [nuevoRepPvp, setNuevoRepPvp] = useState<number | string>("");
  const [nuevoRepProveedorId, setNuevoRepProveedorId] = useState("");
  const [creandoRepuesto, setCreandoRepuesto] = useState(false);

  // Estados para formulario de servicio rápido
  const [nuevoSrvNombre, setNuevoSrvNombre] = useState("");
  const [nuevoSrvPrecio, setNuevoSrvPrecio] = useState<number | string>("");
  const [nuevoSrvCategoria, setNuevoSrvCategoria] = useState("Mano de Obra");
  const [creandoServicio, setCreandoServicio] = useState(false);

  // Estados para formulario de proveedor rápido
  const [nuevoProvNombre, setNuevoProvNombre] = useState("");
  const [nuevoProvTelefono, setNuevoProvTelefono] = useState("");
  const [nuevoProvContacto, setNuevoProvContacto] = useState("");
  const [creandoProveedor, setCreandoProveedor] = useState(false);

  // Modal para Lightbox de Imagen
  const [imagenModalUrl, setImagenModalUrl] = useState<string | null>(null);

  // ============================================================================
  // CARGA DE DATOS DESDE NEON
  // ============================================================================

  const cargarOrdenes = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (busqueda) params.set("busqueda", busqueda);
      if (filtroEstado !== "TODOS") params.set("estado", filtroEstado);
      if (filtroTipo !== "TODOS") params.set("tipo", filtroTipo);

      const res = await fetch(`/api/presupuestos/ordenes?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setOrdenes(data.ordenes || []);
        if (data.kpis) setKpis(data.kpis);
      } else {
        mostrarToast(data.error || "Error al cargar órdenes", "err");
      }
    } catch (err: any) {
      console.error(err);
      mostrarToast("Error de conexión al cargar órdenes", "err");
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroEstado, filtroTipo]);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  // Cargar catálogo de proveedores
  const cargarProveedores = async () => {
    try {
      const res = await fetch("/api/presupuestos/proveedores");
      const data = await res.json();
      if (data.success) setProveedores(data.proveedores || []);
    } catch {}
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  // Abrir y cargar expediente completo de una orden
  const abrirOrdenDetalle = async (id: string) => {
    try {
      setOrdenActivaId(id);
      setCargandoDetalle(true);
      const res = await fetch(`/api/presupuestos/detalle?id=${encodeURIComponent(id)}`);
      const data = await res.json();

      if (data.success && data.order) {
        setOrdenDetalle(data.order);
        if (data.proveedores) setProveedores(data.proveedores);
        // Si tiene evidencias y ningún ítem, mostrar evidencias primero
        if (data.order.items?.length === 0 && (data.order.evidencias?.length > 0 || data.order.inspectionFindings?.length > 0)) {
          setTabEditor("evidencias");
        } else {
          setTabEditor("presupuesto");
        }
      } else {
        mostrarToast(data.error || "No se pudo cargar la orden", "err");
        setOrdenActivaId(null);
      }
    } catch (err) {
      mostrarToast("Error al cargar expediente de la orden", "err");
      setOrdenActivaId(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ============================================================================
  // GESTIÓN DE REPUESTOS EN EL PRESUPUESTO
  // ============================================================================

  const handleUpdateRepuesto = (index: number, campo: keyof RepuestoPresupuesto, valor: any) => {
    if (!ordenDetalle) return;
    const nuevosItems = [...(ordenDetalle.items || [])];
    const item = { ...nuevosItems[index], [campo]: valor };

    // Recalcular subtotales y margen
    const qty = Number(item.qty || 1);
    const cost = Number(item.costPrice || 0);
    const pvp = Number(item.price || 0);

    item.subtotalVenta = Number((pvp * qty).toFixed(2));
    item.subtotalCosto = Number((cost * qty).toFixed(2));
    item.margin = Number(((pvp - cost) * qty).toFixed(2));
    item.marginPercent = pvp > 0 ? Math.round(((pvp - cost) / pvp) * 100) : 0;

    // Si cambió el proveedor, actualizar nombre y teléfono
    if (campo === "supplierId") {
      const prov = proveedores.find((p) => p.id === valor);
      if (prov) {
        item.supplierName = prov.name;
        item.supplierPhone = prov.phone || "";
      }
    }

    nuevosItems[index] = item;
    setOrdenDetalle({ ...ordenDetalle, items: nuevosItems });
  };

  const handleEliminarRepuesto = (index: number) => {
    if (!ordenDetalle) return;
    const nuevos = ordenDetalle.items.filter((_: any, idx: number) => idx !== index);
    setOrdenDetalle({ ...ordenDetalle, items: nuevos });
  };

  const handleEliminarServicio = (index: number) => {
    if (!ordenDetalle) return;
    const nuevos = ordenDetalle.services.filter((_: any, idx: number) => idx !== index);
    setOrdenDetalle({ ...ordenDetalle, services: nuevos });
  };

  // Totales financieros calculados en vivo del editor
  const totalesCalculados = useMemo(() => {
    if (!ordenDetalle) return { venta: 0, costo: 0, utilidad: 0, margen: 0 };
    const items = ordenDetalle.items || [];
    const services = ordenDetalle.services || [];

    const totalVentaRep = items.reduce((acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0);
    const totalCostoRep = items.reduce((acc: number, it: any) => acc + (Number(it.costPrice || 0) * Number(it.qty || 1)), 0);
    const totalVentaSrv = services.reduce((acc: number, sv: any) => acc + Number(sv.price || 0), 0);

    const venta = Number((totalVentaRep + totalVentaSrv).toFixed(2));
    const costo = Number(totalCostoRep.toFixed(2));
    const utilidad = Number((venta - costo).toFixed(2));
    const margen = venta > 0 ? Math.round((utilidad / venta) * 100) : 0;

    return { venta, costo, utilidad, margen };
  }, [ordenDetalle]);

  // ============================================================================
  // ACCIONES: GUARDAR BORRADOR Y AUTORIZAR COBRO A POS
  // ============================================================================

  const handleGuardarBorrador = async () => {
    if (!ordenDetalle) return;
    try {
      setGuardandoPresupuesto(true);
      const res = await fetch("/api/presupuestos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: ordenDetalle.id,
          items: ordenDetalle.items,
          services: ordenDetalle.services,
          notes: ordenDetalle.notes,
          quoteStatus: "Cotizando",
        }),
      });
      const data = await res.json();
      if (data.success) {
        mostrarToast("Presupuesto guardado correctamente.", "ok");
        cargarOrdenes();
      } else {
        mostrarToast(data.error || "Error al guardar presupuesto.", "err");
      }
    } catch {
      mostrarToast("Error de conexión al guardar.", "err");
    } finally {
      setGuardandoPresupuesto(false);
    }
  };

  const handleAutorizarYEnviarAPos = async () => {
    if (!ordenDetalle) return;
    if (totalesCalculados.venta <= 0) {
      mostrarToast("Agrega al menos un repuesto o servicio con valor antes de autorizar el cobro.", "err");
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas autorizar el cobro de la Orden #${ordenDetalle.orderNumber} por un total de $${totalesCalculados.venta.toFixed(2)}?\n\nEsta orden pasará inmediatamente al POS de venta para ser cobrada.`
    );
    if (!confirmar) return;

    try {
      setAutorizandoCobro(true);
      const res = await fetch("/api/presupuestos/autorizar-cobro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: ordenDetalle.id,
          items: ordenDetalle.items,
          services: ordenDetalle.services,
          notes: ordenDetalle.notes,
          registrarOrdenesCompra: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        mostrarToast("¡Presupuesto autorizado con éxito! Orden transferida a POS.", "ok");
        setOrdenActivaId(null);
        setOrdenDetalle(null);
        cargarOrdenes();
      } else {
        mostrarToast(data.error || "Error al autorizar presupuesto.", "err");
      }
    } catch {
      mostrarToast("Error de conexión al autorizar cobro.", "err");
    } finally {
      setAutorizandoCobro(false);
    }
  };

  // ============================================================================
  // WHATSAPP WEB CON PROVEEDORES
  // ============================================================================

  const generarLinkWhatsAppProveedor = (telefono: string, repuestosTexto: string) => {
    if (!ordenDetalle) return "#";
    const telLimpio = telefono.replace(/[^0-9]/g, "");
    const mensaje = encodeURIComponent(
      `Hola, te saluda el área de compras y presupuestos del taller.\n\n` +
      `Solicitamos cotización/disponibilidad para el vehículo:\n` +
      `🚗 *${ordenDetalle.vehicle}* | Placa: *${ordenDetalle.plate}*\n` +
      `Orden #${ordenDetalle.orderNumber}\n\n` +
      `*Repuestos requeridos:*\n${repuestosTexto}\n\n` +
      `Por favor indícanos precio neto y tiempo de entrega. ¡Gracias!`
    );
    return `https://wa.me/${telLimpio}?text=${mensaje}`;
  };

  // Crear Repuesto Rápido
  const handleCrearRepuestoRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRepNombre.trim() || Number(nuevoRepPvp) <= 0) {
      mostrarToast("Ingresa nombre y precio de venta válido", "err");
      return;
    }

    try {
      setCreandoRepuesto(true);
      const res = await fetch("/api/presupuestos/productos-rapidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nuevoRepNombre,
          costPrice: Number(nuevoRepCosto) || 0,
          price: Number(nuevoRepPvp),
          category: "Repuestos Taller",
          stock: 1,
        }),
      });
      const data = await res.json();

      if (data.success && data.producto && ordenDetalle) {
        const prov = proveedores.find((p) => p.id === nuevoRepProveedorId);
        const nuevoItem: RepuestoPresupuesto = {
          id: `rep_${Date.now()}`,
          productId: data.producto.id,
          code: data.producto.code,
          name: data.producto.name,
          qty: 1,
          costPrice: Number(nuevoRepCosto) || 0,
          price: Number(nuevoRepPvp),
          subtotalVenta: Number(nuevoRepPvp),
          subtotalCosto: Number(nuevoRepCosto) || 0,
          margin: Number(nuevoRepPvp) - (Number(nuevoRepCosto) || 0),
          marginPercent: Number(nuevoRepPvp) > 0 ? Math.round(((Number(nuevoRepPvp) - (Number(nuevoRepCosto) || 0)) / Number(nuevoRepPvp)) * 100) : 0,
          supplierId: prov?.id || null,
          supplierName: prov?.name || "Proveedor General",
          supplierPhone: prov?.phone || "",
          purchaseStatus: "POR_PEDIR",
        };

        setOrdenDetalle({
          ...ordenDetalle,
          items: [...(ordenDetalle.items || []), nuevoItem],
        });

        mostrarToast("Repuesto agregado al presupuesto", "ok");
        setNuevoRepNombre("");
        setNuevoRepCosto("");
        setNuevoRepPvp("");
        setModalNuevoRepuesto(false);
      } else {
        mostrarToast(data.error || "Error al crear repuesto", "err");
      }
    } catch {
      mostrarToast("Error de conexión al registrar repuesto", "err");
    } finally {
      setCreandoRepuesto(false);
    }
  };

  // Crear Servicio Rápido
  const handleCrearServicioRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoSrvNombre.trim() || Number(nuevoSrvPrecio) <= 0) {
      mostrarToast("Ingresa nombre y precio de mano de obra", "err");
      return;
    }

    try {
      setCreandoServicio(true);
      const res = await fetch("/api/presupuestos/servicios-rapidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nuevoSrvNombre,
          price: Number(nuevoSrvPrecio),
          category: nuevoSrvCategoria,
          estimatedMinutes: 45,
        }),
      });
      const data = await res.json();

      if (data.success && data.servicio && ordenDetalle) {
        const nuevoSrv: ServicioPresupuesto = {
          id: `srv_${Date.now()}`,
          code: data.servicio.code,
          name: data.servicio.name,
          category: data.servicio.category,
          price: Number(data.servicio.price),
          estimatedMinutes: data.servicio.estimatedMinutes,
          mechanic: ordenDetalle.mechanic || "Taller",
        };

        setOrdenDetalle({
          ...ordenDetalle,
          services: [...(ordenDetalle.services || []), nuevoSrv],
        });

        mostrarToast("Servicio agregado al presupuesto", "ok");
        setNuevoSrvNombre("");
        setNuevoSrvPrecio("");
        setModalNuevoServicio(false);
      } else {
        mostrarToast(data.error || "Error al crear servicio", "err");
      }
    } catch {
      mostrarToast("Error de conexión al registrar servicio", "err");
    } finally {
      setCreandoServicio(false);
    }
  };

  // Crear Proveedor Rápido
  const handleCrearProveedorRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProvNombre.trim()) {
      mostrarToast("El nombre del proveedor es obligatorio", "err");
      return;
    }

    try {
      setCreandoProveedor(true);
      const res = await fetch("/api/presupuestos/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nuevoProvNombre,
          phone: nuevoProvTelefono,
          contact: nuevoProvContacto || "Ventas",
        }),
      });
      const data = await res.json();

      if (data.success && data.proveedor) {
        setProveedores((prev) => [data.proveedor, ...prev]);
        mostrarToast("Proveedor registrado con éxito", "ok");
        setNuevoProvNombre("");
        setNuevoProvTelefono("");
        setNuevoProvContacto("");
        setModalNuevoProveedor(false);
      } else {
        mostrarToast(data.error || "Error al registrar proveedor", "err");
      }
    } catch {
      mostrarToast("Error de conexión al registrar proveedor", "err");
    } finally {
      setCreandoProveedor(false);
    }
  };

  // Agrupar repuestos por proveedor para el Tab de Proveedores
  const repuestosPorProveedor = useMemo(() => {
    if (!ordenDetalle?.items) return [];
    const grupos: Record<string, { proveedor: string; telefono: string; items: any[]; totalCosto: number }> = {};

    ordenDetalle.items.forEach((it: any) => {
      const supName = it.supplierName || "Proveedor General";
      if (!grupos[supName]) {
        grupos[supName] = {
          proveedor: supName,
          telefono: it.supplierPhone || "",
          items: [],
          totalCosto: 0,
        };
      }
      grupos[supName].items.push(it);
      grupos[supName].totalCosto += (Number(it.costPrice || 0) * Number(it.qty || 1));
    });

    return Object.values(grupos);
  }, [ordenDetalle]);

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Toast Notificaciones */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border text-sm font-semibold flex items-center gap-2 animate-bounce ${
            toast.tipo === "ok"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : toast.tipo === "err"
              ? "bg-red-500/20 border-red-500/40 text-red-300"
              : "bg-sky-500/20 border-sky-500/40 text-sky-300"
          }`}
        >
          <span>{toast.tipo === "ok" ? "✓" : toast.tipo === "err" ? "✕" : "ℹ"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Cabecera Superior con Switcher de Paneles */}
      <header className="border-b border-white/10 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all text-sm font-bold"
              title="Ir al Menú Principal / Login"
            >
              ←
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Presupuestos & Repuestos</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono uppercase">
                    Compras • POS
                  </span>
                </h1>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Revisión de inspección técnica, compra de repuestos con proveedores y autorización de cobro.
              </p>
            </div>
          </div>

          {/* Accesos rápidos a los otros paneles */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10 text-xs">
            <Link
              href="/taller"
              className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-medium flex items-center gap-1"
            >
              <span>🔧</span>
              <span className="hidden md:inline">Taller</span>
            </Link>
            <Link
              href="/pos"
              className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-medium flex items-center gap-1"
            >
              <span>💳</span>
              <span className="hidden md:inline">POS</span>
            </Link>
            <Link
              href="/oficina"
              className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-medium flex items-center gap-1"
            >
              <span>🏢</span>
              <span className="hidden md:inline">Oficina</span>
            </Link>
            <Link
              href="/gerencia"
              className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-medium flex items-center gap-1"
            >
              <span>📊</span>
              <span className="hidden md:inline">Gerencia</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Cards de Resumen */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 shadow-lg space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              📥 Órdenes Totales
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{kpis.total}</span>
              <span className="text-xs text-zinc-400">En base de datos</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-lg space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              ⏳ Por Cotizar
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-300">{kpis.pendientesCotizar}</span>
              <span className="text-xs text-amber-400/80">Requieren repuestos</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              ✅ Autorizadas / En Caja
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-300">{kpis.aprobadas}</span>
              <span className="text-xs text-emerald-400/80">Listas para cobro POS</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 shadow-lg space-y-1">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              💵 Total Valorizado
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-sky-300">
                ${kpis.totalValorizado.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-sky-400/80">PVP Estimado</span>
            </div>
          </div>
        </section>

        {/* Barra de Filtros y Búsqueda */}
        <section className="space-y-2">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-zinc-900/60 p-3 sm:p-4 rounded-2xl border border-white/10 shadow-lg backdrop-blur-sm">
            {/* Buscador Más Grande */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por placa, cliente, vehículo o # de orden..."
                className="w-full h-12 sm:h-13 pl-12 pr-10 rounded-xl bg-zinc-950/90 border border-white/10 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none text-sm sm:text-base text-white placeholder-zinc-500 transition-all shadow-inner"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-base sm:text-lg pointer-events-none">
                🔍
              </span>
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                  title="Borrar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Un solo campo para los dos filtros desplegables */}
            <div className="flex items-stretch h-12 sm:h-13 bg-zinc-950/90 border border-white/10 rounded-xl divide-x divide-white/10 shrink-0 shadow-inner focus-within:border-sky-500/50 transition-all">
              {/* Filtro 1: Tipo de Negocio */}
              <div className="relative flex-1 md:flex-initial">
                <button
                  type="button"
                  onClick={() => {
                    setMenuTipoAbierto(!menuTipoAbierto);
                    setMenuEstadoAbierto(false);
                  }}
                  className={`w-full h-full px-3.5 sm:px-4 flex items-center justify-between gap-2.5 text-xs sm:text-sm font-semibold hover:bg-white/5 transition-all cursor-pointer ${
                    filtroTipo !== "TODOS" ? "text-sky-400 bg-sky-500/10" : "text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">
                      {OPCIONES_TIPO.find((t) => t.id === filtroTipo)?.icon || "🏢"}
                    </span>
                    <span className="truncate">
                      {filtroTipo === "TODOS"
                        ? "Tipo: Todos"
                        : OPCIONES_TIPO.find((t) => t.id === filtroTipo)?.short}
                    </span>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                      menuTipoAbierto ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuTipoAbierto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuTipoAbierto(false)}
                    />
                    <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-56 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 py-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/5">
                        Tipo de Negocio
                      </div>
                      {OPCIONES_TIPO.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => {
                            setFiltroTipo(op.id);
                            setMenuTipoAbierto(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs sm:text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                            filtroTipo === op.id
                              ? "bg-sky-500/15 text-sky-400 font-bold"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{op.icon}</span>
                            <span>{op.label}</span>
                          </div>
                          {filtroTipo === op.id && (
                            <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Filtro 2: Estado de Cotización */}
              <div className="relative flex-1 md:flex-initial">
                <button
                  type="button"
                  onClick={() => {
                    setMenuEstadoAbierto(!menuEstadoAbierto);
                    setMenuTipoAbierto(false);
                  }}
                  className={`w-full h-full px-3.5 sm:px-4 flex items-center justify-between gap-2.5 text-xs sm:text-sm font-semibold hover:bg-white/5 transition-all cursor-pointer ${
                    filtroEstado !== "TODOS" ? "text-amber-400 bg-amber-500/10" : "text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">
                      {OPCIONES_ESTADO.find((e) => e.id === filtroEstado)?.icon || "📋"}
                    </span>
                    <span className="truncate">
                      {filtroEstado === "TODOS"
                        ? "Estado: Todos"
                        : OPCIONES_ESTADO.find((e) => e.id === filtroEstado)?.short}
                    </span>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                      menuEstadoAbierto ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuEstadoAbierto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuEstadoAbierto(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 py-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-white/5">
                        Estado de Cotización
                      </div>
                      {OPCIONES_ESTADO.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => {
                            setFiltroEstado(op.id);
                            setMenuEstadoAbierto(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs sm:text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                            filtroEstado === op.id
                              ? "bg-amber-500/15 text-amber-400 font-bold"
                              : "text-zinc-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{op.icon}</span>
                            <span>{op.label}</span>
                          </div>
                          {filtroEstado === op.id && (
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Botón rápido para limpiar filtros si alguno está activo */}
              {(filtroTipo !== "TODOS" || filtroEstado !== "TODOS") && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroTipo("TODOS");
                    setFiltroEstado("TODOS");
                  }}
                  title="Restablecer filtros"
                  className="px-3 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Badges / Chips activos debajo de la barra */}
          {(filtroTipo !== "TODOS" || filtroEstado !== "TODOS" || busqueda) && (
            <div className="flex items-center flex-wrap gap-2 px-1 text-xs">
              <span className="text-zinc-500 font-medium text-[11px]">Filtros activos:</span>
              {busqueda && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-200 border border-white/5">
                  🔍 &quot;{busqueda}&quot;
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    className="hover:text-white text-zinc-400 text-xs ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtroTipo !== "TODOS" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {OPCIONES_TIPO.find((t) => t.id === filtroTipo)?.icon}{" "}
                  {OPCIONES_TIPO.find((t) => t.id === filtroTipo)?.label}
                  <button
                    type="button"
                    onClick={() => setFiltroTipo("TODOS")}
                    className="hover:text-white text-sky-400 text-xs ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtroEstado !== "TODOS" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {OPCIONES_ESTADO.find((e) => e.id === filtroEstado)?.icon}{" "}
                  {OPCIONES_ESTADO.find((e) => e.id === filtroEstado)?.label}
                  <button
                    type="button"
                    onClick={() => setFiltroEstado("TODOS")}
                    className="hover:text-white text-amber-400 text-xs ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setFiltroTipo("TODOS");
                  setFiltroEstado("TODOS");
                }}
                className="text-[11px] text-zinc-400 hover:text-white underline underline-offset-2 ml-1 cursor-pointer"
              >
                Limpiar todo
              </button>
            </div>
          )}
        </section>

        {/* Lista de Órdenes */}
        <section className="space-y-3">
          {cargando ? (
            <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Cargando órdenes y evidencias desde Neon DB...</p>
            </div>
          ) : ordenes.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-zinc-900/40 border border-white/5 space-y-2">
              <span className="text-3xl">📋</span>
              <h3 className="text-sm font-bold text-white">No se encontraron órdenes</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No hay órdenes registradas que coincidan con los filtros aplicados. Las inspecciones realizadas desde el panel de Taller aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ordenes.map((orden) => (
                <div
                  key={orden.id}
                  onClick={() => abrirOrdenDetalle(orden.id)}
                  className="group relative p-4 rounded-3xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 hover:border-sky-500/50 shadow-xl transition-all cursor-pointer flex flex-col justify-between gap-4 overflow-hidden"
                >
                  {/* Cabecera de la Tarjeta */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg">
                        #{orden.orderNumber}
                      </span>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                          orden.quoteStatus === "Aprobado" || orden.status === "EN_CAJA"
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                            : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        }`}
                      >
                        {orden.quoteStatus === "Aprobado" || orden.status === "EN_CAJA"
                          ? "✓ Autorizado POS"
                          : "⏳ Pendiente Cotizar"}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white group-hover:text-sky-300 transition-colors">
                          {orden.plate}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium truncate">
                          • {orden.vehicle}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">
                        👤 {orden.client} {orden.clientPhone ? `(${orden.clientPhone})` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Evidencias multimedia y hallazgos reportados */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5 text-[11px]">
                    {orden.evidencias.fotos > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25 flex items-center gap-1">
                        <span>📸</span>
                        <span>{orden.evidencias.fotos}</span>
                      </span>
                    )}
                    {orden.evidencias.audios > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 flex items-center gap-1">
                        <span>🎙️</span>
                        <span>{orden.evidencias.audios}</span>
                        {orden.evidencias.transcripciones > 0 && (
                          <span className="text-[9px] bg-emerald-400/20 px-1 rounded">Texto</span>
                        )}
                      </span>
                    )}
                    {orden.evidencias.videos > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 flex items-center gap-1">
                        <span>🎥</span>
                        <span>{orden.evidencias.videos}</span>
                      </span>
                    )}
                    {orden.findingsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                        <span>📝</span>
                        <span>{orden.findingsCount} hallazgos</span>
                      </span>
                    )}
                    {orden.evidencias.total === 0 && (
                      <span className="text-zinc-500 text-[10px]">Sin fotos de ingreso</span>
                    )}
                  </div>

                  {/* Resumen Financiero y Acciones */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase text-zinc-400 font-bold block">
                        Presupuesto PVP
                      </span>
                      <span className="text-base font-black text-white">
                        ${orden.totalVentaEstimada.toFixed(2)}
                      </span>
                      {orden.margenPercent > 0 && (
                        <span className="text-[10px] text-emerald-400 block font-semibold">
                          Margen: {orden.margenPercent}% (${orden.utilidadEstimada.toFixed(2)})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirOrdenDetalle(orden.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Abrir</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* =====================================================================
          EXPEDIENTE COMPLETO / MODAL DE PRESUPUESTOS Y DESPACHO
          ===================================================================== */}
      {ordenActivaId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in"
          >
            {/* Header del Expediente */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-zinc-900/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center text-lg font-black shrink-0">
                  📋
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-400">
                      #{ordenDetalle?.orderNumber || "..."}
                    </span>
                    <span className="text-sm sm:text-base font-black text-white">
                      {ordenDetalle?.plate} • {ordenDetalle?.vehicle}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Cliente: <strong className="text-zinc-200">{ordenDetalle?.client}</strong>{" "}
                    {ordenDetalle?.clientPhone && `• Tel: ${ordenDetalle.clientPhone}`} • Mecánico:{" "}
                    <strong className="text-zinc-200">{ordenDetalle?.mechanic}</strong>
                  </p>
                </div>
              </div>

              {/* Botones de acción del Header */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrdenActivaId(null);
                    setOrdenDetalle(null);
                  }}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
                  title="Cerrar expediente"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Pestañas de Navegación del Expediente */}
            <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-white/10 bg-zinc-900/40 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setTabEditor("presupuesto")}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  tabEditor === "presupuesto"
                    ? "border-sky-500 text-sky-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>⚙️ Repuestos & Servicios</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                  {(ordenDetalle?.items?.length || 0) + (ordenDetalle?.services?.length || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabEditor("evidencias")}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  tabEditor === "evidencias"
                    ? "border-sky-500 text-sky-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>📸 Evidencias & Audios</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                  {ordenDetalle?.evidencias?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabEditor("proveedores")}
                className={`pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  tabEditor === "proveedores"
                    ? "border-sky-500 text-sky-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>💬 Pedidos WhatsApp</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                  {repuestosPorProveedor.length}
                </span>
              </button>
            </div>

            {/* Contenedor con Scroll de la Pestaña Activa */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {cargandoDetalle ? (
                <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
                  <span className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Cargando expediente multimedia...</p>
                </div>
              ) : tabEditor === "evidencias" ? (
                /* TAB 1: EVIDENCIAS MULTIMEDIA + AUDIOS CON TRANSCRIPCIÓN + HALLAZGOS */
                <div className="space-y-6">
                  {/* Fila con Datos de Recepción */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Kilometraje</span>
                      <strong className="text-zinc-200">{ordenDetalle?.mileage ? `${ordenDetalle.mileage} km` : "No registrado"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Combustible</span>
                      <strong className="text-zinc-200">{ordenDetalle?.fuelLevel || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Fecha Ingreso</span>
                      <strong className="text-zinc-200">
                        {ordenDetalle?.dateIn ? new Date(ordenDetalle.dateIn).toLocaleDateString() : "Hoy"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Motivo Ingreso</span>
                      <strong className="text-zinc-200 truncate block">{ordenDetalle?.notes || "Inspección técnica"}</strong>
                    </div>
                  </div>

                  {/* Notas de Voz y Audios Grabados por el Mecánico con Transcripción */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <span>🎙️</span>
                      <span>Notas de Voz del Mecánico & Transcripción de Audio</span>
                    </h4>

                    {ordenDetalle?.evidencias?.filter((e: any) => e.type === "audio").length === 0 ? (
                      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/5 text-center text-xs text-zinc-400">
                        No hay notas de voz registradas en esta orden.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ordenDetalle?.evidencias
                          ?.filter((e: any) => e.type === "audio")
                          .map((audio: EvidenciaItem, idx: number) => (
                            <div
                              key={audio.id || idx}
                              className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-300">
                                    Nota de Voz • {audio.durationSeconds ? `${audio.durationSeconds} seg` : "Audio"}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-400">
                                  {audio.createdAt ? new Date(audio.createdAt).toLocaleString() : ""}
                                </span>
                              </div>

                              {/* Reproductor de Audio HTML5 nativo */}
                              <audio
                                controls
                                src={audio.url}
                                className="w-full h-9 rounded-xl bg-zinc-900"
                                preload="metadata"
                              />

                              {/* Texto Transcrito en Neon */}
                              <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 text-xs text-zinc-200 space-y-1">
                                <span className="text-[10px] font-bold uppercase text-emerald-400/80 block">
                                  Transcripción Automática (Neon):
                                </span>
                                <p className="leading-relaxed whitespace-pre-wrap">
                                  {audio.transcriptionText || "Audio guardado. Transcripción no disponible o procesando."}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Galería de Fotografías y Videos */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                      <span>📸</span>
                      <span>Fotografías y Videos de Recepción / Daños</span>
                    </h4>

                    {ordenDetalle?.evidencias?.filter((e: any) => e.type === "image" || e.type === "video").length === 0 ? (
                      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/5 text-center text-xs text-zinc-400">
                        No hay fotos ni videos adjuntos a esta orden.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {ordenDetalle?.evidencias
                          ?.filter((e: any) => e.type === "image" || e.type === "video")
                          .map((ev: EvidenciaItem, idx: number) => (
                            <div
                              key={ev.id || idx}
                              className="group relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 aspect-video flex items-center justify-center cursor-pointer"
                              onClick={() => ev.type === "image" && setImagenModalUrl(ev.url)}
                            >
                              {ev.type === "image" ? (
                                <img
                                  src={ev.url}
                                  alt="Evidencia"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <video
                                  src={ev.url}
                                  controls
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/75 text-[9px] text-white">
                                {ev.type === "image" ? "🔍 Foto" : "🎥 Video"}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Hallazgos de Inspección y Daños Reportados */}
                  {ordenDetalle?.inspectionFindings?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                        <span>📝</span>
                        <span>Hallazgos de la Inspección del Vehículo</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ordenDetalle.inspectionFindings.map((f: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2"
                          >
                            <span className="text-sm">⚠️</span>
                            <div>
                              <strong className="block text-white">{f.nombre || f.pieza || `Hallazgo #${idx + 1}`}</strong>
                              <p className="text-zinc-400 text-[11px]">{f.tipo || f.descripcion || "Daño o desgaste reportado"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : tabEditor === "presupuesto" ? (
                /* TAB 2: CONSTRUCTOR DE PRESUPUESTO (REPUESTOS, PROVEEDORES, PVP, MÁRGENES) */
                <div className="space-y-6">
                  {/* SECCIÓN DE REPUESTOS E INSUMOS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>⚙️</span>
                          <span>Repuestos & Insumos para la Reparación</span>
                        </h4>
                        <p className="text-xs text-zinc-400">
                          Registra proveedor, precio de compra y PVP de venta al cliente.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setModalNuevoRepuesto(true)}
                        className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-sky-500/20 cursor-pointer active:scale-95 transition-all"
                      >
                        <span>+</span>
                        <span>Crear / Agregar Repuesto</span>
                      </button>
                    </div>

                    {ordenDetalle?.items?.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-dashed border-white/10 text-center space-y-2">
                        <span className="text-2xl">📦</span>
                        <p className="text-xs text-zinc-400">Aún no hay repuestos asignados a este presupuesto.</p>
                        <button
                          type="button"
                          onClick={() => setModalNuevoRepuesto(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                        >
                          + Agregar primer repuesto
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/50">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-black/40 text-zinc-400 font-semibold border-b border-white/10">
                            <tr>
                              <th className="p-3">Cant.</th>
                              <th className="p-3">Descripción / Repuesto</th>
                              <th className="p-3">Proveedor</th>
                              <th className="p-3">Costo ($)</th>
                              <th className="p-3">PVP Venta ($)</th>
                              <th className="p-3">Margen</th>
                              <th className="p-3">Estado Compra</th>
                              <th className="p-3 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {ordenDetalle.items.map((it: RepuestoPresupuesto, idx: number) => (
                              <tr key={it.id || idx} className="hover:bg-white/[0.02]">
                                <td className="p-3 w-16">
                                  <input
                                    type="number"
                                    min="1"
                                    value={it.qty}
                                    onChange={(e) => handleUpdateRepuesto(idx, "qty", Number(e.target.value) || 1)}
                                    className="w-14 h-8 px-2 rounded-lg bg-zinc-950 border border-white/10 text-center font-bold text-white text-xs"
                                  />
                                </td>
                                <td className="p-3 min-w-[180px]">
                                  <input
                                    type="text"
                                    value={it.name}
                                    onChange={(e) => handleUpdateRepuesto(idx, "name", e.target.value)}
                                    className="w-full h-8 px-2 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white"
                                  />
                                </td>
                                <td className="p-3 min-w-[160px]">
                                  <select
                                    value={it.supplierId || ""}
                                    onChange={(e) => handleUpdateRepuesto(idx, "supplierId", e.target.value)}
                                    className="w-full h-8 px-2 rounded-lg bg-zinc-950 border border-white/10 text-xs text-zinc-200"
                                  >
                                    <option value="">Proveedor General</option>
                                    {proveedores.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} {p.phone ? `(${p.phone})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-3 w-24">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={it.costPrice}
                                    onChange={(e) => handleUpdateRepuesto(idx, "costPrice", Number(e.target.value) || 0)}
                                    className="w-20 h-8 px-2 rounded-lg bg-zinc-950 border border-white/10 text-right text-xs text-amber-300 font-mono"
                                  />
                                </td>
                                <td className="p-3 w-24">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={it.price}
                                    onChange={(e) => handleUpdateRepuesto(idx, "price", Number(e.target.value) || 0)}
                                    className="w-20 h-8 px-2 rounded-lg bg-zinc-950 border border-white/10 text-right text-xs text-emerald-400 font-mono font-bold"
                                  />
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                                      it.marginPercent >= 25
                                        ? "bg-emerald-500/15 text-emerald-300"
                                        : it.marginPercent > 0
                                        ? "bg-amber-500/15 text-amber-300"
                                        : "bg-red-500/15 text-red-300"
                                    }`}
                                  >
                                    {it.marginPercent}% (${it.margin.toFixed(2)})
                                  </span>
                                </td>
                                <td className="p-3">
                                  <select
                                    value={it.purchaseStatus}
                                    onChange={(e) => handleUpdateRepuesto(idx, "purchaseStatus", e.target.value)}
                                    className={`h-8 px-2 rounded-lg border text-[11px] font-bold ${
                                      it.purchaseStatus === "RECIBIDO"
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                        : it.purchaseStatus === "COMPRADO"
                                        ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                                        : it.purchaseStatus === "PEDIDO_WHATSAPP"
                                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-300"
                                    }`}
                                  >
                                    <option value="POR_PEDIR">Por Pedir</option>
                                    <option value="PEDIDO_WHATSAPP">Pedido WhatsApp</option>
                                    <option value="COMPRADO">Comprado</option>
                                    <option value="RECIBIDO">Recibido</option>
                                  </select>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarRepuesto(idx)}
                                    className="w-7 h-7 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 flex items-center justify-center text-xs cursor-pointer ml-auto"
                                    title="Eliminar repuesto"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN DE MANO DE OBRA Y SERVICIOS */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>👤</span>
                          <span>Mano de Obra & Servicios Técnicos</span>
                        </h4>
                        <p className="text-xs text-zinc-400">
                          Servicios de taller, mantenimiento, lubricentro o lavado.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setModalNuevoServicio(true)}
                        className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-purple-500/20 cursor-pointer active:scale-95 transition-all"
                      >
                        <span>+</span>
                        <span>Agregar Servicio</span>
                      </button>
                    </div>

                    {ordenDetalle?.services?.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/5 text-center text-xs text-zinc-400">
                        No hay servicios de mano de obra en este presupuesto.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ordenDetalle.services.map((sv: ServicioPresupuesto, idx: number) => (
                          <div
                            key={sv.id || idx}
                            className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-between gap-3"
                          >
                            <div>
                              <strong className="text-sm text-white block">{sv.name}</strong>
                              <span className="text-[11px] text-zinc-400">
                                {sv.category} • Mecánico: {sv.mechanic || "Taller"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-emerald-400">
                                ${Number(sv.price || 0).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleEliminarServicio(idx)}
                                className="w-6 h-6 rounded-md bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 flex items-center justify-center text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* TAB 3: CONTACTO Y PEDIDOS WHATSAPP A PROVEEDORES */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>💬</span>
                        <span>Consolidado de Repuestos por Proveedor para WhatsApp</span>
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Envía la lista consolidada de repuestos de esta orden directamente al WhatsApp del proveedor.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalNuevoProveedor(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>+</span>
                      <span>Crear Proveedor</span>
                    </button>
                  </div>

                  {repuestosPorProveedor.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-zinc-900/30 border border-white/5 text-xs text-zinc-400">
                      No hay repuestos registrados en este presupuesto para cotizar a proveedores.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {repuestosPorProveedor.map((grupo, idx) => {
                        const textoLista = grupo.items
                          .map((i) => `• ${i.qty}x ${i.name} (Ref: ${i.code})`)
                          .join("\n");
                        const linkWa = generarLinkWhatsAppProveedor(grupo.telefono, textoLista);

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 space-y-3 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                                <strong className="text-sm text-white">{grupo.proveedor}</strong>
                                <span className="text-xs font-mono text-zinc-400">
                                  {grupo.telefono || "Sin teléfono"}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                                  Repuestos requeridos ({grupo.items.length}):
                                </span>
                                <ul className="text-xs text-zinc-300 space-y-1 bg-black/30 p-2.5 rounded-xl font-mono">
                                  {grupo.items.map((i, iIdx) => (
                                    <li key={iIdx}>
                                      • {i.qty}x {i.name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              <div>
                                <span className="text-[10px] text-zinc-400 uppercase block">Costo Estimado</span>
                                <strong className="text-sm font-mono text-amber-300">
                                  ${grupo.totalCosto.toFixed(2)}
                                </strong>
                              </div>

                              <a
                                href={linkWa}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                              >
                                <span>💬</span>
                                <span>Enviar WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer / Barra de Totales y Autorización */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 sm:gap-6">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Costo Compra</span>
                  <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                    ${totalesCalculados.costo.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">PVP Total Cliente</span>
                  <span className="text-base sm:text-xl font-black text-emerald-400 font-mono">
                    ${totalesCalculados.venta.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Margen Ganancia</span>
                  <span className="text-xs sm:text-sm font-bold text-sky-300">
                    {totalesCalculados.margen}% (${totalesCalculados.utilidad.toFixed(2)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGuardarBorrador}
                  disabled={guardandoPresupuesto}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {guardandoPresupuesto ? "Guardando..." : "💾 Guardar Borrador"}
                </button>

                <button
                  type="button"
                  onClick={handleAutorizarYEnviarAPos}
                  disabled={autorizandoCobro}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {autorizandoCobro ? (
                    "Autorizando..."
                  ) : (
                    <>
                      <span>🚀 Autorizar Cobro y Enviar a POS</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREAR REPUESTO / PRODUCTO RÁPIDO
          ===================================================================== */}
      {modalNuevoRepuesto && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleCrearRepuestoRapido}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚙️</span>
                <span>Crear Repuesto en Catálogo</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalNuevoRepuesto(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Nombre del Repuesto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pastillas de freno delanteras"
                  value={nuevoRepNombre}
                  onChange={(e) => setNuevoRepNombre(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Costo Compra ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={nuevoRepCosto}
                    onChange={(e) => setNuevoRepCosto(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-amber-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">PVP Venta ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={nuevoRepPvp}
                    onChange={(e) => setNuevoRepPvp(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Proveedor Habitual</label>
                <select
                  value={nuevoRepProveedorId}
                  onChange={(e) => setNuevoRepProveedorId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200"
                >
                  <option value="">Proveedor General</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalNuevoRepuesto(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creandoRepuesto}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs"
              >
                {creandoRepuesto ? "Creando..." : "Guardar & Agregar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREAR SERVICIO RÁPIDO
          ===================================================================== */}
      {modalNuevoServicio && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleCrearServicioRapido}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>👤</span>
                <span>Crear Servicio Técnico</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalNuevoServicio(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cambio de kit de distribución"
                  value={nuevoSrvNombre}
                  onChange={(e) => setNuevoSrvNombre(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Precio Mano de Obra ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={nuevoSrvPrecio}
                    onChange={(e) => setNuevoSrvPrecio(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-emerald-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Categoría</label>
                  <select
                    value={nuevoSrvCategoria}
                    onChange={(e) => setNuevoSrvCategoria(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200"
                  >
                    <option value="Mano de Obra">Mano de Obra</option>
                    <option value="Mantenimiento Rápido">Mantenimiento Rápido</option>
                    <option value="Frenos y Suspensión">Frenos y Suspensión</option>
                    <option value="Electricidad Automotriz">Electricidad</option>
                    <option value="Lavado y Detailing">Lavado / Detailing</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalNuevoServicio(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creandoServicio}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs"
              >
                {creandoServicio ? "Creando..." : "Guardar & Agregar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREAR PROVEEDOR RÁPIDO
          ===================================================================== */}
      {modalNuevoProveedor && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleCrearProveedorRapido}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🏢</span>
                <span>Registrar Nuevo Proveedor</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalNuevoProveedor(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Nombre Comercial / Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Importadora Repuestos Japoneses"
                  value={nuevoProvNombre}
                  onChange={(e) => setNuevoProvNombre(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+593 99..."
                    value={nuevoProvTelefono}
                    onChange={(e) => setNuevoProvTelefono(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-emerald-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 font-semibold block mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej: Ing. Carlos"
                    value={nuevoProvContacto}
                    onChange={(e) => setNuevoProvContacto(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalNuevoProveedor(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creandoProveedor}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {creandoProveedor ? "Guardando..." : "Guardar Proveedor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          LIGHTBOX MODAL PARA IMÁGENES
          ===================================================================== */}
      {imagenModalUrl && (
        <div
          onClick={() => setImagenModalUrl(null)}
          className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/15">
            <img src={imagenModalUrl} alt="Zoom" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setImagenModalUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
