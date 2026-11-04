"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { getClientUserBranch, getClientActiveBranch, SedeType } from "@/lib/branch";
import { BranchTabs } from "@/components/pos/BranchTabs";

interface Product {
  id: string;
  code: string;
  name: string;
  brand?: string | null;
  category: string;
  price: number | string;
  stock: number;
  minStock: number;
  status: string;
  isService?: boolean;
  estimatedMinutes?: number;
  imageUrl?: string | null;
  empleado_id?: string | null;
  empleado_nombre?: string | null;
}

export interface VehicleItem {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  color?: string | null;
  mileage?: number | null;
  fuelType?: string | null;
  vehicleType?: string | null;
  tallerVisits?: number;
}

interface Customer {
  id: string;
  identification: string;
  name: string;
  phone: string;
  type: string;
  vehicles?: VehicleItem[];
}

interface VentaEnEspera {
  id: string;
  nombre: string;
  cart: { product: Product; qty: number }[];
  clienteSeleccionado: Customer | null;
  vehiculoSeleccionado?: VehicleItem | null;
  descuentoTipo: "monto" | "porcentaje";
  descuentoValor: number;
  solicitudActiva: any | null;
  timestamp: string;
}

function getProductEmoji(name: string, category: string = ""): string {
  const text = (name + " " + category).toLowerCase();
  if (text.includes("lavado") || text.includes("chasis") || text.includes("estética")) return "🚿";
  if (text.includes("alineación") || text.includes("balanceo")) return "⚖️";
  if (text.includes("diagnóstico") || text.includes("escáner") || text.includes("obd")) return "💻";
  if (text.includes("clima") || text.includes("aire acondicionado")) return "❄️";
  if (text.includes("aceite") || text.includes("lubricante")) return "🛢️";
  if (text.includes("filtro")) return "⚙️";
  if (text.includes("freno") || text.includes("pastilla")) return "🛑";
  if (text.includes("batería") || text.includes("bateria")) return "🔋";
  if (text.includes("liquido") || text.includes("líquido") || text.includes("fluido")) return "🧪";
  if (text.includes("bujia") || text.includes("bujía")) return "⚡";
  if (text.includes("llanta") || text.includes("neumatico")) return "🛞";
  if (text.includes("limpiaparabrisas")) return "💧";
  return "📦";
}

function formatMoneda(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "$0";
  const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
  return (
    "$" +
    num.toLocaleString("es-CL", {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatSaleNumber(saleNum: string | undefined | null): string {
  if (!saleNum) return "VENTA 001";
  if (/^VENTA[- ]/i.test(saleNum)) {
    return saleNum.replace(/^VENTA[- ]/i, "VENTA ");
  }
  if (/^(VEN|VTA)[- ]/i.test(saleNum)) {
    return saleNum.replace(/^(VEN|VTA)[- ]/i, "VENTA ");
  }
  return saleNum;
}

function formatFechaVencimientoLarga(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return dateStr;

  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const diaSemana = dias[date.getDay()];
  const diaMes = date.getDate();
  const mesNombre = meses[date.getMonth()];
  const anioDosDigitos = String(date.getFullYear()).slice(-2);

  return `${diaSemana} ${diaMes} ${mesNombre}, ${anioDosDigitos}`;
}

export default function NuevaVentaPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Product[]>([]);
  const [cotizando, setCotizando] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "productos" | "servicios">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [vistaMovil, setVistaMovil] = useState<"catalogo" | "carrito">("catalogo");
  const [vistaCatalogo, setVistaCatalogo] = useState<"grid" | "list">("grid");
  const [detalleProductoModal, setDetalleProductoModal] = useState<Product | null>(null);

  const categoriasProductos = [
    { id: "todos", label: "Todos" },
    { id: "aceite", label: "Aceite", match: ["aceite", "lubricante", "10w", "5w", "20w", "motor", "valvulina"] },
    { id: "repuesto", label: "Repuesto", match: ["repuesto", "freno", "pastilla", "bujia", "bujía", "disco", "amortiguador", "embrague"] },
    { id: "accesorios", label: "Accesorios", match: ["accesorio", "plumilla", "ambientador", "limpiaparabrisas", "tapa"] },
    { id: "refrigerantes", label: "Refrigerantes", match: ["refrigerante", "coolant", "anticongelante", "fluido", "líquido", "liquido"] },
    { id: "filtros", label: "Filtros", match: ["filtro"] },
  ];

  const categoriasServicios = [
    { id: "todos", label: "Todos" },
    { id: "mantenimiento", label: "Mantenimiento", match: ["mantenimiento", "preventivo", "afinamiento", "revision", "revisión", "inspeccion", "inspección", "servicio"] },
    { id: "frenos", label: "Frenos", match: ["freno", "frenos", "pastilla", "disco", "balata"] },
    { id: "diagnostico", label: "Diagnóstico", match: ["diagnostico", "diagnóstico", "escaner", "escáner", "scanner", "obd", "revision", "chequeo", "electrico", "eléctrico", "electricidad", "bateria", "batería"] },
    { id: "lavado", label: "Lavado", match: ["lavado", "limpieza", "estetica", "estética", "chasis", "pulido", "detallado"] },
    { id: "alineacion", label: "Alineación", match: ["alineacion", "alineación", "balanceo", "tramado", "suspension", "suspensión"] },
    { id: "motor", label: "Motor", match: ["motor", "culata", "correa", "distribucion", "distribución", "valvula", "válvula", "arranque", "alternador"] },
  ];

  const handleCambiarFiltroTipo = (tipo: "todos" | "productos" | "servicios") => {
    setFiltroTipo((prev) => (prev === tipo ? "todos" : tipo));
    setFiltroCategoria("todos");
  };

  // Categorías mostradas dinámicamente según si se seleccionó Productos o Servicios
  const categoriasVisibles = useMemo(() => {
    if (filtroTipo === "servicios") {
      const base = [...categoriasServicios];
      const catsSet = new Set<string>();
      productos.forEach((p) => {
        if (p.isService && p.category && p.category.trim()) {
          catsSet.add(p.category.trim());
        }
      });
      catsSet.forEach((catName) => {
        const lower = catName.toLowerCase();
        if (lower.includes("favorito") || lower.includes("ampollet") || lower === "general" || lower === "todos") return;
        const existe = base.some(
          (b) => b.id === lower || b.label.toLowerCase() === lower || b.match?.includes(lower)
        );
        if (!existe) {
          base.push({ id: lower, label: catName, match: [lower] });
        }
      });
      return base;
    }

    const base = [...categoriasProductos];
    const catsSet = new Set<string>();
    productos.forEach((p) => {
      if (!p.isService && p.category && p.category.trim()) {
        catsSet.add(p.category.trim());
      }
    });
    catsSet.forEach((catName) => {
      const lower = catName.toLowerCase();
      if (lower.includes("ampollet") || lower.includes("favorito") || lower === "general" || lower === "todos") return;
      const existe = base.some(
        (b) => b.id === lower || b.label.toLowerCase() === lower || b.match?.includes(lower)
      );
      if (!existe) {
        base.push({ id: lower, label: catName, match: [lower] });
      }
    });
    return base;
  }, [filtroTipo, productos]);

  // Sede asignada al operador POS
  const [userBranch, setUserBranch] = useState<SedeType>("PRINCIPAL");

  useEffect(() => {
    const syncBranch = () => {
      setUserBranch(getClientUserBranch());
    };
    syncBranch();
    window.addEventListener("autog-branch-change", syncBranch);
    return () => window.removeEventListener("autog-branch-change", syncBranch);
  }, []);

  // Clientes
  const [clientes, setClientes] = useState<Customer[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("pos_clientes_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Customer | null>(null);
  const [mostrarModalClientes, setMostrarModalClientes] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [creandoClienteInline, setCreandoClienteInline] = useState(false);
  const [nuevoClienteTipo, setNuevoClienteTipo] = useState<"Personal" | "Empresa">("Personal");
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteIdent, setNuevoClienteIdent] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("");
  const [nuevoClienteEmail, setNuevoClienteEmail] = useState("");
  const [nuevoClienteDireccion, setNuevoClienteDireccion] = useState("");
  const [guardandoClienteInline, setGuardandoClienteInline] = useState(false);

  // Vehículo Asociado al Cliente (Historial)
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehicleItem | null>(null);
  const [mostrarModalVehiculos, setMostrarModalVehiculos] = useState(false);
  const [creandoVehiculoInline, setCreandoVehiculoInline] = useState(false);
  const [nuevoVehiculoPlaca, setNuevoVehiculoPlaca] = useState("");
  const [nuevoVehiculoMarca, setNuevoVehiculoMarca] = useState("");
  const [nuevoVehiculoModelo, setNuevoVehiculoModelo] = useState("");
  const [nuevoVehiculoAnio, setNuevoVehiculoAnio] = useState("");
  const [nuevoVehiculoCombustible, setNuevoVehiculoCombustible] = useState("Gasolina");
  const [nuevoVehiculoKilometraje, setNuevoVehiculoKilometraje] = useState("");
  const [nuevoVehiculoColor, setNuevoVehiculoColor] = useState("");
  const [guardandoVehiculoInline, setGuardandoVehiculoInline] = useState(false);

  // Carrito
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);

  // 1. Descuento
  const [descuentoTipo, setDescuentoTipo] = useState<"monto" | "porcentaje">("monto");
  const [descuentoValor, setDescuentoValor] = useState<number>(0);
  const [mostrarModalDescuento, setMostrarModalDescuento] = useState(false);

  // IVA configurable
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(16);
  const [mostrarModalIva, setMostrarModalIva] = useState(false);
  const [ivaTempInput, setIvaTempInput] = useState("16");

  // 2. Calculadora de Cambio en Efectivo
  const [montoRecibido, setMontoRecibido] = useState<string>("");

  // 3. Ventas en Espera (Pausa)
  const [ventasEnEspera, setVentasEnEspera] = useState<VentaEnEspera[]>([]);
  const [mostrarModalEspera, setMostrarModalEspera] = useState(false);

  // 4. Ítem Rápido / Manual
  const [mostrarModalItemManual, setMostrarModalItemManual] = useState(false);
  const [manualNombre, setManualNombre] = useState("");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualCantidad, setManualCantidad] = useState("1");
  const [manualCategoria, setManualCategoria] = useState("Servicio");

  // Checkout modal
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "Tarjeta" | "Transferencia" | "Crédito" | "Mixto">("Efectivo");
  const [diasCredito, setDiasCredito] = useState<number>(30);
  const [fechaVencimientoCredito, setFechaVencimientoCredito] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [identificacionCreditoManual, setIdentificacionCreditoManual] = useState("");
  const [nombreCreditoManual, setNombreCreditoManual] = useState("");
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState<any | null>(null);

  // Cobro Mixto (Efectivo, Tarjeta, Transferencia, Crédito)
  const [montoMixtoEfectivo, setMontoMixtoEfectivo] = useState("");
  const [montoMixtoTarjeta, setMontoMixtoTarjeta] = useState("");
  const [montoMixtoTransferencia, setMontoMixtoTransferencia] = useState("");
  const [montoMixtoCredito, setMontoMixtoCredito] = useState("");
  const [efectivoEntregadoMixto, setEfectivoEntregadoMixto] = useState("");

  // Solicitudes Web
  const [solicitudActiva, setSolicitudActiva] = useState<any | null>(null);
  const [solicitudesPendientesCount, setSolicitudesPendientesCount] = useState(0);

  // Flotante: Apertura / Cierre de Caja
  const [cajaActiva, setCajaActiva] = useState<any | null>(null);
  const [mostrarModalApertura, setMostrarModalApertura] = useState(false);
  const [fondoApertura, setFondoApertura] = useState("");
  const [guardandoApertura, setGuardandoApertura] = useState(false);
  const [cajaInfo, setCajaInfo] = useState<{ initialCash: number; expectedCash: number } | null>(null);

  // Flotante: Cierre de Caja
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [conteoCierre, setConteoCierre] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  const [cerrandoCaja, setCerrandoCaja] = useState(false);

  // Barra Superior POS Ventas
  const [vendedor, setVendedor] = useState<string>("Gonzalo Rojas");
  const [modalCambiarVendedor, setModalCambiarVendedor] = useState(false);
  const [nuevoVendedorTemp, setNuevoVendedorTemp] = useState("");
  const [modalNotasVenta, setModalNotasVenta] = useState(false);
  const [notasVenta, setNotasVenta] = useState("");
  const [mostrarModalAnular, setMostrarModalAnular] = useState(false);
  const [esPantallaCompleta, setEsPantallaCompleta] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pos_vendedor_nombre");
      if (saved) setVendedor(saved);
      const savedVista = localStorage.getItem("pos_vista_catalogo");
      if (savedVista === "list" || savedVista === "grid") setVistaCatalogo(savedVista);
    }
  }, []);

  const cambiarVistaCatalogo = (modo: "grid" | "list") => {
    setVistaCatalogo(modo);
    if (typeof window !== "undefined") {
      localStorage.setItem("pos_vista_catalogo", modo);
    }
  };

  const togglePantallaCompleta = () => {
    if (typeof document !== "undefined") {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setEsPantallaCompleta(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setEsPantallaCompleta(false);
      }
    }
  };

  // Flotante: Pedidos (3 Orígenes: Landing, Tienda, Taller)
  const [mostrarModalPedidos, setMostrarModalPedidos] = useState(false);
  const [listaPedidos, setListaPedidos] = useState<any[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [filtroOrigenModal, setFiltroOrigenModal] = useState<"todos" | "Tienda" | "Ordenes">("todos");
  const [pedidoParaVer, setPedidoParaVer] = useState<any | null>(null);
  const [pedidoAEliminar, setPedidoAEliminar] = useState<{ id: string; requestNumber: string } | null>(null);
  const [eliminandoPedido, setEliminandoPedido] = useState(false);

  const handleRechazarPedido = (id: string, num: string) => {
    setPedidoAEliminar({ id, requestNumber: num });
  };

  const confirmarEliminarPedido = async () => {
    if (!pedidoAEliminar) return;
    setEliminandoPedido(true);
    try {
      const res = await fetch(`/api/solicitudes?id=${pedidoAEliminar.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setListaPedidos((prev) => prev.filter((p) => p.id !== pedidoAEliminar.id));
        cargarConteoWeb();
        if (pedidoParaVer?.id === pedidoAEliminar.id) setPedidoParaVer(null);
        setPedidoAEliminar(null);
      } else {
        const fallback = await fetch("/api/solicitudes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pedidoAEliminar.id, status: "CANCELADO" }),
        });
        if (fallback.ok) {
          setListaPedidos((prev) => prev.filter((p) => p.id !== pedidoAEliminar.id));
          cargarConteoWeb();
          if (pedidoParaVer?.id === pedidoAEliminar.id) setPedidoParaVer(null);
          setPedidoAEliminar(null);
        }
      }
    } catch (e) {
      console.error("Error al eliminar pedido:", e);
    } finally {
      setEliminandoPedido(false);
    }
  };



  const obtenerOrigenPedido = (tipo?: string): "Tienda" | "Ordenes" => {
    if (!tipo) return "Tienda";
    const t = tipo.toUpperCase();
    if (t.includes("TALLER") || t.includes("MECANICO") || t.includes("ORDEN") || t.includes("LUBRI") || t.includes("OT")) return "Ordenes";
    return "Tienda";
  };

  const renderOrigenBadge = (tipo?: string) => {
    const origen = obtenerOrigenPedido(tipo);
    if (origen === "Ordenes") {
      const isLubri = (tipo || "").toUpperCase().includes("LUBRI");
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 bg-amber-500/15 border-amber-500/30 text-amber-300">
          <span>🔧</span>
          <span>{isLubri ? "Lubricentro" : "Órdenes"}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 bg-purple-500/15 border-purple-500/30 text-purple-300">
        <span>🛒</span>
        <span>Tienda</span>
      </span>
    );
  };

  // Ref para impresión de ticket
  const ticketRef = useRef<HTMLDivElement>(null);

  // Cargar ventas en espera desde localStorage
  useEffect(() => {
    try {
      const guardadas = localStorage.getItem("pos_ventas_en_espera");
      if (guardadas) {
        setVentasEnEspera(JSON.parse(guardadas));
      }
    } catch (e) {
      console.error("Error al leer ventas en espera:", e);
    }
  }, []);

  const sincronizarVentasEspera = (nuevas: VentaEnEspera[]) => {
    setVentasEnEspera(nuevas);
    try {
      localStorage.setItem("pos_ventas_en_espera", JSON.stringify(nuevas));
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Cargar productos y servicios de taller desde Neon
  const cargarProductos = useCallback(async () => {
    try {
      setCargandoProductos(true);
      const [resProd, resServ] = await Promise.all([
        fetch("/api/productos"),
        fetch("/api/servicios-taller?activos=true"),
      ]);

      const dataProd = await resProd.json();
      const dataServ = await resServ.json();

      let listaCombinada: Product[] = [];
      if (resProd.ok && dataProd.success && Array.isArray(dataProd.productos)) {
        listaCombinada = [...dataProd.productos];
      }

      if (resServ.ok && dataServ.success && Array.isArray(dataServ.servicios)) {
        const serviciosComoItems: Product[] = dataServ.servicios.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          brand: "Servicio Taller",
          category: s.category || "Servicios",
          price: Number(s.price),
          stock: 999, // Mano de obra disponible
          minStock: 1,
          status: "ACTIVO",
          isService: true,
          estimatedMinutes: s.estimatedMinutes,
        }));
        listaCombinada = [...listaCombinada, ...serviciosComoItems];
      }

      setProductos(listaCombinada);
    } catch (err) {
      console.error("Error al cargar productos y servicios:", err);
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  // 2. Cargar clientes (optimizado con pos=true y cache local)
  const cargarClientes = useCallback(async () => {
    try {
      const res = await fetch("/api/clientes?pos=true");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.clientes)) {
        setClientes(data.clientes);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("pos_clientes_cache", JSON.stringify(data.clientes));
          } catch {}
        }
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    }
  }, []);

  // Registrar cliente nuevo directamente en Neon desde el POS
  const handleGuardarClienteInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoClienteNombre.trim()) {
      alert("El nombre del cliente es obligatorio.");
      return;
    }

    setGuardandoClienteInline(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoClienteNombre.trim(),
          identificacion: nuevoClienteIdent.trim() || undefined,
          telefono: nuevoClienteTelefono.trim() || undefined,
          email: nuevoClienteEmail.trim() || undefined,
          direccion: nuevoClienteDireccion.trim() || undefined,
          tipoCliente: nuevoClienteTipo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el cliente.");
      }

      const creado = data.cliente;
      setClientes((prev) => [creado, ...prev]);
      setClienteSeleccionado(creado);
      setNuevoClienteNombre("");
      setNuevoClienteIdent("");
      setNuevoClienteTelefono("");
      setNuevoClienteEmail("");
      setNuevoClienteDireccion("");
      setNuevoClienteTipo("Personal");
      setCreandoClienteInline(false);
      setMostrarModalClientes(false);
    } catch (err: any) {
      alert(err.message || "Error al registrar cliente.");
    } finally {
      setGuardandoClienteInline(false);
    }
  };

  // Registrar vehículo rápido para el cliente seleccionado directamente en Neon
  const handleGuardarVehiculoInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado) {
      alert("Selecciona un cliente primero.");
      return;
    }
    if (!nuevoVehiculoPlaca.trim() || !nuevoVehiculoMarca.trim() || !nuevoVehiculoModelo.trim()) {
      alert("Placa, marca y modelo son obligatorios.");
      return;
    }

    setGuardandoVehiculoInline(true);
    try {
      const res = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: nuevoVehiculoPlaca.trim().toUpperCase(),
          brand: nuevoVehiculoMarca.trim(),
          model: nuevoVehiculoModelo.trim(),
          year: nuevoVehiculoAnio ? parseInt(nuevoVehiculoAnio, 10) : undefined,
          fuelType: nuevoVehiculoCombustible || "Gasolina",
          mileage: nuevoVehiculoKilometraje ? parseInt(nuevoVehiculoKilometraje.replace(/\D/g, ""), 10) : undefined,
          color: nuevoVehiculoColor.trim() || undefined,
          customerId: clienteSeleccionado.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el vehículo.");
      }

      const creado: VehicleItem = {
        ...data.vehicle,
        tallerVisits: 0,
      };
      const updatedVehicles = [...(clienteSeleccionado.vehicles || []), creado];
      const updatedCliente = { ...clienteSeleccionado, vehicles: updatedVehicles };
      setClienteSeleccionado(updatedCliente);
      setVehiculoSeleccionado(creado);
      setClientes((prev) =>
        prev.map((c) => (c.id === clienteSeleccionado.id ? updatedCliente : c))
      );

      setNuevoVehiculoPlaca("");
      setNuevoVehiculoMarca("");
      setNuevoVehiculoModelo("");
      setNuevoVehiculoAnio("");
      setNuevoVehiculoCombustible("Gasolina");
      setNuevoVehiculoKilometraje("");
      setNuevoVehiculoColor("");
      setCreandoVehiculoInline(false);
      setMostrarModalVehiculos(false);
    } catch (err: any) {
      alert(err.message || "Error al registrar vehículo.");
    } finally {
      setGuardandoVehiculoInline(false);
    }
  };

  const ultimoConteoWebRef = useRef<number>(Date.now());

  // 3. Cargar conteo de pedidos pendientes (optimizado para bajo CPU)
  const cargarConteoWeb = useCallback(async () => {
    try {
      const res = await fetch("/api/solicitudes?countOnly=true");
      const data = await res.json();
      if (res.ok && data.success) {
        setSolicitudesPendientesCount(data.stats?.pendientes || 0);
        ultimoConteoWebRef.current = Date.now();
      }
    } catch (err) {
      console.error("Error al cargar conteo solicitudes:", err);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
    cargarClientes();
    cargarConteoWeb();

    // Solo consultar si el usuario vuelve a la pestaña y pasaron más de 90 segundos
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - ultimoConteoWebRef.current > 90000) {
        cargarConteoWeb();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [cargarProductos, cargarClientes, cargarConteoWeb]);

  // Verificar apertura de caja al entrar a Venta
  const verificarCajaApertura = useCallback(async (autoOpenOnMissing: boolean = true) => {
    try {
      const activeBr = getClientActiveBranch();
      const uBr = getClientUserBranch();
      const res = await fetch(`/api/caja?sede=${encodeURIComponent(activeBr)}&userBranch=${encodeURIComponent(uBr)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const active = json.activeSession || null;
        setCajaActiva(active);
        if (active) {
          if (typeof window !== "undefined") {
            localStorage.setItem("pos_caja_activa", "ABIERTA");
            sessionStorage.removeItem("pos_caja_omitida");
          }
          setCajaInfo({
            initialCash: parseFloat(active.initialCash?.toString() || "0"),
            expectedCash: parseFloat(json.data?.expectedCash?.toString() || active.initialCash?.toString() || "0"),
          });
          setMostrarModalApertura(false);
        } else {
          if (typeof window !== "undefined") {
            localStorage.setItem("pos_caja_activa", "CERRADA");
          }
          setCajaInfo(null);
          const omitida = typeof window !== "undefined" && sessionStorage.getItem("pos_caja_omitida") === "true";
          if (autoOpenOnMissing && !omitida) {
            setFondoApertura("");
            setMostrarModalApertura(true);
          }
        }
      }
    } catch (e) {
      console.error("Error al consultar caja:", e);
    }
  }, []);

  useEffect(() => {
    // Si el usuario ya omitió la apertura en esta sesión, NO debe volver a salir hasta que él marque
    const omitida = typeof window !== "undefined" && sessionStorage.getItem("pos_caja_omitida") === "true";
    if (!omitida && typeof window !== "undefined") {
      const estadoCaja = localStorage.getItem("pos_caja_activa");
      if (estadoCaja !== "ABIERTA") {
        setMostrarModalApertura(true);
      }
    }

    verificarCajaApertura(!omitida);
  }, [verificarCajaApertura]);

  const handleGuardarApertura = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const monto = parseFloat(fondoApertura) || 0;
    if (monto < 0 || isNaN(monto)) {
      alert("Monto inválido");
      return;
    }

    setGuardandoApertura(true);
    try {
      const activeBr = getClientActiveBranch();
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_INITIAL",
          initialCash: monto,
          branch: activeBr,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al abrir caja");
      }

      setMostrarModalApertura(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("pos_caja_activa", "ABIERTA");
        sessionStorage.removeItem("pos_caja_omitida");
      }
      await verificarCajaApertura(false);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoApertura(false);
    }
  };

  const handleOmitirApertura = () => {
    setMostrarModalApertura(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pos_caja_omitida", "true");
    }
  };

  const sumarFondoApertura = (monto: number) => {
    const act = parseFloat(fondoApertura) || 0;
    setFondoApertura((act + monto).toFixed(2));
  };

  const sumarConteoCierre = (monto: number) => {
    const act = parseFloat(conteoCierre) || 0;
    setConteoCierre((act + monto).toFixed(2));
  };

  const handleConfirmarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    const contado = parseFloat(conteoCierre) || 0;
    const esperado = parseFloat(cajaInfo?.expectedCash?.toString() || "0");
    const diferencia = contado - esperado;

    setCerrandoCaja(true);
    try {
      const res = await fetch("/api/caja", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: cajaActiva?.id,
          declaredCash: contado,
          expectedCash: esperado,
          diffCash: diferencia,
          notes: notasCierre,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al cerrar caja");
      }

      setCajaActiva(null);
      setCajaInfo(null);
      setMostrarModalCierre(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("pos_caja_activa", "CERRADA");
        sessionStorage.removeItem("pos_caja_omitida");
      }
      setConteoCierre("");
      setNotasCierre("");
      await verificarCajaApertura();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCerrandoCaja(false);
    }
  };

  // Abrir y cargar lista de pedidos pendientes
  const abrirModalPedidos = async () => {
    setMostrarModalPedidos(true);
    setCargandoPedidos(true);
    try {
      const res = await fetch("/api/solicitudes?estado=PENDIENTE");
      const data = await res.json();
      if (res.ok && data.success) {
        const filtrados = (data.solicitudes || []).filter((s: any) => !s.type?.startsWith("CAJA"));
        setListaPedidos(filtrados);
      }
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
    } finally {
      setCargandoPedidos(false);
    }
  };

  // Cargar pedido directamente en el carrito de Venta
  const despacharPedidoEnPos = (item: any) => {
    if (cart.length > 0) {
      // Auto-guardar la venta actual en espera para no perderla
      const nuevaEspera: VentaEnEspera = {
        id: "esp-" + Date.now(),
        nombre: clienteSeleccionado?.name || "Venta en mostrador",
        cart: [...cart],
        clienteSeleccionado,
        descuentoTipo,
        descuentoValor,
        solicitudActiva,
        timestamp: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      };
      const actualizadas = [nuevaEspera, ...ventasEnEspera];
      setVentasEnEspera(actualizadas);
      localStorage.setItem("pos_ventas_en_espera", JSON.stringify(actualizadas));
    }

    setSolicitudActiva(item);

    if (item.customerName) {
      setClienteSeleccionado({
        id: "web-" + item.id,
        identification: item.customerPhone || "N/A",
        name: item.customerName,
        phone: item.customerPhone || "",
        type: obtenerOrigenPedido(item.type),
      });
    }

    let loadedItems: { product: Product; qty: number }[] = [];
    if (item.itemsJson) {
      try {
        const parsed = typeof item.itemsJson === "string" ? JSON.parse(item.itemsJson) : item.itemsJson;
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedItems = parsed.map((p: any, idx: number) => {
            const catItem = productos.find(
              (prod) =>
                (p.code && prod.code.toLowerCase() === String(p.code).toLowerCase()) ||
                (p.name && prod.name.toLowerCase() === String(p.name).toLowerCase())
            );
            const resolvedBasePrice =
              Number(p.price) > 0
                ? Number(p.price)
                : catItem && Number(catItem.price) > 0
                ? Number(catItem.price)
                : Number(item.totalEstimated) > 0 && parsed.length === 1
                ? Number(item.totalEstimated)
                : 15.0;

            return {
              product: {
                id: p.id || `web-item-${idx}`,
                code: p.code || `WEB-${idx + 1}`,
                name: p.name || item.itemsSummary || "Solicitud de Cliente",
                brand: p.brand || null,
                category: p.category || item.type || "General",
                price: resolvedBasePrice,
                stock: 999,
                minStock: 1,
                status: "ACTIVO",
                isService: Boolean(p.isService ?? item.type === "TALLER"),
                empleado_id: p.empleado_id || null,
                empleado_nombre: p.empleado_nombre || null,
              },
              qty: p.qty || p.quantity || 1,
            };
          });
        }
      } catch {
        // fallback
      }
    }

    if (loadedItems.length === 0) {
      loadedItems = [
        {
          product: {
            id: `web-sol-${item.id}`,
            code: item.requestNumber || "SOL-WEB",
            name: item.itemsSummary || `${item.type}: Solicitud Cliente`,
            brand: item.vehicleInfo || null,
            category: item.type || "General",
            price: Number(item.totalEstimated) || 15.0,
            stock: 999,
            minStock: 1,
            status: "ACTIVO",
            isService: item.type === "TALLER",
          },
          qty: 1,
        },
      ];
    }

    setCart(loadedItems);
    setMostrarModalPedidos(false);
    setPedidoParaVer(null);
  };

  // 4. Detectar si viene una solicitud web o de Taller para despachar en Caja de Oficina
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pos_despacho_solicitud");
      if (raw) {
        const item = JSON.parse(raw);
        setSolicitudActiva(item);

        if (item.customerName) {
          setClienteSeleccionado({
            id: "web-" + item.id,
            identification: item.customerPhone || "N/A",
            name: item.customerName,
            phone: item.customerPhone || "",
            type: "Web / " + item.type,
          });
        }

        let loadedItems: { product: Product; qty: number }[] = [];
        if (item.itemsJson) {
          try {
            const parsed = typeof item.itemsJson === "string" ? JSON.parse(item.itemsJson) : item.itemsJson;
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedItems = parsed.map((p: any, idx: number) => {
                const resolvedBasePrice =
                  Number(p.price) > 0
                    ? Number(p.price)
                    : Number(item.totalEstimated) > 0 && parsed.length === 1
                    ? Number(item.totalEstimated)
                    : 15.0;

                return {
                  product: {
                    id: p.id || `web-item-${idx}`,
                    code: p.code || `WEB-${idx + 1}`,
                    name: p.name || item.itemsSummary || "Solicitud de Cliente",
                    brand: p.brand || null,
                    category: p.category || item.type || "General",
                    price: resolvedBasePrice,
                    stock: 999,
                    minStock: 1,
                    status: "ACTIVO",
                    isService: Boolean(p.isService ?? item.type === "TALLER"),
                    empleado_id: p.empleado_id || null,
                    empleado_nombre: p.empleado_nombre || null,
                  },
                  qty: p.qty || p.quantity || 1,
                };
              });
            }
          } catch {
            // fallback
          }
        }

        if (loadedItems.length === 0) {
          loadedItems = [
            {
              product: {
                id: `web-sol-${item.id}`,
                code: item.requestNumber || "SOL-WEB",
                name: item.itemsSummary || `${item.type}: Solicitud Cliente`,
                brand: item.vehicleInfo || null,
                category: item.type,
                price: Number(item.totalEstimated) || 15.0,
                stock: 999,
                minStock: 1,
                status: "ACTIVO",
                isService: item.type === "TALLER",
              },
              qty: 1,
            },
          ];
        }

        setCart(loadedItems);
      }
    } catch (e) {
      console.error("Error al leer despacho:", e);
    }
  }, []);

  // Filtrado de productos y servicios
  const filteredProducts = productos.filter((item) => {
    // Búsqueda por producto, servicio, SKU o código de barras
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const coincide =
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.code && item.code.toLowerCase().includes(term)) ||
        (item.brand && item.brand.toLowerCase().includes(term)) ||
        (item.category && item.category.toLowerCase().includes(term));

      if (!coincide) return false;

      // Si hay filtro por tipo, respetarlo salvo coincidencia exacta por código
      if (filtroTipo === "productos" && item.isService && item.code.toLowerCase() !== term) return false;
      if (filtroTipo === "servicios" && !item.isService && item.code.toLowerCase() !== term) return false;

      return true;
    }

    // Filtro por tipo: Productos o Servicios
    if (filtroTipo === "productos" && item.isService) return false;
    if (filtroTipo === "servicios" && !item.isService) return false;

    // Filtro por categoría (Todos muestra todo del tipo seleccionado)
    if (filtroCategoria && filtroCategoria !== "todos") {
      const catObj = categoriasVisibles.find((c) => c.id === filtroCategoria);
      const itemCat = (item.category || "").toLowerCase();
      const itemName = (item.name || "").toLowerCase();

      const coincide = catObj?.match
        ? catObj.match.some((m) => itemCat.includes(m.toLowerCase()) || itemName.includes(m.toLowerCase())) || itemCat.includes(filtroCategoria.toLowerCase())
        : itemCat.includes(filtroCategoria.toLowerCase()) || itemName.includes(filtroCategoria.toLowerCase());

      if (!coincide) return false;
    }

    return true;
  });

  // Operaciones de Carrito
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`El producto "${product.name}" está agotado en inventario.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          alert(`No hay más existencias disponibles (${product.stock} en stock).`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQty = item.qty + delta;
            if (newQty > item.product.stock) {
              alert(`Stock máximo disponible alcanzado: ${item.product.stock}`);
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  // Permitir al cajero en Oficina ajustar el precio final de cada servicio o ítem antes de cobrar
  const updatePrice = (id: string, newPrice: string | number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === id
          ? {
              ...item,
              product: {
                ...item.product,
                price: newPrice,
              },
            }
          : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const limpiarCarrito = () => {
    setCart([]);
    setClienteSeleccionado(null);
    setVehiculoSeleccionado(null);
    setDescuentoValor(0);
    setMontoRecibido("");
  };

  // Función 4: Agregar Ítem Rápido / Manual
  const handleAgregarItemManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNombre.trim()) {
      alert("Ingresa un nombre o descripción del servicio/ítem.");
      return;
    }
    const precio = parseFloat(manualPrecio) || 0;
    const cantidad = parseInt(manualCantidad) || 1;

    const nuevoItem: Product = {
      id: `manual-${Date.now()}`,
      code: `SRV-${Math.floor(100 + Math.random() * 900)}`,
      name: manualNombre.trim(),
      category: manualCategoria || "Servicio",
      price: precio,
      stock: 9999,
      minStock: 0,
      status: "ACTIVO",
    };

    setCart((prev) => [...prev, { product: nuevoItem, qty: cantidad }]);
    setManualNombre("");
    setManualPrecio("");
    setManualCantidad("1");
    setMostrarModalItemManual(false);
  };

  // Función 5: Poner Venta en Espera (Pausa)
  const ponerEnEspera = () => {
    if (cart.length === 0) return;
    const nombreRef = clienteSeleccionado?.name || `Venta #${ventasEnEspera.length + 1}`;
    const nueva: VentaEnEspera = {
      id: `espera-${Date.now()}`,
      nombre: nombreRef,
      cart,
      clienteSeleccionado,
      vehiculoSeleccionado,
      descuentoTipo,
      descuentoValor,
      solicitudActiva,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    sincronizarVentasEspera([nueva, ...ventasEnEspera]);
    limpiarCarrito();
  };

  const recuperarVentaEnEspera = (venta: VentaEnEspera) => {
    setCart(venta.cart);
    setClienteSeleccionado(venta.clienteSeleccionado);
    setVehiculoSeleccionado(venta.vehiculoSeleccionado || null);
    setDescuentoTipo(venta.descuentoTipo);
    setDescuentoValor(venta.descuentoValor);
    setSolicitudActiva(venta.solicitudActiva);
    sincronizarVentasEspera(ventasEnEspera.filter((v) => v.id !== venta.id));
    setMostrarModalEspera(false);
  };

  const eliminarVentaEnEspera = (id: string) => {
    sincronizarVentasEspera(ventasEnEspera.filter((v) => v.id !== id));
  };

  // Cálculos financieros con descuento
  const subtotal = cart.reduce((acc, item) => {
    const price = typeof item.product.price === "number" ? item.product.price : parseFloat(item.product.price) || 0;
    return acc + price * item.qty;
  }, 0);

  const descuentoCalculado =
    descuentoTipo === "porcentaje"
      ? (subtotal * (descuentoValor || 0)) / 100
      : Math.min(descuentoValor || 0, subtotal);

  const subtotalConDescuento = Math.max(0, subtotal - descuentoCalculado);
  const tax = subtotalConDescuento * (ivaPorcentaje / 100);
  const total = subtotalConDescuento + tax;

  // Calculadora de cambio
  const montoRecibidoNum = parseFloat(montoRecibido) || 0;
  const cambio = Math.max(0, montoRecibidoNum - total);
  const faltante = Math.max(0, total - montoRecibidoNum);

  // Cálculos de Cobro Mixto
  const mixtoEfectivoNum = parseFloat(montoMixtoEfectivo) || 0;
  const mixtoTarjetaNum = parseFloat(montoMixtoTarjeta) || 0;
  const mixtoTransferenciaNum = parseFloat(montoMixtoTransferencia) || 0;
  const mixtoCreditoNum = parseFloat(montoMixtoCredito) || 0;

  const totalMixtoAsignado = Number((mixtoEfectivoNum + mixtoTarjetaNum + mixtoTransferenciaNum + mixtoCreditoNum).toFixed(2));
  const saldoRestanteMixto = Number((total - totalMixtoAsignado).toFixed(2));

  const efectivoEntregadoNum = parseFloat(efectivoEntregadoMixto) || 0;
  const cambioMixtoEfectivo = efectivoEntregadoNum > mixtoEfectivoNum ? Number((efectivoEntregadoNum - mixtoEfectivoNum).toFixed(2)) : 0;

  const cambiarDiasCredito = (dias: number) => {
    setDiasCredito(dias);
    const d = new Date();
    d.setDate(d.getDate() + dias);
    setFechaVencimientoCredito(d.toISOString().split("T")[0]);
  };

  // Registrar cobro real
  const handleConfirmarCobro = async () => {
    if (cart.length === 0) return;

    if (metodoPago === "Mixto") {
      if (totalMixtoAsignado <= 0) {
        alert("Debes ingresar los montos en los métodos de pago para el cobro mixto.");
        return;
      }
      if (Math.abs(saldoRestanteMixto) > 0.01) {
        if (saldoRestanteMixto > 0) {
          alert(`Falta asignar $${saldoRestanteMixto.toFixed(2)} para completar el total de $${total.toFixed(2)}.`);
        } else {
          alert(`El total asignado ($${totalMixtoAsignado.toFixed(2)}) excede el monto total ($${total.toFixed(2)}). Ajusta los valores.`);
        }
        return;
      }
    }

    const custName = clienteSeleccionado?.name || "Consumidor Final";
    const custIdent = clienteSeleccionado?.identification || "9999999999";
    const custPhone = clienteSeleccionado?.phone || "N/A";

    setProcesandoVenta(true);

    try {
      const resumenMixtoTexto = metodoPago === "Mixto"
        ? [
            mixtoEfectivoNum > 0 ? `Efectivo: $${mixtoEfectivoNum.toFixed(2)}` : null,
            mixtoTarjetaNum > 0 ? `Tarjeta: $${mixtoTarjetaNum.toFixed(2)}` : null,
            mixtoTransferenciaNum > 0 ? `Transferencia: $${mixtoTransferenciaNum.toFixed(2)}` : null,
            mixtoCreditoNum > 0 ? `Crédito: $${mixtoCreditoNum.toFixed(2)} (${diasCredito}d)` : null,
          ].filter(Boolean).join(" | ")
        : "";

      const notasFinales = metodoPago === "Mixto"
        ? `Cobro Mixto: ${resumenMixtoTexto}${notasVenta ? ` • ${notasVenta}` : ""}`
        : metodoPago === "Crédito"
        ? `Crédito ${diasCredito} días (Vence: ${formatFechaVencimientoLarga(fechaVencimientoCredito)})${notasVenta ? ` • ${notasVenta}` : ""}`
        : (notasVenta || undefined);

      const payload = {
        customerId: clienteSeleccionado?.id || null,
        customerName: custName,
        vehiclePlate: vehiculoSeleccionado?.plate || null,
        vehicleModel: vehiculoSeleccionado ? `${vehiculoSeleccionado.brand} ${vehiculoSeleccionado.model}` : null,
        paymentMethod: metodoPago,
        paymentBreakdown: metodoPago === "Mixto" ? {
          cash: mixtoEfectivoNum,
          card: mixtoTarjetaNum,
          transfer: mixtoTransferenciaNum,
          credit: mixtoCreditoNum,
        } : {
          cash: metodoPago === "Efectivo" ? total : 0,
          card: metodoPago === "Tarjeta" ? total : 0,
          transfer: metodoPago === "Transferencia" ? total : 0,
          credit: metodoPago === "Crédito" ? total : 0,
        },
        discount: descuentoCalculado,
        taxPercent: ivaPorcentaje / 100,
        notes: notasFinales,
        branch: userBranch === "SUCURSAL" ? "SUCURSAL" : (getClientActiveBranch() === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL"),
        sede: userBranch === "SUCURSAL" ? "SUCURSAL" : (getClientActiveBranch() === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL"),
        items: cart.map((i) => ({
          productId: i.product.id,
          code: i.product.code,
          name: i.product.name,
          price: typeof i.product.price === "number" ? i.product.price : parseFloat(i.product.price) || 0,
          quantity: i.qty,
        })),
      };

      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar la venta.");
      }

      // Si hay saldo a Crédito (por venta Crédito total o por Cobro Mixto), registrar en módulo de créditos
      const montoParaCredito = metodoPago === "Crédito" ? total : (metodoPago === "Mixto" ? mixtoCreditoNum : 0);
      if (montoParaCredito > 0) {
        try {
          const credBranch = userBranch === "SUCURSAL" ? "SUCURSAL" : (getClientActiveBranch() === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL");
          await fetch("/api/pos/creditos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              branch: credBranch,
              customerName: custName,
              identification: custIdent,
              phone: custPhone,
              currentBalance: montoParaCredito,
              creditLimit: Math.max(500, montoParaCredito + 200),
              dueDate: fechaVencimientoCredito,
              status: "AL_DIA",
              notes: `Venta POS #${data.venta?.saleNumber || ""} ${metodoPago === "Mixto" ? "(Parte Crédito Mixto)" : ""} • $${montoParaCredito.toFixed(2)} (${diasCredito} días - Vence: ${formatFechaVencimientoLarga(fechaVencimientoCredito)})`,
            }),
          });
        } catch (errCred) {
          console.error("Error al registrar crédito en Neon DB:", errCred);
        }
      }

      if (solicitudActiva?.id) {
        try {
          await fetch("/api/solicitudes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: solicitudActiva.id,
              status: "DESPACHADO",
            }),
          });
          sessionStorage.removeItem("pos_despacho_solicitud");
          setListaPedidos((prev) => prev.filter((p) => p.id !== solicitudActiva.id));
          setSolicitudActiva(null);
          cargarConteoWeb();
        } catch (e) {
          console.error("Error al actualizar estado:", e);
        }
      }

      setVentaCompletada({
        ...data.venta,
        subtotal,
        descuentoCalculado,
        tax,
        ivaPorcentaje,
        paymentMethod: metodoPago,
        paymentBreakdown: metodoPago === "Mixto" ? {
          cash: mixtoEfectivoNum,
          card: mixtoTarjetaNum,
          transfer: mixtoTransferenciaNum,
          credit: mixtoCreditoNum,
        } : undefined,
        montoRecibido: metodoPago === "Efectivo" && montoRecibidoNum > 0
          ? montoRecibidoNum
          : metodoPago === "Mixto" && efectivoEntregadoNum > 0
            ? efectivoEntregadoNum
            : null,
        cambio: metodoPago === "Efectivo" && montoRecibidoNum > 0
          ? cambio
          : metodoPago === "Mixto" && efectivoEntregadoNum > mixtoEfectivoNum
            ? cambioMixtoEfectivo
            : null,
        cartSnap: [...cart],
        vendedorNombre: vendedor,
        customerPhone: custPhone || clienteSeleccionado?.phone || null,
        customerIdentification: custIdent || clienteSeleccionado?.identification || null,
        customerEmail: (clienteSeleccionado as any)?.email || null,
        vehiculoSnap: vehiculoSeleccionado ? { ...vehiculoSeleccionado } : null,
        notes: notasFinales,
      });
      setMostrarModalPago(false);
      setCart([]);
      setClienteSeleccionado(null);
      setVehiculoSeleccionado(null);
      setDescuentoValor(0);
      setMontoRecibido("");
      setIdentificacionCreditoManual("");
      setNombreCreditoManual("");
      setMontoMixtoEfectivo("");
      setMontoMixtoTarjeta("");
      setMontoMixtoTransferencia("");
      setMontoMixtoCredito("");
      setEfectivoEntregadoMixto("");

      await cargarProductos();
    } catch (err: any) {
      console.error(err);
      alert("Error al procesar cobro: " + err.message);
    } finally {
      setProcesandoVenta(false);
    }
  };

  // Cotizar: Registra cotización y navega al listado de cotizaciones
  const handleCotizar = async () => {
    if (cart.length === 0) {
      router.push("/pos/cotizaciones");
      return;
    }

    try {
      setCotizando(true);
      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: clienteSeleccionado?.name || "Consumidor Final",
          customerPhone: clienteSeleccionado?.phone || null,
          customerEmail: (clienteSeleccionado as any)?.email || null,
          items: cart.map((item, idx) => ({
            id: `${item.product.id}-${Date.now()}-${idx}`,
            productId: item.product.id,
            code: item.product.code || "PRD",
            name: item.product.name,
            price: Number(item.product.price) || 0,
            qty: item.qty,
            discount: 0,
          })),
          total: total,
          notes: `Cotización generada desde Terminal POS | Subtotal: $${subtotal.toFixed(2)} | IVA: $${tax.toFixed(2)}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        limpiarCarrito();
        router.push("/pos/cotizaciones");
      } else {
        alert(data.error || "No se pudo generar la cotización.");
      }
    } catch (error) {
      console.error("Error al cotizar:", error);
      alert("Error de conexión al generar la cotización.");
    } finally {
      setCotizando(false);
    }
  };

  // Opciones de Impresión (Ticket Térmico o A4)
  const [formatoImpresionVenta, setFormatoImpresionVenta] = useState<"TICKET" | "A4">("TICKET");
  const [menuImpresionVenta, setMenuImpresionVenta] = useState(false);
  const menuImpresionVentaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuImpresionVentaRef.current && !menuImpresionVentaRef.current.contains(e.target as Node)) {
        setMenuImpresionVenta(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const dispararImpresionVenta = (formato: "TICKET" | "A4") => {
    setFormatoImpresionVenta(formato);
    setMenuImpresionVenta(false);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const clientesFiltrados = clientes.filter((c) => {
    if (!busquedaCliente) return true;
    const term = busquedaCliente.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.identification.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      {/* Estilos dinámicos de impresión para POS Venta */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${formatoImpresionVenta === "TICKET" ? "80mm auto" : "A4 portrait"};
                margin: ${formatoImpresionVenta === "TICKET" ? "2mm 3mm" : "8mm 10mm"};
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />
      <Header />

      {/* Barra Superior Ventas */}
      <nav className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 py-2 shadow-xs">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-2.5 sm:gap-4 overflow-x-auto scrollbar-none">
          {/* Lado Izquierdo: [←] Venta (productos.length) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Link
              href="/pos"
              title="Volver a POS"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
              Venta
            </h1>
            <span className="inline-flex items-center justify-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shrink-0">
              {productos.length}
            </span>
            <BranchTabs onChange={() => verificarCajaApertura(false)} size="sm" />
          </div>

          {/* Lado Derecho: 4 botones de acción cuadrados de solo icono (Historial, Notas, Pausar, Anular) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Historial (Solo icono) */}
            <Link
              href="/pos/facturas"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Historial de facturas y ventas"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" />
                <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" />
                <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" />
                <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" />
                <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" />
                <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" />
              </svg>
            </Link>

            {/* Notas (Solo icono) */}
            <button
              type="button"
              onClick={() => setModalNotasVenta(true)}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Agregar notas a la venta"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {notasVenta && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 absolute -top-1 -right-1 border-2 border-white dark:border-zinc-900 shadow-xs" />
              )}
            </button>

            {/* Pausar (Solo icono) */}
            <button
              type="button"
              onClick={() => {
                if (cart.length > 0) {
                  ponerEnEspera();
                } else {
                  setMostrarModalEspera(true);
                }
              }}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title={ventasEnEspera.length > 0 ? `${ventasEnEspera.length} venta(s) pausada(s)` : "Pausar venta actual"}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {ventasEnEspera.length > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center absolute -top-1.5 -right-1.5 border-2 border-white dark:border-zinc-900 shadow-xs">
                  {ventasEnEspera.length}
                </span>
              )}
            </button>

            {/* Anular (Solo icono) */}
            <button
              type="button"
              onClick={() => setMostrarModalAnular(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/25 hover:border-rose-300 dark:hover:border-rose-800 hover:text-rose-600 dark:hover:text-rose-400 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Anular / Cancelar venta actual"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <line x1="5.7" y1="5.7" x2="18.3" y2="18.3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex flex-col md:flex-row p-3 sm:p-4 md:p-6 gap-4 md:gap-6 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
        {/* Selector de Vista en Móvil (Android / iOS) */}
        <div className="flex md:hidden items-center bg-zinc-200 dark:bg-zinc-800 p-1 rounded-2xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setVistaMovil("catalogo")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              vistaMovil === "catalogo"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <span>📦</span>
            <span>Catálogo ({filteredProducts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setVistaMovil("carrito")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              vistaMovil === "carrito"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <span>🛒</span>
            <span>Ticket ({cart.reduce((a, b) => a + b.qty, 0)})</span>
            {cart.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                ${total.toFixed(2)}
              </span>
            )}
          </button>
        </div>

        {/* Panel Izquierdo: Catálogo y Búsqueda */}
        <div className={`${vistaMovil === "carrito" ? "hidden md:flex" : "flex"} flex-grow flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden`}>
          <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-3 sm:gap-4">

            <div className="flex items-center gap-2 sm:gap-2.5 w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 focus:outline-none focus:border-emerald-500/50 transition-all dark:text-white text-sm font-medium placeholder-zinc-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchTerm.trim()) {
                      e.preventDefault();
                      const term = searchTerm.trim().toLowerCase();
                      const match =
                        productos.find(
                          (p) =>
                            p.code.toLowerCase() === term ||
                            p.name.toLowerCase() === term
                        ) || filteredProducts[0];
                      if (match) {
                        addToCart(match);
                        setSearchTerm("");
                      }
                    }
                  }}
                  autoFocus
                />
                <span className="absolute left-4 top-3.5 text-zinc-400 text-xl">🔍</span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Botón de Pedidos al lado del buscador (solo icono + contador visible) */}
              <button
                type="button"
                onClick={abrirModalPedidos}
                className="relative h-12 px-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-500/30 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 text-sm font-normal transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                title="Pedidos pendientes"
              >
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                <span>Órdenes</span>
                {solicitudesPendientesCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500/25 dark:bg-emerald-500/30 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold font-mono flex items-center justify-center shadow-sm backdrop-blur-sm">
                    {solicitudesPendientesCount}
                  </span>
                )}
              </button>

              {/* Botón de Caja al lado del buscador */}
              {cajaActiva ? (
                <button
                  type="button"
                  onClick={() => {
                    verificarCajaApertura();
                    setMostrarModalCierre(true);
                  }}
                  className="w-12 h-12 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-300 border border-rose-500/30 flex items-center justify-center text-base transition-all shadow-[0_0_15px_rgba(244,63,94,0.12)] cursor-pointer shrink-0"
                  title="Cerrar Caja"
                >
                  <span>🔒</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      sessionStorage.removeItem("pos_caja_omitida");
                    }
                    setFondoApertura("");
                    setMostrarModalApertura(true);
                  }}
                  className="w-12 h-12 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-base transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer shrink-0"
                  title="Abrir Caja (Apertura)"
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                </button>
              )}
            </div>

            {/* Filtro: Productos y Servicios */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCambiarFiltroTipo("productos")}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  filtroTipo === "productos"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <span>📦</span>
                <span>Productos</span>
              </button>

              <button
                type="button"
                onClick={() => handleCambiarFiltroTipo("servicios")}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  filtroTipo === "servicios"
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <span>⚙️</span>
                <span>Servicios</span>
              </button>
            </div>

            {/* Barra de Categorías Dinámica según Productos o Servicios + Selector de Vista Cuadrícula / Lista */}
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-xs overflow-hidden min-w-0">
                <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
                  {categoriasVisibles.map((cat) => {
                    const activa = filtroCategoria === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFiltroCategoria(cat.id)}
                        className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer shrink-0 active:scale-95 ${
                          activa
                            ? "bg-blue-600 text-white font-medium shadow-xs"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-normal"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones de Vista: Cuadrícula (así como está) vs Lista */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shrink-0">
                <button
                  type="button"
                  onClick={() => cambiarVistaCatalogo("grid")}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    vistaCatalogo === "grid"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                  title="Vista de cuadrícula (Tarjetas)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => cambiarVistaCatalogo("list")}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    vistaCatalogo === "list"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                  title="Vista de lista"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" />
                    <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" />
                    <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" />
                    <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" />
                    <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" />
                    <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Rejilla de Productos */}
          <div className="flex-grow p-6 bg-zinc-50/50 dark:bg-zinc-900/50">
            {cargandoProductos ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm">Cargando inventario...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center select-none">
                <span className="text-4xl opacity-30">📦</span>
              </div>
            ) : vistaCatalogo === "list" ? (
              /* Vista en Lista */
              <div className="flex flex-col gap-2">
                {filteredProducts.map((item) => {
                  const priceNum =
                    typeof item.price === "number" ? item.price : parseFloat(item.price) || 0;
                  const isAgotado = item.stock <= 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-all select-none cursor-pointer hover:shadow-xs active:scale-[0.99] ${
                        isAgotado ? "opacity-60" : ""
                      }`}
                    >
                      {/* Miniatura / Emoji */}
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/40 flex items-center justify-center shrink-0 text-xl sm:text-2xl overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          getProductEmoji(item.name, item.category)
                        )}
                      </div>

                      {/* Info: Nombre, SKU/Código y Categoría */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center gap-2">
                          <h4 className="text-zinc-900 dark:text-zinc-100 font-semibold text-xs sm:text-sm truncate" title={item.name}>
                            {item.name}
                          </h4>
                          {item.isService && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                              Servicio
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                          <span>{item.code}</span>
                          {item.brand && <span>• {item.brand}</span>}
                          {item.category && <span className="text-zinc-400 dark:text-zinc-500">• {item.category}</span>}
                        </div>
                      </div>

                      {/* Stock Badge */}
                      <div className="shrink-0 flex items-center">
                        <span
                          className={`text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-full text-center shadow-xs text-white ${
                            isAgotado ? "bg-[#ff3b30]" : "bg-[#00cba0]"
                          }`}
                        >
                          {item.stock} disp.
                        </span>
                      </div>

                      {/* Precio */}
                      <div className="shrink-0 text-right min-w-[70px]">
                        <span className="text-zinc-900 dark:text-white font-extrabold text-xs sm:text-sm tracking-tight">
                          ${Math.round(priceNum).toLocaleString("es-CL")}
                        </span>
                      </div>

                      {/* Acciones: Botón Detalles e Ícono Agregar */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetalleProductoModal(item);
                          }}
                          className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                          title="Detalles"
                        >
                          i
                        </button>
                        <button
                          type="button"
                          className="h-7 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 group-hover:bg-blue-600 group-hover:text-white text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                          title="Añadir al carrito"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Vista en Cuadrícula (así como está) */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
                {filteredProducts.map((item) => {
                  const priceNum =
                    typeof item.price === "number" ? item.price : parseFloat(item.price) || 0;
                  const isAgotado = item.stock <= 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg sm:rounded-xl p-2.5 sm:p-3 flex flex-col justify-between transition-all select-none group ${
                        isAgotado
                          ? "opacity-60 cursor-pointer"
                          : "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs active:scale-[0.98] cursor-pointer"
                      }`}
                    >
                      {/* Badge de Stock en la esquina superior derecha */}
                      <span
                        className={`absolute top-2 right-2 z-10 text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full min-w-[20px] text-center shadow-xs text-white ${
                          isAgotado ? "bg-[#ff3b30]" : "bg-[#00cba0]"
                        }`}
                      >
                        {item.stock}
                      </span>

                      {/* Imagen / Visual del Producto */}
                      <div className="w-full h-24 sm:h-28 flex items-center justify-center p-1 relative my-1">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain drop-shadow-xs"
                          />
                        ) : (
                          <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-center text-3xl sm:text-4xl shadow-2xs group-hover:scale-105 transition-transform">
                            {getProductEmoji(item.name, item.category)}
                          </div>
                        )}
                      </div>

                      {/* Nombre del Producto */}
                      <h4
                        className="text-zinc-600 dark:text-zinc-300 font-semibold text-xs leading-snug line-clamp-2 text-left w-full mt-1 mb-1.5"
                        title={item.name}
                      >
                        {item.name}
                      </h4>

                      {/* Fila Inferior: Precio a la izquierda e Ícono de Información a la derecha */}
                      <div className="flex items-center justify-between w-full mt-auto pt-1">
                        <span className="text-zinc-900 dark:text-white font-extrabold text-xs sm:text-sm tracking-tight">
                          ${Math.round(priceNum).toLocaleString("es-CL")}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetalleProductoModal(item);
                          }}
                          className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-500 dark:text-zinc-300 text-[10px] sm:text-[11px] font-bold flex items-center justify-center shrink-0 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                          title="Detalles"
                        >
                          i
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Carrito / Ticket - Fijo con la Página y Sin Scroll en Vacío */}
        <div className={`${vistaMovil === "catalogo" ? "hidden md:flex" : "flex"} w-full md:w-[420px] lg:w-[450px] flex-shrink-0 flex-col bg-white dark:bg-zinc-950 p-3 sm:p-3.5 gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-2xl md:self-start transition-all`}>
          {/* Botón Volver al Catálogo en Móvil */}
          <div className="md:hidden p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVistaMovil("catalogo")}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 py-1 px-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>&larr;</span>
              <span>Seguir agregando productos</span>
            </button>
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              {cart.reduce((a, b) => a + b.qty, 0)} {cart.reduce((a, b) => a + b.qty, 0) === 1 ? "producto" : "productos"}
            </span>
          </div>

          {/* Cabecera del Cliente y Vehículo Asociado para Historial */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/70 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMostrarModalClientes(true)}
                className="flex items-center gap-3 text-left group cursor-pointer select-none min-w-0"
                title="Cambiar o seleccionar cliente"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                    Cliente
                  </span>
                  <span className="text-sm font-normal text-zinc-900 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5 truncate max-w-[210px]">
                    {clienteSeleccionado ? clienteSeleccionado.name : "Consumidor Final"}
                    <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </button>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    limpiarCarrito();
                    if (solicitudActiva) {
                      sessionStorage.removeItem("pos_despacho_solicitud");
                      setSolicitudActiva(null);
                    }
                  }}
                  className="text-xs font-normal text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800/60 dark:hover:bg-rose-500/10 border border-zinc-200 hover:border-rose-200 dark:border-zinc-700/40 dark:hover:border-rose-500/20 transition-all cursor-pointer shrink-0"
                  title="Vaciar orden"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Fila del Vehículo Asociado para Historial de Vehículos */}
            {clienteSeleccionado && (
              <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalVehiculos(true)}
                  className="flex items-center gap-2 text-left group cursor-pointer select-none min-w-0 flex-1"
                  title="Asociar o cambiar vehículo para historial"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 text-xs group-hover:scale-105 transition-transform">
                    🚗
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                        Vehículo
                      </span>
                      {clienteSeleccionado.vehicles && clienteSeleccionado.vehicles.length > 1 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                          {clienteSeleccionado.vehicles.length} autos
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-normal text-zinc-900 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5 truncate">
                      {vehiculoSeleccionado ? (
                        <>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 uppercase text-[11px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">
                            {vehiculoSeleccionado.plate}
                          </span>
                          <span className="truncate text-blue-600 dark:text-blue-400 font-semibold">
                            {vehiculoSeleccionado.brand} {vehiculoSeleccionado.model}
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 italic">
                          Sin vehículo
                        </span>
                      )}
                      <svg className="w-3 h-3 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreandoVehiculoInline(true);
                    setMostrarModalVehiculos(true);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 font-medium transition-all shrink-0 cursor-pointer"
                  title="Registrar nuevo vehículo para este cliente"
                >
                  ＋ Auto
                </button>
              </div>
            )}
          </div>

          {/* Banner de Pedido en Despacho: Origen Landing, Tienda, Taller */}
          {solicitudActiva && (
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/70 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">📥</span>
                  <span className="font-normal text-zinc-900 dark:text-white text-xs truncate">
                    {solicitudActiva.requestNumber}
                  </span>
                  {renderOrigenBadge(solicitudActiva.type)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem("pos_despacho_solicitud");
                    setSolicitudActiva(null);
                  }}
                  className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
                  title="Desvincular"
                >
                  ✕
                </button>
              </div>
              {solicitudActiva.vehicleInfo && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {solicitudActiva.vehicleInfo}
                </p>
              )}
            </div>
          )}

          {/* Lista de Items en Carrito - Sin Scroll Interno en Vacío */}
          <div className={`flex-grow space-y-2 min-h-0 ${
            cart.length === 0
              ? "overflow-hidden flex flex-col justify-center"
              : "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          }`}>
            {cart.length === 0 ? (
              <div className="w-full py-8 px-4 flex flex-col items-center justify-center text-center select-none rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800/60">
                <div className="w-12 h-12 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/70 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-2.5 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Ticket sin productos</p>
                <button
                  type="button"
                  onClick={() => setVistaMovil("catalogo")}
                  className="mt-3 md:hidden text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-lg transition-all"
                >
                  Ir al catálogo
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const priceNum =
                  typeof item.product.price === "number"
                    ? item.product.price
                    : parseFloat(item.product.price) || 0;

                return (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-2.5 p-2.5 bg-zinc-50 dark:bg-zinc-900/90 hover:bg-zinc-100/90 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700/70 rounded-xl transition-all shadow-sm group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-lg shrink-0">
                      {getProductEmoji(item.product.name, item.product.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-normal text-zinc-900 dark:text-zinc-200 truncate">
                        {item.product.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.product.empleado_nombre && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                            👤 {item.product.empleado_nombre}
                          </span>
                        )}
                        {/* Input editable de Precio Unitario para el cajero en Oficina */}
                        <div
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus-within:border-emerald-500 transition-colors"
                          title="Editar valor unitario del servicio / ítem"
                        >
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.product.price}
                            onChange={(e) => updatePrice(item.product.id, e.target.value)}
                            className="w-16 bg-transparent text-[11px] font-mono font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          />
                          <span className="text-[9px] text-zinc-400">c/u</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Stepper Sutil */}
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/90 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700/40">
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-6 h-6 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700/80 flex items-center justify-center text-xs font-normal active:scale-90 transition-all cursor-pointer"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs font-normal text-zinc-900 dark:text-zinc-200">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-6 h-6 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700/80 flex items-center justify-center text-xs font-normal active:scale-90 transition-all cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal del Item */}
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 w-14 text-right font-mono">
                        ${(priceNum * item.qty).toFixed(2)}
                      </span>

                      {/* Quitar */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-zinc-400 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Resumen y Botón de Cobro - Tarjeta con Filos Suaves y Texto Normal */}
          <div className="p-4 sm:p-4.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/80 shadow-xl flex flex-col gap-3 mt-auto">
            {/* Desglose */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span className="font-normal">Subtotal</span>
                <span className="text-zinc-900 dark:text-zinc-300 font-normal">${subtotal.toFixed(2)}</span>
              </div>

              {/* Fila Descuento */}
              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="font-normal">Descuento</span>
                  <button
                    type="button"
                    onClick={() => setMostrarModalDescuento(true)}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-normal transition-colors cursor-pointer"
                  >
                    {descuentoValor > 0 ? (descuentoTipo === "porcentaje" ? `${descuentoValor}%` : `$${descuentoValor}`) : "+ Agregar"}
                  </button>
                </div>
                <span className={`font-normal ${descuentoCalculado > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-400 dark:text-zinc-500"}`}>
                  -${descuentoCalculado.toFixed(2)}
                </span>
              </div>

              {/* Fila IVA con selector de porcentaje */}
              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="font-normal">IVA</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIvaTempInput(ivaPorcentaje.toString());
                      setMostrarModalIva(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-normal transition-colors flex items-center gap-1 cursor-pointer"
                    title="Cambiar porcentaje de IVA"
                  >
                    <span>{ivaPorcentaje}%</span>
                    <svg className="w-2.5 h-2.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <span className="text-zinc-900 dark:text-zinc-300 font-normal">${tax.toFixed(2)}</span>
              </div>
            </div>

            {/* Separador Sutil */}
            <div className="h-px bg-zinc-200 dark:bg-zinc-800/70 w-full" />

            {/* Fila Total a Pagar - Texto Normal */}
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs font-normal text-zinc-700 dark:text-zinc-300">
                  Total a pagar
                </span>
                <p className="text-[10px] text-zinc-500 font-normal">IVA ({ivaPorcentaje}%) incluido</p>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                ${total.toFixed(2)}
              </span>
            </div>

            {/* Botón Cobrar - Texto Normal */}
            <button
              type="button"
              onClick={() => {
                setMontoRecibido("");
                setMostrarModalPago(true);
              }}
              disabled={cart.length === 0}
              className={`w-full h-12 rounded-xl font-medium text-sm tracking-normal transition-all flex items-center justify-center gap-2 ${
                cart.length > 0
                  ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-sm active:scale-[0.98] cursor-pointer backdrop-blur-sm"
                  : "bg-zinc-500/10 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 border border-zinc-300/40 dark:border-zinc-700/40 cursor-not-allowed"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                <rect x="2" y="5" width="20" height="14" rx="3" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span>Cobrar</span>
            </button>

            {/* Botón Cotizar - Suave y transparente, sin icono, solo una palabra */}
            <button
              type="button"
              onClick={handleCotizar}
              disabled={cotizando}
              className="w-full h-11 rounded-xl font-medium text-sm tracking-normal transition-all flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25 active:scale-[0.98] cursor-pointer backdrop-blur-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{cotizando ? "Cotizando..." : "Cotizar"}</span>
            </button>
          </div>
        </div>
      </main>

      {/* MODAL 1: Seleccionar Cliente - Moderno y Minimalista */}
      {mostrarModalClientes && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/80 rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl relative backdrop-blur-xl max-h-[85vh] flex flex-col">
            {/* Buscador minimalista con icono y botón de cerrar */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  className="w-full h-11 pl-9 pr-8 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
                {busquedaCliente && (
                  <button
                    onClick={() => setBusquedaCliente("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => setMostrarModalClientes(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center text-xs transition-all"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Lista de clientes */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {/* Consumidor Final */}
              <button
                onClick={() => {
                  setClienteSeleccionado(null);
                  setVehiculoSeleccionado(null);
                  setMostrarModalClientes(false);
                }}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all duration-150 group ${
                  clienteSeleccionado === null
                    ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                      clienteSeleccionado === null
                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30"
                        : "bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 border border-zinc-300/60 dark:border-zinc-700/50 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
                    }`}
                  >
                    👤
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-white leading-tight">
                      Consumidor Final
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Venta rápida (Sin vehículo)
                    </p>
                  </div>
                </div>
                {clienteSeleccionado === null && (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                )}
              </button>

              {/* Clientes Registrados */}
              {clientesFiltrados.map((cli) => {
                const isSelected = clienteSeleccionado?.id === cli.id;
                const iniciales = (cli.name || "CL").substring(0, 2).toUpperCase();
                return (
                  <button
                    key={cli.id}
                    onClick={() => {
                      setClienteSeleccionado(cli);
                      if (cli.vehicles && cli.vehicles.length > 0) {
                        setVehiculoSeleccionado(cli.vehicles[0]);
                        if (cli.vehicles.length > 1) {
                          setMostrarModalVehiculos(true);
                        }
                      } else {
                        setVehiculoSeleccionado(null);
                      }
                      setMostrarModalClientes(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all duration-150 group ${
                      isSelected
                        ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold tracking-wider transition-colors ${
                          isSelected
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30"
                            : "bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 border border-zinc-300/60 dark:border-zinc-700/50 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
                        }`}
                      >
                        {iniciales}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-white leading-tight">
                          {cli.name}
                        </p>
                        {cli.vehicles && cli.vehicles.length > 0 && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                              🚗 {cli.vehicles.length} {cli.vehicles.length === 1 ? "auto" : "autos"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer con acciones de una sola palabra */}
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setCreandoClienteInline(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-medium transition-all cursor-pointer"
              >
                <span>＋</span>
                <span>Nuevo</span>
              </button>
              <button
                type="button"
                onClick={() => setMostrarModalClientes(false)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 font-medium transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1.1: Crear Cliente Rápido en Neon */}
      {creandoClienteInline && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/80 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl relative backdrop-blur-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-zinc-200 dark:border-zinc-800/80">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs">👤</span>
                <span>Cliente</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreandoClienteInline(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center text-xs transition-all"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarClienteInline} className="space-y-3">
              {/* Selector Persona / Empresa */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNuevoClienteTipo("Personal")}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      nuevoClienteTipo === "Personal"
                        ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                        : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50"
                    }`}
                  >
                    <span>👤</span> Persona
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevoClienteTipo("Empresa")}
                    className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      nuevoClienteTipo === "Empresa"
                        ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                        : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50"
                    }`}
                  >
                    <span>🏢</span> Empresa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                  {nuevoClienteTipo === "Empresa" ? "Razón Social *" : "Nombre completo *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={nuevoClienteTipo === "Empresa" ? "Transportes Andinos S.A." : "Juan Carlos Pérez"}
                  value={nuevoClienteNombre}
                  onChange={(e) => setNuevoClienteNombre(e.target.value)}
                  className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                    {nuevoClienteTipo === "Empresa" ? "RUC" : "Cédula"}
                  </label>
                  <input
                    type="text"
                    placeholder={nuevoClienteTipo === "Empresa" ? "1790012345001" : "0912345678"}
                    value={nuevoClienteIdent}
                    onChange={(e) => setNuevoClienteIdent(e.target.value)}
                    className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="0991234567"
                    value={nuevoClienteTelefono}
                    onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                    className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 font-mono transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={nuevoClienteEmail}
                    onChange={(e) => setNuevoClienteEmail(e.target.value)}
                    className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    placeholder="Av. Principal y Secundaria"
                    value={nuevoClienteDireccion}
                    onChange={(e) => setNuevoClienteDireccion(e.target.value)}
                    className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreandoClienteInline(false)}
                  className="flex-1 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 text-xs font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoClienteInline}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 border border-transparent dark:border-emerald-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {guardandoClienteInline ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1.2: Seleccionar o Agregar Vehículo del Cliente para Historial */}
      {mostrarModalVehiculos && clienteSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/80 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 shadow-2xl relative backdrop-blur-xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center text-xs">
                  🚗
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                    {creandoVehiculoInline ? "Nuevo Vehículo" : "Vehículo"}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    <strong className="text-zinc-700 dark:text-zinc-300">{clienteSeleccionado.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalVehiculos(false);
                  setCreandoVehiculoInline(false);
                }}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center text-xs cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {creandoVehiculoInline ? (
              <form onSubmit={handleGuardarVehiculoInline} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                      Placa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. ABC-1234"
                      value={nuevoVehiculoPlaca}
                      onChange={(e) => setNuevoVehiculoPlaca(e.target.value.toUpperCase())}
                      className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono font-bold uppercase text-sm text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Toyota"
                      value={nuevoVehiculoMarca}
                      onChange={(e) => setNuevoVehiculoMarca(e.target.value)}
                      className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Hilux"
                      value={nuevoVehiculoModelo}
                      onChange={(e) => setNuevoVehiculoModelo(e.target.value)}
                      className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                      Año
                    </label>
                    <input
                      type="number"
                      placeholder="2024"
                      value={nuevoVehiculoAnio}
                      onChange={(e) => setNuevoVehiculoAnio(e.target.value)}
                      className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                      Combustible
                    </label>
                    <select
                      value={nuevoVehiculoCombustible}
                      onChange={(e) => setNuevoVehiculoCombustible(e.target.value)}
                      className="w-full h-11 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Gasolina">Gasolina</option>
                      <option value="Diésel">Diésel</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Eléctrico">Eléctrico</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                      Kilometraje
                    </label>
                    <input
                      type="number"
                      placeholder="Ej. 45000"
                      value={nuevoVehiculoKilometraje}
                      onChange={(e) => setNuevoVehiculoKilometraje(e.target.value)}
                      className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      placeholder="Blanco"
                      value={nuevoVehiculoColor}
                      onChange={(e) => setNuevoVehiculoColor(e.target.value)}
                      className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreandoVehiculoInline(false)}
                    className="flex-1 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoVehiculoInline}
                    className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {guardandoVehiculoInline ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-2.5">
                {/* Lista de vehículos del cliente */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {/* Vehículos registrados del cliente */}
                  {(clienteSeleccionado.vehicles || []).map((veh) => {
                    const isSelected = vehiculoSeleccionado?.id === veh.id || vehiculoSeleccionado?.plate === veh.plate;
                    return (
                      <button
                        key={veh.id || veh.plate}
                        type="button"
                        onClick={() => {
                          setVehiculoSeleccionado(veh);
                          setMostrarModalVehiculos(false);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-500/50 bg-blue-50/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30"
                            : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center text-sm shrink-0">
                            🚗
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 tracking-wider shrink-0">
                                {veh.plate}
                              </span>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                                {veh.brand} {veh.model}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              {veh.year ? `Año ${veh.year} • ` : ""}{veh.tallerVisits && veh.tallerVisits > 0 ? `${veh.tallerVisits} ${veh.tallerVisits === 1 ? "visita" : "visitas"}` : "0 visitas"}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30 shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => setCreandoVehiculoInline(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-medium transition-all cursor-pointer"
                  >
                    <span>＋</span>
                    <span>Nuevo Auto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarModalVehiculos(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Aplicar Descuento - Color suave y transparente */}
      {mostrarModalDescuento && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/80 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl relative backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-zinc-200 dark:border-zinc-800/80">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs">🏷️</span>
                <span>Descuento</span>
              </h3>
              <button
                onClick={() => setMostrarModalDescuento(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center text-xs transition-all"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Selector de Tipo: Monto Fijo o Porcentaje */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setDescuentoTipo("monto")}
                className={`flex-1 h-11 py-2 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer ${
                  descuentoTipo === "monto"
                    ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/35 shadow-sm"
                    : "bg-zinc-100/70 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                $ Monto Fijo
              </button>
              <button
                type="button"
                onClick={() => setDescuentoTipo("porcentaje")}
                className={`flex-1 h-11 py-2 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer ${
                  descuentoTipo === "porcentaje"
                    ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/35 shadow-sm"
                    : "bg-zinc-100/70 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                % Porcentaje
              </button>
            </div>

            {/* Input de Valor */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1.5">
                {descuentoTipo === "monto" ? "Monto a descontar ($)" : "Porcentaje a descontar (%)"}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={descuentoTipo === "monto" ? "0.00" : "0%"}
                value={descuentoValor || ""}
                onChange={(e) => setDescuentoValor(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                autoFocus
              />
            </div>

            {/* Accesos rápidos de porcentaje */}
            {descuentoTipo === "porcentaje" && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDescuentoValor(pct)}
                    className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 border border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-300 dark:hover:border-emerald-500/30 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all cursor-pointer"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}

            {/* Botones de acción suaves y translúcidos */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDescuentoValor(0);
                  setMostrarModalDescuento(false);
                }}
                className="flex-1 h-11 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/25 text-xs font-medium transition-all cursor-pointer"
              >
                Quitar
              </button>
              <button
                type="button"
                onClick={() => setMostrarModalDescuento(false)}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 border border-transparent dark:border-emerald-500/30 text-xs font-medium transition-all cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Configurar IVA - Moderno y Minimalista */}
      {mostrarModalIva && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl relative backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">
                  %
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Configurar IVA</h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalIva(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-xs transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Input de Porcentaje */}
            <div className="mb-5">
              <label className="block text-xs font-normal text-zinc-700 dark:text-zinc-400 mb-1.5">
                Porcentaje de IVA (%)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="16"
                  value={ivaTempInput}
                  onChange={(e) => {
                    setIvaTempInput(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) {
                      setIvaPorcentaje(val);
                    }
                  }}
                  className="w-full h-11 pl-4 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-sm font-normal text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
                <span className="absolute right-3.5 text-zinc-500 dark:text-zinc-400 font-normal text-sm">%</span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMostrarModalIva(false)}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-medium transition-all cursor-pointer shadow-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Ventas en Espera (Pausa) */}
      {mostrarModalEspera && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>⏸️</span> Ventas en Espera ({ventasEnEspera.length})
              </h3>
              <button
                onClick={() => setMostrarModalEspera(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {ventasEnEspera.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-sm">
                <p>Sin ventas en espera</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {ventasEnEspera.map((v) => {
                  const totalV = v.cart.reduce((acc, i) => acc + (typeof i.product.price === "number" ? i.product.price : parseFloat(i.product.price) || 0) * i.qty, 0);
                  return (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900 dark:text-white">{v.nombre}</span>
                          <span className="text-[10px] text-zinc-400">🕒 {v.timestamp}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {v.cart.length} ítem(s) • Total est: ${(totalV * 1.16).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => recuperarVentaEnEspera(v)}
                          className="h-10 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                        >
                          Recuperar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarVentaEnEspera(v.id)}
                          className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs flex items-center justify-center cursor-pointer transition-all"
                          title="Eliminar de espera"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-right">
              <button
                type="button"
                onClick={() => setMostrarModalEspera(false)}
                className="w-full sm:w-auto h-11 px-5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 border border-zinc-300/40 dark:border-zinc-700/40 text-xs font-medium transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Ítem Rápido / Manual */}
      {mostrarModalItemManual && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>⚡</span> Agregar Ítem o Servicio Rápido
              </h3>
              <button
                onClick={() => setMostrarModalItemManual(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAgregarItemManual} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Descripción o Nombre del Ítem
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mano de obra urgente, Repuesto especial, Instalación..."
                  value={manualNombre}
                  onChange={(e) => setManualNombre(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm font-medium outline-none focus:border-blue-500 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Precio Unitario ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={manualPrecio}
                    onChange={(e) => setManualPrecio(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm font-bold outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualCantidad}
                    onChange={(e) => setManualCantidad(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm font-bold outline-none focus:border-blue-500 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Categoría
                </label>
                <select
                  value={manualCategoria}
                  onChange={(e) => setManualCategoria(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none focus:border-blue-500"
                >
                  <option value="Servicio">Servicio / Taller</option>
                  <option value="Repuesto">Repuesto Especial</option>
                  <option value="Mano de Obra">Mano de Obra</option>
                  <option value="Varios">Varios</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalItemManual(false)}
                  className="flex-1 h-11 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-300/40 dark:border-zinc-700/40 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                >
                  Agregar a la Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Cobro con Calculadora de Cambio */}
      {mostrarModalPago && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Procesar Cobro</h3>
              <button
                onClick={() => setMostrarModalPago(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="text-center my-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Monto Total a Cobrar</p>
              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                ${total.toFixed(2)}
              </p>
              {descuentoCalculado > 0 && (
                <p className="text-xs text-rose-500 font-semibold mt-1">
                  Descuento aplicado: -${descuentoCalculado.toFixed(2)}
                </p>
              )}
              <p className="text-xs text-zinc-500 mt-1">
                Cliente: <strong className="text-zinc-700 dark:text-zinc-300">{clienteSeleccionado ? clienteSeleccionado.name : "Consumidor Final"}</strong>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-normal text-zinc-600 dark:text-zinc-400 mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {(["Efectivo", "Tarjeta", "Transferencia", "Crédito", "Mixto"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPago(m)}
                    className={`h-11 py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                      metodoPago === m
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span>
                      {m === "Efectivo" && "💵"}
                      {m === "Tarjeta" && "💳"}
                      {m === "Transferencia" && "🏦"}
                      {m === "Crédito" && "📋"}
                      {m === "Mixto" && "🔀"}
                    </span>
                    <span className="truncate">{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel de Cobro Mixto / Combinado */}
            {metodoPago === "Mixto" && (
              <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-3.5">
                {/* Cabecera del Panel Mixto */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🔀</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Distribución del Cobro
                    </span>
                  </div>
                  {saldoRestanteMixto === 0 ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50">
                      ✓ Completo
                    </span>
                  ) : saldoRestanteMixto > 0 ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50">
                      Falta: ${saldoRestanteMixto.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50">
                      Exceso: +${Math.abs(saldoRestanteMixto).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Accesos rápidos de división (50/50 o limpiar) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const mitad1 = +(total / 2).toFixed(2);
                      const mitad2 = +(total - mitad1).toFixed(2);
                      setMontoMixtoEfectivo(mitad1.toString());
                      setMontoMixtoTarjeta(mitad2.toString());
                      setMontoMixtoTransferencia("");
                      setMontoMixtoCredito("");
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all font-medium"
                  >
                    ⚡ 50% Efectivo / 50% Tarjeta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mitad1 = +(total / 2).toFixed(2);
                      const mitad2 = +(total - mitad1).toFixed(2);
                      setMontoMixtoEfectivo(mitad1.toString());
                      setMontoMixtoTransferencia(mitad2.toString());
                      setMontoMixtoTarjeta("");
                      setMontoMixtoCredito("");
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all font-medium"
                  >
                    ⚡ 50% Efectivo / 50% Transf.
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMontoMixtoEfectivo("");
                      setMontoMixtoTarjeta("");
                      setMontoMixtoTransferencia("");
                      setMontoMixtoCredito("");
                      setEfectivoEntregadoMixto("");
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-500 transition-all ml-auto font-medium"
                  >
                    Limpiar
                  </button>
                </div>

                {/* Fila 1: Efectivo */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <span>💵</span> Efectivo
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={montoMixtoEfectivo}
                          onChange={(e) => setMontoMixtoEfectivo(e.target.value)}
                          className="w-24 sm:w-28 h-8 pl-6 pr-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right text-xs font-black text-zinc-900 dark:text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const saldoActual = +(total - mixtoTarjetaNum - mixtoTransferenciaNum - mixtoCreditoNum).toFixed(2);
                          setMontoMixtoEfectivo(Math.max(0, saldoActual).toFixed(2));
                        }}
                        className="h-8 px-2 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100"
                        title="Asignar el saldo restante a Efectivo"
                      >
                        + Saldo
                      </button>
                    </div>
                  </div>

                  {/* Si asignó monto en efectivo, permitir ingresar billete con el que paga para dar vuelto */}
                  {mixtoEfectivoNum > 0 && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">Paga con billete de:</span>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">$</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder={mixtoEfectivoNum.toFixed(2)}
                            value={efectivoEntregadoMixto}
                            onChange={(e) => setEfectivoEntregadoMixto(e.target.value)}
                            className="w-20 h-7 pl-4 pr-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-right text-[11px] font-bold text-zinc-900 dark:text-white outline-none focus:border-emerald-500"
                          />
                        </div>
                        {cambioMixtoEfectivo > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
                            Vuelto: ${cambioMixtoEfectivo.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fila 2: Tarjeta */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <span>💳</span> Tarjeta
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">$</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={montoMixtoTarjeta}
                        onChange={(e) => setMontoMixtoTarjeta(e.target.value)}
                        className="w-24 sm:w-28 h-8 pl-6 pr-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right text-xs font-black text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const saldoActual = +(total - mixtoEfectivoNum - mixtoTransferenciaNum - mixtoCreditoNum).toFixed(2);
                        setMontoMixtoTarjeta(Math.max(0, saldoActual).toFixed(2));
                      }}
                      className="h-8 px-2 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100"
                      title="Asignar el saldo restante a Tarjeta"
                    >
                      + Saldo
                    </button>
                  </div>
                </div>

                {/* Fila 3: Transferencia */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <span>🏦</span> Transferencia
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">$</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={montoMixtoTransferencia}
                        onChange={(e) => setMontoMixtoTransferencia(e.target.value)}
                        className="w-24 sm:w-28 h-8 pl-6 pr-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right text-xs font-black text-zinc-900 dark:text-white outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const saldoActual = +(total - mixtoEfectivoNum - mixtoTarjetaNum - mixtoCreditoNum).toFixed(2);
                        setMontoMixtoTransferencia(Math.max(0, saldoActual).toFixed(2));
                      }}
                      className="h-8 px-2 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-100"
                      title="Asignar el saldo restante a Transferencia"
                    >
                      + Saldo
                    </button>
                  </div>
                </div>

                {/* Fila 4: Crédito */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <span>📋</span> Crédito
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={montoMixtoCredito}
                          onChange={(e) => setMontoMixtoCredito(e.target.value)}
                          className="w-24 sm:w-28 h-8 pl-6 pr-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-right text-xs font-black text-zinc-900 dark:text-white outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const saldoActual = +(total - mixtoEfectivoNum - mixtoTarjetaNum - mixtoTransferenciaNum).toFixed(2);
                          setMontoMixtoCredito(Math.max(0, saldoActual).toFixed(2));
                        }}
                        className="h-8 px-2 rounded-lg text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50 hover:bg-cyan-100"
                        title="Asignar el saldo restante a Crédito"
                      >
                        + Saldo
                      </button>
                    </div>
                  </div>

                  {/* Condiciones del Crédito si hay monto asignado */}
                  {mixtoCreditoNum > 0 && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 font-medium">Plazo de crédito:</span>
                        <div className="flex items-center gap-1">
                          {[15, 30, 45, 60].map((dias) => (
                            <button
                              key={dias}
                              type="button"
                              onClick={() => cambiarDiasCredito(dias)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                diasCredito === dias
                                  ? "bg-cyan-600 text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                              }`}
                            >
                              {dias}d
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-zinc-500">
                        <span>Vencimiento:</span>
                        <span className="font-bold text-cyan-600 dark:text-cyan-400 capitalize">
                          {formatFechaVencimientoLarga(fechaVencimientoCredito)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumen del Balance */}
                <div className="pt-1 flex items-center justify-between text-xs font-semibold px-1">
                  <span className="text-zinc-500 dark:text-zinc-400">Total Asignado:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${
                      Math.abs(saldoRestanteMixto) < 0.01
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      ${totalMixtoAsignado.toFixed(2)} / ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Panel de Venta a Crédito Puro */}
            {metodoPago === "Crédito" && (
              <div className="mb-5 p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/25 border border-cyan-200 dark:border-cyan-800/40 space-y-3.5 text-left">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">📋</span>
                    <label className="text-xs font-bold text-cyan-950 dark:text-cyan-200">
                      Venta a Crédito
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50">
                    Módulo Créditos POS
                  </span>
                </div>

                {/* Días de Crédito Manual */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Días de Crédito:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={diasCredito || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          cambiarDiasCredito(isNaN(val) ? 0 : val);
                        }}
                        className="w-20 h-9 px-2.5 rounded-xl border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-900 text-sm font-black text-center text-zinc-900 dark:text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                        placeholder="30"
                      />
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">días</span>
                    </div>
                  </div>

                  {/* Botones de sugerencia rápida */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[15, 30, 45, 60].map((dias) => (
                      <button
                        key={dias}
                        type="button"
                        onClick={() => cambiarDiasCredito(dias)}
                        className={`h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          diasCredito === dias
                            ? "bg-cyan-600 text-white shadow-sm"
                            : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                        }`}
                      >
                        {dias} días
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fecha de Vencimiento Formato: Martes 25 Dic, 26 */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-cyan-200/80 dark:border-cyan-800/50 flex items-center justify-between shadow-xs">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Fecha de Vencimiento:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-cyan-700 dark:text-cyan-300 tracking-tight capitalize">
                      {formatFechaVencimientoLarga(fechaVencimientoCredito)}
                    </span>
                    <input
                      type="date"
                      value={fechaVencimientoCredito}
                      onChange={(e) => {
                        setFechaVencimientoCredito(e.target.value);
                        const hoy = new Date();
                        const venc = new Date(e.target.value);
                        const diff = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 3600 * 24));
                        if (diff > 0) setDiasCredito(diff);
                      }}
                      className="w-6 h-6 opacity-40 hover:opacity-100 cursor-pointer text-xs"
                      title="Seleccionar en calendario"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Calculadora de Cambio para Efectivo Puro */}
            {metodoPago === "Efectivo" && (
              <div className="mb-5 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Monto Recibido ($)
                  </label>
                  <button
                    type="button"
                    onClick={() => setMontoRecibido(total.toFixed(2))}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Monto Exacto
                  </button>
                </div>

                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 text-base sm:text-lg font-black text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                />

                {/* Botones de denominaciones rápidas */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 50, 100].map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setMontoRecibido(billete.toString())}
                      className="h-10 rounded-xl bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800/50 text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer active:scale-95"
                    >
                      ${billete}
                    </button>
                  ))}
                </div>

                {montoRecibidoNum > 0 && (
                  <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40 flex justify-between items-center text-sm">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">
                      {montoRecibidoNum >= total ? "Cambio a Entregar:" : "Faltante:"}
                    </span>
                    <span
                      className={`text-xl font-black ${
                        montoRecibidoNum >= total
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600"
                      }`}
                    >
                      ${(montoRecibidoNum >= total ? cambio : faltante).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMostrarModalPago(false)}
                className="flex-1 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 text-xs font-medium transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarCobro}
                disabled={
                  procesandoVenta ||
                  (metodoPago === "Mixto" && (totalMixtoAsignado <= 0 || Math.abs(saldoRestanteMixto) > 0.01))
                }
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 active:scale-[0.99] border border-transparent dark:border-emerald-500/35 hover:dark:border-emerald-500/50 dark:text-emerald-300 text-xs font-medium shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {procesandoVenta
                  ? "Procesando..."
                  : metodoPago === "Mixto" && saldoRestanteMixto > 0.01
                  ? `Falta $${saldoRestanteMixto.toFixed(2)}`
                  : metodoPago === "Mixto" && saldoRestanteMixto < -0.01
                  ? "Exceso en montos"
                  : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Venta Exitosa con Impresión de Ticket Térmico / Tamaño Carta */}
      {ventaCompletada && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative text-center print:border-none print:shadow-none print:p-0 print:max-w-none max-h-[92vh] overflow-y-auto">
            {/* VISTA EN PANTALLA: MODAL VENTA COMPLETADA (NO IMPRIMIBLE) */}
            <div className="print:hidden flex flex-col items-center gap-3.5 text-center">
              {/* Badge Icono Verde */}
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-2xl shadow-sm">
                💵
              </div>

              {/* N° VENTA 001 (reemplaza 'Venta Completada') */}
              <div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  N° {formatSaleNumber(ventaCompletada.saleNumber)}
                </h3>
              </div>

              {/* Monto Total y Efectivo / Consumidor Final (SIN NEGRITA) */}
              <div className="my-1">
                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {formatMoneda(ventaCompletada.total)}
                </p>
                {ventaCompletada.cambio && ventaCompletada.cambio > 0 ? (
                  <p className="text-base font-normal text-zinc-700 dark:text-zinc-300 mt-2">
                    Vuelto: {formatMoneda(ventaCompletada.cambio)}
                  </p>
                ) : null}
                <p className="text-base font-normal text-zinc-700 dark:text-zinc-300 mt-1.5 tracking-tight">
                  {ventaCompletada.paymentMethod || "Efectivo"} • {ventaCompletada.customerName || "Consumidor Final"}
                </p>
                {ventaCompletada.paymentMethod === "Mixto" && ventaCompletada.paymentBreakdown ? (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 text-xs">
                    {ventaCompletada.paymentBreakdown.cash > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                        💵 ${ventaCompletada.paymentBreakdown.cash.toFixed(2)}
                      </span>
                    )}
                    {ventaCompletada.paymentBreakdown.card > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 font-semibold">
                        💳 ${ventaCompletada.paymentBreakdown.card.toFixed(2)}
                      </span>
                    )}
                    {ventaCompletada.paymentBreakdown.transfer > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 font-semibold">
                        🏦 ${ventaCompletada.paymentBreakdown.transfer.toFixed(2)}
                      </span>
                    )}
                    {ventaCompletada.paymentBreakdown.credit > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-cyan-700 dark:text-cyan-300 font-semibold">
                        📋 Crédito: ${ventaCompletada.paymentBreakdown.credit.toFixed(2)}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Opciones de Impresión: Ticket y Carta NADA MÁS */}
              <div className="w-full space-y-2 pt-1">
                {/* Opción 1: Ticket */}
                <button
                  type="button"
                  onClick={() => dispararImpresionVenta("TICKET")}
                  className="w-full h-12 px-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center gap-2.5 text-blue-600 dark:text-blue-400 font-extrabold text-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="text-lg">🧾</span>
                  <span>Ticket</span>
                </button>

                {/* Opción 2: Carta */}
                <button
                  type="button"
                  onClick={() => dispararImpresionVenta("A4")}
                  className="w-full h-12 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-2.5 text-amber-600 dark:text-amber-400 font-extrabold text-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="text-lg">📄</span>
                  <span>Carta</span>
                </button>
              </div>

              {/* Botón Aceptar */}
              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={() => setVentaCompletada(null)}
                  className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center"
                >
                  Aceptar
                </button>
              </div>
            </div>

            {/* FORMATO TICKET TÉRMICO (SÓLO IMPRESIÓN - BASADO EN DISEÑO EXACTO) */}
            <div
              ref={ticketRef}
              className={`hidden ${
                formatoImpresionVenta === "TICKET" ? "print:block" : "print:hidden"
              } p-4 text-left text-xs font-sans text-black bg-white max-w-[80mm] mx-auto space-y-2`}
            >
              {/* Encabezado Taller */}
              <div className="text-center pb-2 border-b border-dashed border-black">
                <h3 className="font-black text-sm uppercase tracking-wide text-black">
                  TALLER DE EJEMPLO
                </h3>
                <p className="text-[11px] text-black">RUT: 76.000.000-0</p>
                <p className="text-[11px] text-black">Av. Ejemplo 1234, Santiago</p>
                <p className="text-[11px] text-black">Tel: +56 2 2000 0000</p>
                <p className="text-[11px] text-black">contacto@taller-ejemplo.cl</p>
              </div>

              {/* Comprobante y N° */}
              <div className="text-center py-2 border-b border-dashed border-black">
                <h4 className="font-black text-xs uppercase tracking-wide text-black">
                  COMPROBANTE DE VENTA
                </h4>
                <p className="text-base font-black text-black my-0.5">
                  N° {formatSaleNumber(ventaCompletada.saleNumber)}
                </p>
                <p className="text-xs text-black">
                  {new Date().toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}  {new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </p>
                <p className="text-[11px] text-black font-semibold mt-0.5">
                  Atendido por: {ventaCompletada.vendedorNombre || "Diego Muñoz"}
                </p>
              </div>

              {/* Cliente y Vehículo */}
              <div className="py-2 border-b border-dashed border-black text-left text-[11px] leading-tight space-y-0.5">
                <p className="font-black uppercase text-black text-xs">CLIENTE</p>
                <p className="text-black font-medium">{ventaCompletada.customerName || "Consumidor Final"}</p>
                {ventaCompletada.customerIdentification && (
                  <p className="text-black">RUT: {ventaCompletada.customerIdentification}</p>
                )}
                {ventaCompletada.customerPhone && (
                  <p className="text-black">Tel: {ventaCompletada.customerPhone}</p>
                )}
                {ventaCompletada.vehiculoSnap && (
                  <p className="text-black font-semibold">
                    Vehículo: {((ventaCompletada.vehiculoSnap.brand || "") + " " + (ventaCompletada.vehiculoSnap.model || "")).trim().toUpperCase()}
                    {ventaCompletada.vehiculoSnap.plate ? ` - ${ventaCompletada.vehiculoSnap.plate.toUpperCase()}` : ""}
                  </p>
                )}
              </div>

              {/* Detalle */}
              <div className="py-2 border-b border-dashed border-black text-left text-xs">
                <p className="font-black uppercase text-black text-xs pb-1">DETALLE</p>
                <div className="flex justify-between items-center font-bold text-[11px] text-black pb-1 border-b border-black">
                  <span>Descripción</span>
                  <span>Total</span>
                </div>

                <div className="space-y-2 py-1.5">
                  {ventaCompletada.cartSnap && ventaCompletada.cartSnap.map((it: any, idx: number) => {
                    const pNum = typeof it.product.price === "number" ? it.product.price : parseFloat(it.product.price) || 0;
                    const itemTot = pNum * it.qty;
                    return (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between items-start font-medium text-black">
                          <span className="leading-snug pr-2">{it.product.name}</span>
                          <span className="font-bold shrink-0">{formatMoneda(itemTot)}</span>
                        </div>
                        <div className="text-[10px] text-zinc-600 font-mono">
                          {it.product.code || `PRD-${String(idx + 1).padStart(4, "0")}`}
                        </div>
                        <div className="text-[10px] text-zinc-800">
                          {it.qty} x {formatMoneda(pNum)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totales y Desglose */}
              <div className="py-2 border-b border-dashed border-black text-xs space-y-1">
                <div className="flex justify-between text-black">
                  <span>Ítems</span>
                  <span>
                    {ventaCompletada.cartSnap?.length || 0} ({ventaCompletada.cartSnap?.reduce((acc: number, it: any) => acc + (it.qty || 1), 0) || 0} u.)
                  </span>
                </div>
                <div className="flex justify-between text-black">
                  <span>Subtotal</span>
                  <span>{formatMoneda(parseFloat(ventaCompletada.total) - (ventaCompletada.tax || 0) + (ventaCompletada.descuentoCalculado || 0))}</span>
                </div>
                <div className="flex justify-between text-black">
                  <span>IVA ({ivaPorcentaje}%)</span>
                  <span>{formatMoneda(ventaCompletada.tax || 0)}</span>
                </div>
              </div>

              {/* TOTAL con borde doble / grueso */}
              <div className="border-y-2 border-black py-1.5 my-1 flex justify-between items-center text-black">
                <span className="font-black text-sm uppercase">TOTAL</span>
                <span className="font-black text-base">{formatMoneda(parseFloat(ventaCompletada.total))}</span>
              </div>

              {/* Desglose Pago */}
              <div className="py-1.5 border-b border-dashed border-black text-xs space-y-1 text-black">
                <div className="flex justify-between">
                  <span>Pago:</span>
                  <span className="font-semibold">{ventaCompletada.paymentMethod || "Efectivo"}</span>
                </div>
                {ventaCompletada.paymentMethod === "Mixto" && ventaCompletada.paymentBreakdown ? (
                  <div className="space-y-0.5 pt-0.5 border-t border-dotted border-black">
                    {ventaCompletada.paymentBreakdown.cash > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span>• Efectivo:</span>
                        <span>{formatMoneda(ventaCompletada.paymentBreakdown.cash)}</span>
                      </div>
                    )}
                    {ventaCompletada.paymentBreakdown.card > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span>• Tarjeta:</span>
                        <span>{formatMoneda(ventaCompletada.paymentBreakdown.card)}</span>
                      </div>
                    )}
                    {ventaCompletada.paymentBreakdown.transfer > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span>• Transferencia:</span>
                        <span>{formatMoneda(ventaCompletada.paymentBreakdown.transfer)}</span>
                      </div>
                    )}
                    {ventaCompletada.paymentBreakdown.credit > 0 && (
                      <div className="flex justify-between text-[11px] font-bold">
                        <span>• A Crédito:</span>
                        <span>{formatMoneda(ventaCompletada.paymentBreakdown.credit)}</span>
                      </div>
                    )}
                    {ventaCompletada.cambio && ventaCompletada.cambio > 0 ? (
                      <div className="flex justify-between text-[11px] font-black pt-0.5">
                        <span>Vuelto Efectivo:</span>
                        <span>{formatMoneda(ventaCompletada.cambio)}</span>
                      </div>
                    ) : null}
                  </div>
                ) : ventaCompletada.paymentMethod === "Crédito" ? (
                  <>
                    <div className="flex justify-between font-bold text-black">
                      <span>Saldo a Crédito:</span>
                      <span>{formatMoneda(parseFloat(ventaCompletada.total))}</span>
                    </div>
                    {ventaCompletada.notes && (
                      <p className="text-[10px] text-zinc-700">{ventaCompletada.notes}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>Pagado</span>
                      <span>{formatMoneda(ventaCompletada.montoRecibido || parseFloat(ventaCompletada.total))}</span>
                    </div>
                    <div className="flex justify-between font-black">
                      <span>Vuelto</span>
                      <span>{formatMoneda(ventaCompletada.cambio || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Pie de Página Ticket */}
              <div className="text-center pt-2.5 text-xs font-semibold text-black">
                <p>¡Gracias por su compra!</p>
              </div>
            </div>

            {/* FORMATO FACTURA / ORDEN TAMAÑO CARTA (SÓLO IMPRESIÓN - BASADO EN DISEÑO EXACTO) */}
            <div
              className={`hidden ${
                formatoImpresionVenta === "A4" ? "print:block" : "print:hidden"
              } w-full max-w-[210mm] mx-auto text-black font-sans text-xs p-8 bg-white space-y-4`}
            >
              {/* Encabezado Superior */}
              <div className="flex justify-between items-start pb-3 border-b border-zinc-300">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900">
                    COMPROBANTE DE VENTA
                  </h1>
                  <p className="text-xs font-bold text-zinc-600 mt-0.5">
                    N° {formatSaleNumber(ventaCompletada.saleNumber)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {new Date().toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-zinc-900 text-sm">Taller de ejemplo</p>
                  <p className="text-zinc-600">RUT: 76.000.000-0</p>
                  <p className="text-zinc-600">+56 2 2000 0000</p>
                  <p className="text-zinc-600">contacto@taller-ejemplo.cl</p>
                  <p className="text-zinc-600">Av. Ejemplo 1234, Santiago</p>
                </div>
              </div>

              {/* Dos Columnas: CLIENTE y VEHÍCULO */}
              <div className="grid grid-cols-2 gap-8 py-2 text-xs">
                {/* Columna Cliente */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">CLIENTE</p>
                  <p className="text-sm font-extrabold text-zinc-900">{ventaCompletada.customerName || "Consumidor Final"}</p>
                  {ventaCompletada.customerIdentification && (
                    <p className="text-zinc-700">RUT: {ventaCompletada.customerIdentification}</p>
                  )}
                  {ventaCompletada.customerPhone && (
                    <p className="text-zinc-700">Tel: {ventaCompletada.customerPhone}</p>
                  )}
                  {ventaCompletada.customerEmail && (
                    <p className="text-zinc-700">{ventaCompletada.customerEmail}</p>
                  )}
                  <p className="text-zinc-500 text-[11px] pt-1">
                    Atendido por: {ventaCompletada.vendedorNombre || "Diego Muñoz"}
                  </p>
                </div>

                {/* Columna Vehículo */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">VEHÍCULO</p>
                  {ventaCompletada.vehiculoSnap ? (
                    <>
                      <p className="text-sm font-extrabold text-zinc-900">
                        {ventaCompletada.vehiculoSnap.brand} {ventaCompletada.vehiculoSnap.model} {ventaCompletada.vehiculoSnap.year || ""}
                      </p>
                      {ventaCompletada.vehiculoSnap.plate && (
                        <div className="my-1">
                          <span className="inline-block px-2 py-0.5 rounded bg-zinc-200 text-zinc-900 font-black text-xs tracking-wider border border-zinc-300">
                            {ventaCompletada.vehiculoSnap.plate.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {ventaCompletada.vehiculoSnap.color && (
                        <p className="text-zinc-700">Color: {ventaCompletada.vehiculoSnap.color}</p>
                      )}
                      {ventaCompletada.vehiculoSnap.mileage ? (
                        <p className="text-zinc-700">Km: {ventaCompletada.vehiculoSnap.mileage.toLocaleString("es-CL")}</p>
                      ) : null}
                      {ventaCompletada.vehiculoSnap.fuelType && (
                        <p className="text-zinc-700">Combustible: {ventaCompletada.vehiculoSnap.fuelType}</p>
                      )}
                      <p className="text-zinc-500 text-[11px]">Inventario: Documentos, Gata, Llave de rueda, Rueda de repuesto</p>
                      <p className="text-zinc-500 text-[11px]">Falla: Mantención y revisión general</p>
                    </>
                  ) : (
                    <p className="text-zinc-500 italic">Sin vehículo registrado en esta venta</p>
                  )}
                </div>
              </div>

              {/* Tablas de Items: Mano de Obra y Repuestos */}
              {(() => {
                const servicios = (ventaCompletada.cartSnap || []).filter((it: any) =>
                  Boolean(it.product.isService || it.product.category?.toLowerCase().includes("servicio") || it.product.category?.toLowerCase().includes("taller"))
                );
                const repuestos = (ventaCompletada.cartSnap || []).filter((it: any) =>
                  !Boolean(it.product.isService || it.product.category?.toLowerCase().includes("servicio") || it.product.category?.toLowerCase().includes("taller"))
                );

                const subtotalServicios = servicios.reduce((acc: number, it: any) => {
                  const pNum = typeof it.product.price === "number" ? it.product.price : parseFloat(it.product.price) || 0;
                  return acc + pNum * it.qty;
                }, 0);

                const subtotalRepuestos = repuestos.reduce((acc: number, it: any) => {
                  const pNum = typeof it.product.price === "number" ? it.product.price : parseFloat(it.product.price) || 0;
                  return acc + pNum * it.qty;
                }, 0);

                return (
                  <div className="space-y-4 pt-2">
                    {/* Tabla Mano de Obra (si existen servicios) */}
                    {servicios.length > 0 && (
                      <div>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-300 text-[11px] font-bold text-zinc-600">
                              <th className="py-1.5 w-auto">Mano de Obra</th>
                              <th className="py-1.5 w-24 text-center">SKU</th>
                              <th className="py-1.5 w-24 text-right">Precio</th>
                              <th className="py-1.5 w-16 text-center">Cant</th>
                              <th className="py-1.5 w-28 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {servicios.map((it: any, idx: number) => {
                              const pNum = typeof it.product.price === "number" ? it.product.price : parseFloat(it.product.price) || 0;
                              return (
                                <tr key={idx} className="py-1">
                                  <td className="py-1.5 font-bold text-zinc-900">{it.product.name}</td>
                                  <td className="py-1.5 text-center font-mono text-zinc-500">{it.product.code || "-"}</td>
                                  <td className="py-1.5 text-right text-zinc-800">{formatMoneda(pNum)}</td>
                                  <td className="py-1.5 text-center text-zinc-800">{it.qty}</td>
                                  <td className="py-1.5 text-right font-bold text-zinc-900">{formatMoneda(pNum * it.qty)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="flex justify-between items-center py-1.5 border-t border-zinc-300 text-xs font-bold text-zinc-900">
                          <span>Subtotal Mano de Obra</span>
                          <span>{formatMoneda(subtotalServicios)}</span>
                        </div>
                      </div>
                    )}

                    {/* Tabla Repuestos (si existen productos o si no hay servicios) */}
                    {(repuestos.length > 0 || servicios.length === 0) && (
                      <div>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-300 text-[11px] font-bold text-zinc-600">
                              <th className="py-1.5 w-auto">Repuestos</th>
                              <th className="py-1.5 w-24 text-center">SKU</th>
                              <th className="py-1.5 w-24 text-right">Precio</th>
                              <th className="py-1.5 w-16 text-center">Cant</th>
                              <th className="py-1.5 w-28 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {repuestos.map((it: any, idx: number) => {
                              const pNum = typeof it.product.price === "number" ? it.product.price : parseFloat(it.product.price) || 0;
                              return (
                                <tr key={idx} className="py-1">
                                  <td className="py-1.5 font-bold text-zinc-900">{it.product.name}</td>
                                  <td className="py-1.5 text-center font-mono text-zinc-500">{it.product.code || `PRD-${String(idx + 1).padStart(4, "0")}`}</td>
                                  <td className="py-1.5 text-right text-zinc-800">{formatMoneda(pNum)}</td>
                                  <td className="py-1.5 text-center text-zinc-800">{it.qty}</td>
                                  <td className="py-1.5 text-right font-bold text-zinc-900">{formatMoneda(pNum * it.qty)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="flex justify-between items-center py-1.5 border-t border-zinc-300 text-xs font-bold text-zinc-900">
                          <span>Subtotal Repuestos</span>
                          <span>{formatMoneda(subtotalRepuestos)}</span>
                        </div>
                      </div>
                    )}

                    {/* Totales Desglose A4 */}
                    <div className="flex justify-end pt-2 border-t border-zinc-300">
                      <div className="w-72 space-y-1 text-xs">
                        {servicios.length > 0 && (
                          <div className="flex justify-between text-zinc-600">
                            <span>Mano de obra:</span>
                            <span className="font-medium text-zinc-900">{formatMoneda(subtotalServicios)}</span>
                          </div>
                        )}
                        {repuestos.length > 0 && (
                          <div className="flex justify-between text-zinc-600">
                            <span>Repuestos:</span>
                            <span className="font-medium text-zinc-900">{formatMoneda(subtotalRepuestos)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-zinc-600">
                          <span>Subtotal:</span>
                          <span className="font-medium text-zinc-900">
                            {formatMoneda(parseFloat(ventaCompletada.total) - (ventaCompletada.tax || 0) + (ventaCompletada.descuentoCalculado || 0))}
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-600">
                          <span>IVA ({ivaPorcentaje}%):</span>
                          <span className="font-medium text-zinc-900">{formatMoneda(ventaCompletada.tax || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t-2 border-zinc-800 pt-2 pb-1 text-zinc-900">
                          <span className="text-base font-black">Total:</span>
                          <span className="text-xl font-black">{formatMoneda(parseFloat(ventaCompletada.total))}</span>
                        </div>
                        {ventaCompletada.paymentMethod === "Mixto" && ventaCompletada.paymentBreakdown ? (
                          <div className="space-y-1 pt-1 border-t border-zinc-200 text-xs">
                            <div className="flex justify-between font-semibold text-zinc-700">
                              <span>Forma de Pago:</span>
                              <span className="font-bold text-zinc-900">Cobro Mixto</span>
                            </div>
                            {ventaCompletada.paymentBreakdown.cash > 0 && (
                              <div className="flex justify-between text-zinc-600 pl-2">
                                <span>• Efectivo:</span>
                                <span>{formatMoneda(ventaCompletada.paymentBreakdown.cash)}</span>
                              </div>
                            )}
                            {ventaCompletada.paymentBreakdown.card > 0 && (
                              <div className="flex justify-between text-zinc-600 pl-2">
                                <span>• Tarjeta:</span>
                                <span>{formatMoneda(ventaCompletada.paymentBreakdown.card)}</span>
                              </div>
                            )}
                            {ventaCompletada.paymentBreakdown.transfer > 0 && (
                              <div className="flex justify-between text-zinc-600 pl-2">
                                <span>• Transferencia:</span>
                                <span>{formatMoneda(ventaCompletada.paymentBreakdown.transfer)}</span>
                              </div>
                            )}
                            {ventaCompletada.paymentBreakdown.credit > 0 && (
                              <div className="flex justify-between text-cyan-800 font-bold pl-2">
                                <span>• A Crédito:</span>
                                <span>{formatMoneda(ventaCompletada.paymentBreakdown.credit)}</span>
                              </div>
                            )}
                            {ventaCompletada.cambio && ventaCompletada.cambio > 0 ? (
                              <div className="flex justify-between text-emerald-700 font-bold pt-0.5">
                                <span>Vuelto Efectivo:</span>
                                <span>{formatMoneda(ventaCompletada.cambio)}</span>
                              </div>
                            ) : null}
                            {ventaCompletada.notes && (
                              <p className="text-[11px] text-zinc-500 italic pt-0.5">{ventaCompletada.notes}</p>
                            )}
                          </div>
                        ) : ventaCompletada.paymentMethod === "Crédito" ? (
                          <>
                            <div className="flex justify-between text-xs pt-1">
                              <span className="font-semibold text-zinc-600">Forma de Pago:</span>
                              <span className="font-bold text-cyan-700">Crédito</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-zinc-600">Saldo Pendiente:</span>
                              <span className="font-bold text-rose-600">{formatMoneda(parseFloat(ventaCompletada.total))}</span>
                            </div>
                            {ventaCompletada.notes && (
                              <p className="text-[11px] text-zinc-500 italic pt-0.5">{ventaCompletada.notes}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs pt-1">
                              <span className="font-semibold text-zinc-600">Pagado:</span>
                              <span className="font-bold text-emerald-600">
                                {formatMoneda(ventaCompletada.montoRecibido || parseFloat(ventaCompletada.total))}
                              </span>
                            </div>
                            {ventaCompletada.cambio && ventaCompletada.cambio > 0 ? (
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-zinc-600">Vuelto:</span>
                                <span>{formatMoneda(ventaCompletada.cambio)}</span>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Pie de Página y Condiciones */}
              <div className="pt-6 border-t border-zinc-200 text-left space-y-2">
                <p className="text-xs text-zinc-700">
                  <span className="font-semibold">Entrega estimada:</span>{" "}
                  {new Date().toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">CONDICIONES</p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    El taller no se responsabiliza por objetos de valor dejados en el vehículo. Los repuestos reemplazados quedan a disposición del cliente por 30 días.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flotante: Apertura de Caja al Entrar */}
      {mostrarModalApertura && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col gap-5 text-center backdrop-blur-xl">
            {/* Encabezado e Icono Suave Transparente */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-sm">
                💵
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Apertura</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  Fondo
                </span>
              </div>
            </div>

            {/* Formulario Efectivo */}
            <form onSubmit={handleGuardarApertura} className="flex flex-col gap-4">
              <div className="relative flex items-center justify-center bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl px-4 py-3 transition-all">
                <span className="text-2xl font-bold text-zinc-400 dark:text-zinc-500 mr-2">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  autoFocus
                  placeholder="0.00"
                  value={fondoApertura}
                  onChange={(e) => setFondoApertura(e.target.value)}
                  className="w-full text-3xl font-extrabold text-zinc-900 dark:text-white text-center bg-transparent focus:outline-none tracking-tight"
                />
              </div>

              {/* Botones de incremento rápido */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {[10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => sumarFondoApertura(val)}
                    className="h-10 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/40 transition-all cursor-pointer"
                  >
                    +${val}
                  </button>
                ))}
                {fondoApertura !== "" && (
                  <button
                    type="button"
                    onClick={() => setFondoApertura("")}
                    className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 active:scale-95 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Acciones Suaves y Transparentes */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleOmitirApertura}
                  className="flex-1 h-11 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70 active:scale-[0.98] text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/40 text-xs font-semibold transition-all text-center cursor-pointer"
                >
                  Omitir
                </button>
                <button
                  type="submit"
                  disabled={guardandoApertura}
                  className="flex-1 h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 active:scale-[0.98] dark:text-emerald-300 border border-transparent dark:border-emerald-500/30 shadow-sm text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {guardandoApertura ? "Guardando..." : "Abrir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flotante: Cierre de Caja */}
      {mostrarModalCierre && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center text-base">
                  🔒
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Cierre</h3>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalCierre(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Cuadro Resumen de Esperado y Diferencia */}
            <div className="bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Esperado</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  ${(parseFloat(cajaInfo?.expectedCash?.toString() || "0") || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Diferencia</span>
                <p
                  className={`text-base font-bold ${
                    conteoCierre !== "" &&
                    parseFloat(conteoCierre) - (parseFloat(cajaInfo?.expectedCash?.toString() || "0") || 0) < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {conteoCierre === ""
                    ? "$0.00"
                    : `$${(parseFloat(conteoCierre) - (parseFloat(cajaInfo?.expectedCash?.toString() || "0") || 0)).toFixed(2)}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmarCierre} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-400 mb-1.5">
                  Contado
                </label>
                <div className="relative flex items-center bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 focus-within:border-rose-500/50 rounded-2xl px-4 py-2.5">
                  <span className="text-2xl font-bold text-zinc-400 dark:text-zinc-500 mr-2">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    placeholder="0.00"
                    value={conteoCierre}
                    onChange={(e) => setConteoCierre(e.target.value)}
                    className="w-full text-2xl font-black text-zinc-900 dark:text-white bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Atajos Rápidos */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {[5, 10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => sumarConteoCierre(val)}
                    className="h-10 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/40 transition-all cursor-pointer"
                  >
                    +${val}
                  </button>
                ))}
                {conteoCierre !== "" && (
                  <button
                    type="button"
                    onClick={() => setConteoCierre("")}
                    className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 active:scale-95 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-400 mb-1">
                  Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Opcional..."
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  className="w-full h-11 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalCierre(false)}
                  className="flex-1 h-11 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70 text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 text-xs font-semibold transition-all text-center cursor-pointer border border-zinc-200 dark:border-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cerrandoCaja}
                  className="flex-1 h-11 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500/15 dark:hover:bg-rose-500/25 active:scale-95 dark:text-rose-300 border border-transparent dark:border-rose-500/30 shadow-sm text-xs font-bold transition-all text-center cursor-pointer"
                >
                  {cerrandoCaja ? "Cerrando..." : "Cerrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flotante: Pedidos para Vender en POS */}
      {mostrarModalPedidos && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 overflow-hidden">
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-lg">
                  📥
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Pedidos</h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {listaPedidos.length} pendientes
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalPedidos(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Filtro Rápido de Orígenes: Todos | Tienda | Órdenes */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setFiltroOrigenModal("todos")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filtroOrigenModal === "todos"
                    ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white border border-transparent shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                Todos ({listaPedidos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroOrigenModal("Tienda")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filtroOrigenModal === "Tienda"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 shadow-sm"
                    : "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400/80 hover:text-purple-900 dark:hover:text-purple-300 border border-purple-200 dark:border-purple-500/20"
                }`}
              >
                <span>🛒</span>
                <span>Tienda</span>
                <span className="text-[10px] opacity-80">
                  ({listaPedidos.filter((p) => obtenerOrigenPedido(p.type) === "Tienda").length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroOrigenModal("Ordenes")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filtroOrigenModal === "Ordenes"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-sm"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400/80 hover:text-amber-900 dark:hover:text-amber-300 border border-amber-200 dark:border-amber-500/20"
                }`}
              >
                <span>🔧</span>
                <span>Órdenes</span>
                <span className="text-[10px] opacity-80">
                  ({listaPedidos.filter((p) => obtenerOrigenPedido(p.type) === "Ordenes").length})
                </span>
              </button>
            </div>

            {/* Lista de Pedidos Filtrados por Origen */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-3">
              {cargandoPedidos ? (
                <div className="py-12 text-center text-zinc-400 text-sm">Cargando...</div>
              ) : (
                (() => {
                  const pedidosFiltrados = listaPedidos.filter((item) => {
                    if (filtroOrigenModal === "todos") return true;
                    return obtenerOrigenPedido(item.type) === filtroOrigenModal;
                  });

                  if (pedidosFiltrados.length === 0) {
                    return (
                      <div className="py-16 text-center text-zinc-400 dark:text-zinc-500 text-sm flex flex-col items-center gap-2">
                        <span className="text-3xl">📥</span>
                        <span>Sin pedidos</span>
                      </div>
                    );
                  }

                  return pedidosFiltrados.map((item) => {
                    return (
                      <div
                        key={item.id}
                        onClick={() => despacharPedidoEnPos(item)}
                        className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-all cursor-pointer shadow-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                              {item.requestNumber}
                            </span>
                            {renderOrigenBadge(item.type)}
                            {item.notes?.includes("[REENVÍO DESDE TALLER]") && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-300">
                                <span>🔄</span>
                                <span>Reenviado</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-300">
                            {item.customerName || "Cliente"}
                            {item.customerPhone && (
                              <span className="text-zinc-500 font-normal ml-1">
                                ({item.customerPhone})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            {item.itemsSummary}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200 dark:border-zinc-800">
                          <div className="text-left sm:text-right mr-1">
                            <span className="text-[10px] text-zinc-500 block">Total</span>
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              ${parseFloat(item.totalEstimated || 0).toFixed(2)}
                            </span>
                          </div>


                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRechazarPedido(item.id, item.requestNumber);
                            }}
                            className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25 flex items-center justify-center text-xs transition-all cursor-pointer"
                            title="Eliminar pedido"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Modal de Confirmación para Eliminar Pedido */}
            {pedidoAEliminar && (
              <div 
                className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 text-lg shrink-0">
                      🗑️
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">¿Eliminar pedido?</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Pedido <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{pedidoAEliminar.requestNumber}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    ¿Estás seguro de eliminar este pedido?
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      disabled={eliminandoPedido}
                      onClick={() => setPedidoAEliminar(null)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 border border-zinc-200 dark:border-transparent"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={eliminandoPedido}
                      onClick={confirmarEliminarPedido}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {eliminandoPedido ? "Eliminando..." : "Sí, Eliminar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Vista Previa de Detalle del Pedido */}
            {pedidoParaVer && (
              <div className="absolute inset-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md p-6 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
                <div className="space-y-4 overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-zinc-900 dark:text-white">
                        {pedidoParaVer.requestNumber}
                      </span>
                      {renderOrigenBadge(pedidoParaVer.type)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPedidoParaVer(null)}
                      className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500 block mb-0.5">Cliente</span>
                      <p className="font-semibold text-zinc-900 dark:text-white">{pedidoParaVer.customerName || "N/A"}</p>
                      {pedidoParaVer.customerPhone && (
                        <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">📞 {pedidoParaVer.customerPhone}</p>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-zinc-500 block mb-0.5">Vehículo / Datos</span>
                      <p className="font-semibold text-zinc-900 dark:text-white">{pedidoParaVer.vehicleInfo || "No especificado"}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                    <span className="text-zinc-500 block mb-1">Detalle Solicitado</span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">{pedidoParaVer.itemsSummary}</p>
                    {pedidoParaVer.notes && (
                      <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-[11px] border-t border-zinc-200 dark:border-zinc-800/80 pt-2 italic">
                        Nota: {pedidoParaVer.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Total Estimado</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-300">
                      ${parseFloat(pedidoParaVer.totalEstimated || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => handleRechazarPedido(pedidoParaVer.id, pedidoParaVer.requestNumber)}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Descartar
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPedidoParaVer(null)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer border border-zinc-200 dark:border-transparent"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={() => despacharPedidoEnPos(pedidoParaVer)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 active:scale-95 dark:text-emerald-300 border border-transparent dark:border-emerald-500/30 font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🛒</span>
                      <span>Vender</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalle de Producto al pulsar (i) */}
      {detalleProductoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setDetalleProductoModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg w-7 h-7 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                {getProductEmoji(detalleProductoModal.name, detalleProductoModal.category)}
              </span>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {detalleProductoModal.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  Código: <span className="font-medium text-zinc-600 dark:text-zinc-300">{detalleProductoModal.code}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2.5 py-3 border-y border-zinc-100 dark:border-zinc-800 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Categoría:</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{detalleProductoModal.category || "General"}</span>
              </div>
              {detalleProductoModal.brand && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Marca:</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{detalleProductoModal.brand}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-400">Stock disponible:</span>
                <span className={`font-bold ${detalleProductoModal.stock > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {detalleProductoModal.stock} unidades
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Precio unitario:</span>
                <span className="font-bold text-sm text-zinc-900 dark:text-white">
                  ${Math.round(typeof detalleProductoModal.price === "number" ? detalleProductoModal.price : parseFloat(detalleProductoModal.price) || 0).toLocaleString("es-CL")}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDetalleProductoModal(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  addToCart(detalleProductoModal);
                  setDetalleProductoModal(null);
                }}
                disabled={detalleProductoModal.stock <= 0}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Agregar al Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra flotante de cobro rápido en móvil */}
      {vistaMovil === "catalogo" && cart.length > 0 && (
        <div className="md:hidden fixed bottom-4 left-3 right-3 z-30 animate-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setVistaMovil("carrito")}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 backdrop-blur-md p-3.5 rounded-2xl shadow-lg flex items-center justify-between font-bold text-sm transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/25 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 border border-emerald-500/35">
                {cart.reduce((a, b) => a + b.qty, 0)} {cart.reduce((a, b) => a + b.qty, 0) === 1 ? "producto" : "productos"}
              </span>
              <span>Ver Ticket / Cobrar</span>
            </div>
            <span className="text-base font-black">${total.toFixed(2)} &rarr;</span>
          </button>
        </div>
      )}

      {/* Modal Cambiar Vendedor */}
      {modalCambiarVendedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
                  👤
                </span>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">Cambiar Vendedor</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCambiarVendedor(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const nom = nuevoVendedorTemp.trim() || "Gonzalo Rojas";
                setVendedor(nom);
                if (typeof window !== "undefined") {
                  localStorage.setItem("pos_vendedor_nombre", nom);
                }
                setModalCambiarVendedor(false);
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Nombre del Vendedor / Cajero</label>
                <input
                  type="text"
                  autoFocus
                  value={nuevoVendedorTemp}
                  onChange={(e) => setNuevoVendedorTemp(e.target.value)}
                  placeholder="Ej. Gonzalo Rojas"
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCambiarVendedor(false)}
                  className="flex-1 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Notas de Venta */}
      {modalNotasVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
                  📄
                </span>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">Notas de la Venta</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNotasVenta(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <textarea
                rows={4}
                autoFocus
                value={notasVenta}
                onChange={(e) => setNotasVenta(e.target.value)}
                placeholder="Escribe una nota..."
                className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex gap-2 pt-2">
                {notasVenta && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotasVenta("");
                      setModalNotasVenta(false);
                    }}
                    className="px-3 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 text-xs font-semibold"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalNotasVenta(false)}
                  className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  Guardar Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Anular Venta */}
      {mostrarModalAnular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center text-xl mx-auto">
              🚫
            </div>
            {cart.length > 0 || clienteSeleccionado || notasVenta ? (
              <>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">¿Anular venta actual?</h3>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalAnular(false)}
                    className="flex-1 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      limpiarCarrito();
                      setNotasVenta("");
                      if (solicitudActiva) {
                        sessionStorage.removeItem("pos_despacho_solicitud");
                        setSolicitudActiva(null);
                      }
                      setMostrarModalAnular(false);
                    }}
                    className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold cursor-pointer transition-all shadow-sm"
                  >
                    Sí, anular
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">Carrito vacío</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    No hay ningún producto ni datos en la venta actual para anular.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarModalAnular(false)}
                    className="w-full h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer transition-all"
                  >
                    Entendido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navegación móvil POS fija al fondo */}
      <PosMobileNav />
    </div>
  );
}
