"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

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
}

interface Customer {
  id: string;
  identification: string;
  name: string;
  phone: string;
  type: string;
}

interface VentaEnEspera {
  id: string;
  nombre: string;
  cart: { product: Product; qty: number }[];
  clienteSeleccionado: Customer | null;
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

export default function NuevaVentaPage() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "productos" | "servicios">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [vistaMovil, setVistaMovil] = useState<"catalogo" | "carrito">("catalogo");
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

  // Clientes
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Customer | null>(null);
  const [mostrarModalClientes, setMostrarModalClientes] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [creandoClienteInline, setCreandoClienteInline] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteIdent, setNuevoClienteIdent] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("");
  const [guardandoClienteInline, setGuardandoClienteInline] = useState(false);

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
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "Tarjeta" | "Transferencia">("Efectivo");
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [ventaCompletada, setVentaCompletada] = useState<any | null>(null);

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

  // Flotante: Pedidos (3 Orígenes: Landing, Tienda, Taller)
  const [mostrarModalPedidos, setMostrarModalPedidos] = useState(false);
  const [listaPedidos, setListaPedidos] = useState<any[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [filtroOrigenModal, setFiltroOrigenModal] = useState<"todos" | "Selector" | "Tienda" | "Taller">("todos");
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



  const obtenerOrigenPedido = (tipo?: string): "Selector" | "Tienda" | "Taller" => {
    if (!tipo) return "Selector";
    const t = tipo.toUpperCase();
    if (t.includes("TALLER") || t.includes("MECANICO") || t.includes("ORDEN")) return "Taller";
    if (t.includes("TIENDA") || t.includes("ECOMMERCE") || t.includes("PRODUCTO")) return "Tienda";
    return "Selector";
  };

  const renderOrigenBadge = (tipo?: string) => {
    const origen = obtenerOrigenPedido(tipo);
    if (origen === "Taller") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 bg-amber-500/15 border-amber-500/30 text-amber-300">
          <span>🔧</span>
          <span>Taller</span>
        </span>
      );
    }
    if (origen === "Tienda") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 bg-purple-500/15 border-purple-500/30 text-purple-300">
          <span>🛒</span>
          <span>Tienda</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 bg-cyan-500/15 border-cyan-500/30 text-cyan-300">
        <span>🚗</span>
        <span>Selector</span>
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

  // 2. Cargar clientes
  const cargarClientes = useCallback(async () => {
    try {
      const res = await fetch("/api/clientes");
      const data = await res.json();
      if (res.ok && data.success) {
        setClientes(data.clientes || []);
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
          tipoCliente: "Personal",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el cliente en Neon.");
      }

      const creado = data.cliente;
      setClientes((prev) => [creado, ...prev]);
      setClienteSeleccionado(creado);
      setNuevoClienteNombre("");
      setNuevoClienteIdent("");
      setNuevoClienteTelefono("");
      setCreandoClienteInline(false);
      setMostrarModalClientes(false);
    } catch (err: any) {
      alert(err.message || "Error al registrar cliente.");
    } finally {
      setGuardandoClienteInline(false);
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
  const verificarCajaApertura = useCallback(async () => {
    try {
      const res = await fetch("/api/caja");
      const json = await res.json();
      if (res.ok && json.success) {
        const active = json.activeSession || null;
        setCajaActiva(active);
        if (active) {
          setCajaInfo({
            initialCash: parseFloat(active.initialCash?.toString() || "0"),
            expectedCash: parseFloat(json.data?.expectedCash?.toString() || active.initialCash?.toString() || "0"),
          });
        } else {
          setCajaInfo(null);
        }
      }
    } catch (e) {
      console.error("Error al consultar caja:", e);
    }
  }, []);

  useEffect(() => {
    verificarCajaApertura();
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
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_INITIAL",
          initialCash: monto,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al abrir caja");
      }

      setMostrarModalApertura(false);
      await verificarCajaApertura();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoApertura(false);
    }
  };

  const handleOmitirApertura = () => {
    setMostrarModalApertura(false);
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
          loadedItems = parsed.map((p: any, idx: number) => ({
            product: {
              id: p.id || `web-item-${idx}`,
              code: p.code || `WEB-${idx + 1}`,
              name: p.name || item.itemsSummary || "Solicitud de Cliente",
              brand: p.brand || null,
              category: item.type || "General",
              price: p.price || item.totalEstimated || 0,
              stock: 999,
              minStock: 1,
              status: "ACTIVO",
            },
            qty: p.qty || p.quantity || 1,
          }));
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
            price: item.totalEstimated || 0,
            stock: 999,
            minStock: 1,
            status: "ACTIVO",
          },
          qty: 1,
        },
      ];
    }

    setCart(loadedItems);
    setMostrarModalPedidos(false);
    setPedidoParaVer(null);
  };

  // 4. Detectar si viene una solicitud web para despachar
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
              loadedItems = parsed.map((p: any, idx: number) => ({
                product: {
                  id: p.id || `web-item-${idx}`,
                  code: p.code || `WEB-${idx + 1}`,
                  name: p.name || item.itemsSummary || "Solicitud de Cliente",
                  brand: p.brand || null,
                  category: item.type,
                  price: p.price || item.totalEstimated || 0,
                  stock: 999,
                  minStock: 1,
                  status: "ACTIVO",
                },
                qty: p.qty || p.quantity || 1,
              }));
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
                price: item.totalEstimated || 0,
                stock: 999,
                minStock: 1,
                status: "ACTIVO",
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

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      (item.brand && item.brand.toLowerCase().includes(term)) ||
      item.category.toLowerCase().includes(term)
    );
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

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const limpiarCarrito = () => {
    setCart([]);
    setClienteSeleccionado(null);
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

  // Registrar cobro real
  const handleConfirmarCobro = async () => {
    if (cart.length === 0) return;
    setProcesandoVenta(true);

    try {
      const payload = {
        customerId: clienteSeleccionado?.id || null,
        customerName: clienteSeleccionado?.name || "Consumidor Final",
        paymentMethod: metodoPago,
        discount: descuentoCalculado,
        taxPercent: ivaPorcentaje / 100,
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
        montoRecibido: metodoPago === "Efectivo" && montoRecibidoNum > 0 ? montoRecibidoNum : null,
        cambio: metodoPago === "Efectivo" && montoRecibidoNum > 0 ? cambio : null,
        cartSnap: [...cart],
      });
      setMostrarModalPago(false);
      setCart([]);
      setClienteSeleccionado(null);
      setDescuentoValor(0);
      setMontoRecibido("");

      await cargarProductos();
    } catch (err: any) {
      console.error(err);
      alert("Error al procesar cobro: " + err.message);
    } finally {
      setProcesandoVenta(false);
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

      <main className="flex-grow flex flex-col md:flex-row p-3 sm:p-4 md:p-6 gap-4 md:gap-6 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-80px)] md:h-[calc(100vh-80px)]">
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
        <div className={`${vistaMovil === "carrito" ? "hidden md:flex" : "flex"} flex-grow flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden`}>
          <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-3 sm:gap-4">
            {/* Header: Flecha y Venta a la izquierda, Pedidos y Caja a la derecha en la misma línea en móvil */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                  Venta
                </h1>
                <span className="inline-flex items-center justify-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shrink-0">
                  {productos.length}
                </span>
              </div>

              {/* Botones de Acción: Pedidos y Caja a la altura a la derecha */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={abrirModalPedidos}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-zinc-700 dark:text-zinc-300 bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-300/40 dark:border-zinc-700/40 font-semibold text-xs transition-all active:scale-95 cursor-pointer backdrop-blur-sm whitespace-nowrap"
                >
                  <span className="text-sm">📥</span>
                  <span>Pedidos</span>
                  {solicitudesPendientesCount > 0 && (
                    <span className="text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/35 font-semibold">
                      {solicitudesPendientesCount}
                    </span>
                  )}
                </button>

                {/* Botón de Caja: Verde si está para abrir, Rojo (🔒) si está abierta para cerrar */}
                {cajaActiva ? (
                  <button
                    type="button"
                    onClick={() => {
                      verificarCajaApertura();
                      setMostrarModalCierre(true);
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-300 border border-rose-500/30 flex items-center justify-center text-sm transition-all shadow-[0_0_15px_rgba(244,63,94,0.12)] cursor-pointer shrink-0"
                    title="Cerrar Caja"
                  >
                    <span>🔒</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFondoApertura("");
                      setMostrarModalApertura(true);
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer shrink-0"
                    title="Abrir Caja (Apertura)"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
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

            {/* Barra de Categorías Dinámica según Productos o Servicios */}
            <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-xs overflow-hidden">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                {categoriasVisibles.map((cat) => {
                  const activa = filtroCategoria === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFiltroCategoria(cat.id)}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer shrink-0 active:scale-95 ${
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
          </div>

          {/* Rejilla de Productos */}
          <div className="flex-grow p-6 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/50">
            {cargandoProductos ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm">Cargando inventario...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center select-none">
                <span className="text-4xl opacity-30">📦</span>
              </div>
            ) : (
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
        <div className={`${vistaMovil === "catalogo" ? "hidden md:flex" : "flex"} w-full md:w-[420px] lg:w-[450px] flex-shrink-0 flex-col bg-white dark:bg-zinc-950 p-3 sm:p-3.5 gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-2xl md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-2rem)] transition-all`}>
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

          {/* Cabecera del Cliente - Tarjeta con Filos Suaves y Texto Normal */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/70 shadow-sm flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMostrarModalClientes(true)}
              className="flex items-center gap-3 text-left group cursor-pointer select-none"
              title="Cambiar o seleccionar cliente"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                  Cliente
                </span>
                <span className="text-sm font-normal text-zinc-900 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5 truncate max-w-[190px]">
                  {clienteSeleccionado ? clienteSeleccionado.name : "Consumidor Final"}
                  <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="text-xs font-normal text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-rose-50 dark:bg-zinc-800/60 dark:hover:bg-rose-500/10 border border-zinc-200 hover:border-rose-200 dark:border-zinc-700/40 dark:hover:border-rose-500/20 transition-all cursor-pointer"
                title="Vaciar orden"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Banner de Pedido en Despacho: Origen Landing, Tienda, Taller */}
          {solicitudActiva && (
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-sm">📥</span>
                <span className="font-normal text-zinc-900 dark:text-white text-xs">
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
                className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                title="Desvincular"
              >
                ✕
              </button>
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
                    className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/90 hover:bg-zinc-100/90 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700/70 rounded-xl transition-all shadow-sm group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-xl shrink-0">
                      {getProductEmoji(item.product.name, item.product.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-normal text-zinc-900 dark:text-zinc-200 truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5 font-normal">
                        ${priceNum.toFixed(2)} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stepper Sutil */}
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/90 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700/40">
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-6 h-6 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700/80 flex items-center justify-center text-xs font-normal active:scale-90 transition-all cursor-pointer"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-normal text-zinc-900 dark:text-zinc-200">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-6 h-6 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700/80 flex items-center justify-center text-xs font-normal active:scale-90 transition-all cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal del Item */}
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 w-14 text-right">
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
                      Venta rápida
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
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {cli.identification || "Sin CI"} {cli.phone ? `• ${cli.phone}` : ""}
                        </p>
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
          <div className="bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/80 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl relative backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-zinc-200 dark:border-zinc-800/80">
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
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={nuevoClienteNombre}
                  onChange={(e) => setNuevoClienteNombre(e.target.value)}
                  className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                  Cédula / RUC
                </label>
                <input
                  type="text"
                  placeholder="Ej. 0928374651"
                  value={nuevoClienteIdent}
                  onChange={(e) => setNuevoClienteIdent(e.target.value)}
                  className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Ej. 0987654321"
                  value={nuevoClienteTelefono}
                  onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                  className="w-full h-11 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500/50 transition-all"
                />
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
                <p>No hay ventas guardadas en espera.</p>
                <p className="text-xs text-zinc-500 mt-1">Usa el botón "Espera" en el carrito para pausar una venta.</p>
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
              <div className="grid grid-cols-3 gap-2">
                {(["Efectivo", "Tarjeta", "Transferencia"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPago(m)}
                    className={`h-11 py-2 px-2 rounded-xl text-xs font-normal border transition-all cursor-pointer ${
                      metodoPago === m
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {m === "Efectivo" && "💵 "}
                    {m === "Tarjeta" && "💳 "}
                    {m === "Transferencia" && "🏦 "}
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculadora de Cambio para Efectivo */}
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
                disabled={procesandoVenta}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 active:scale-[0.99] border border-transparent dark:border-emerald-500/35 hover:dark:border-emerald-500/50 dark:text-emerald-300 text-xs font-medium shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {procesandoVenta ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Venta Exitosa con Impresión de Ticket Térmico */}
      {ventaCompletada && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative text-center print:border-none print:shadow-none print:p-0 print:max-w-none max-h-[92vh] overflow-y-auto">
            {/* Header del modal (no imprimible) */}
            <div className="print:hidden mb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-2xl mx-auto">
                ✅
              </div>
            </div>

            {/* TICKET DE VENTA (ESTILO SUPERMERCADO - TEXTO NORMAL) */}
            <div
              ref={ticketRef}
              className={`p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-left text-xs font-sans space-y-2.5 mb-5 shadow-inner print:border-none print:p-2 print:text-black print:bg-white ${
                formatoImpresionVenta === "A4" ? "print:hidden" : "print:block"
              }`}
            >
              {/* Encabezado Supermercado */}
              <div className="text-center pb-2.5 border-b border-dashed border-zinc-300 dark:border-zinc-600">
                <h4 className="font-extrabold text-base tracking-wide text-zinc-900 dark:text-white print:text-black">AUTO / G</h4>
                <p className="text-[11px] text-zinc-500 font-medium">Taller y Repuestos Automotrices</p>
                <p className="text-[10px] text-zinc-400">R.U.C.: 1792273235001 • Matriz Central</p>
                <div className="mt-2 pt-1 border-t border-dotted border-zinc-200 dark:border-zinc-700/60 flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300 print:text-black">
                  <span className="font-bold">N° Venta: {ventaCompletada.saleNumber}</span>
                  <span>{new Date().toLocaleDateString("es-CL")}</span>
                </div>
              </div>

              {/* Datos Cliente y Pago */}
              <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-300 print:text-black pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-600">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Cliente:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white print:text-black">{ventaCompletada.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Método de Pago:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white print:text-black">{ventaCompletada.paymentMethod}</span>
                </div>
              </div>

              {/* Cabecera de Items */}
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider pt-0.5">
                <span>Cant. Descripción</span>
                <span>Total</span>
              </div>

              {/* Lista de Items */}
              <div className="space-y-1.5 py-1">
                {ventaCompletada.cartSnap && ventaCompletada.cartSnap.map((it: any, idx: number) => {
                  const pNum = typeof it.product.price === "number" ? it.product.price : parseFloat(it.product.price) || 0;
                  return (
                    <div key={idx} className="flex justify-between items-start text-xs">
                      <div className="flex items-start gap-1.5 max-w-[72%]">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 print:text-black shrink-0">{it.qty}x</span>
                        <span className="font-normal text-zinc-900 dark:text-zinc-100 print:text-black leading-snug">{it.product.name}</span>
                      </div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 print:text-black shrink-0">
                        ${(pNum * it.qty).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totales y Desglose */}
              <div className="pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-600 space-y-1 text-xs">
                {ventaCompletada.descuentoCalculado > 0 && (
                  <div className="flex justify-between text-rose-500 font-medium">
                    <span>Descuento aplicado:</span>
                    <span>-${ventaCompletada.descuentoCalculado.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-500 print:text-black">
                  <span>Subtotal:</span>
                  <span>${(parseFloat(ventaCompletada.total) - (ventaCompletada.tax || 0) + (ventaCompletada.descuentoCalculado || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 print:text-black">
                  <span>IVA ({ivaPorcentaje}%):</span>
                  <span>${ventaCompletada.tax?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-300 dark:border-zinc-600 pt-1.5 text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white print:text-black">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 print:text-black">
                    ${parseFloat(ventaCompletada.total).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {ventaCompletada.montoRecibido && (
                  <div className="pt-1.5 mt-1 border-t border-dotted border-zinc-200 dark:border-zinc-700 space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-300 print:text-black">
                    <div className="flex justify-between">
                      <span>Efectivo Recibido:</span>
                      <span>${ventaCompletada.montoRecibido.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                      <span>Cambio / Vuelto:</span>
                      <span>${(ventaCompletada.cambio || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pie del Ticket */}
              <div className="text-center text-[11px] text-zinc-400 print:text-zinc-600 pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-600">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 print:text-black">¡Gracias por su compra!</p>
              </div>
            </div>

            {/* FORMATO FACTURA A4 (SÓLO IMPRESIÓN) */}
            <div
              className={`hidden ${
                formatoImpresionVenta === "A4" ? "print:block" : "print:hidden"
              } w-full max-w-[210mm] mx-auto text-black font-sans text-xs p-6 bg-white space-y-4`}
            >
              {/* Encabezado A4 */}
              <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-wide text-zinc-900">AUTO / G</h1>
                  <p className="text-xs font-semibold text-zinc-600">Taller Mecánico & Repuestos Automotrices</p>
                  <p className="text-[11px] text-zinc-500 mt-1">R.U.C.: 1792273235001</p>
                  <p className="text-[11px] text-zinc-500">Dirección: Av. Principal y Taller Central • Tel: +56 9 1234 5678</p>
                </div>
                <div className="border-2 border-zinc-800 rounded-xl p-3 text-right min-w-[200px]">
                  <p className="text-xs font-bold text-zinc-500">COMPROBANTE DE VENTA</p>
                  <p className="text-lg font-black text-blue-700">N° {ventaCompletada.saleNumber}</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Fecha: {new Date().toLocaleDateString("es-CL")}</p>
                </div>
              </div>

              {/* Datos Cliente */}
              <div className="border border-zinc-300 rounded-xl p-3 bg-zinc-50/50 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-bold text-zinc-600">Cliente:</span>{" "}
                  <span className="font-semibold text-zinc-900">{ventaCompletada.customerName}</span>
                </div>
                <div>
                  <span className="font-bold text-zinc-600">Método de Pago:</span>{" "}
                  <span className="font-semibold text-zinc-900">{ventaCompletada.paymentMethod}</span>
                </div>
              </div>

              {/* Tabla de Productos / Servicios */}
              <table className="w-full text-left text-xs border border-zinc-200">
                <thead className="bg-zinc-100 text-zinc-700 uppercase font-bold text-[11px]">
                  <tr className="border-b border-zinc-200">
                    <th className="p-2 w-12 text-center">Cant.</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2 w-28 text-right">Precio Unit.</th>
                    <th className="p-2 w-28 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {ventaCompletada.cartSnap && ventaCompletada.cartSnap.map((it: any, idx: number) => {
                    const pNum = typeof it.product.price === "number" ? it.product.price : parseFloat(it.product.price) || 0;
                    return (
                      <tr key={idx}>
                        <td className="p-2 text-center font-bold">{it.qty}</td>
                        <td className="p-2 font-medium">{it.product.name}</td>
                        <td className="p-2 text-right">${pNum.toFixed(2)}</td>
                        <td className="p-2 text-right font-semibold">${(pNum * it.qty).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totales A4 */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1 text-xs border-t border-zinc-300 pt-2">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal:</span>
                    <span>${(parseFloat(ventaCompletada.total) - (ventaCompletada.tax || 0) + (ventaCompletada.descuentoCalculado || 0)).toFixed(2)}</span>
                  </div>
                  {ventaCompletada.descuentoCalculado > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Descuento:</span>
                      <span>-${ventaCompletada.descuentoCalculado.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600">
                    <span>IVA ({ivaPorcentaje}%):</span>
                    <span>${ventaCompletada.tax?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between font-black text-base border-t-2 border-zinc-800 pt-1 text-zinc-900">
                    <span>TOTAL:</span>
                    <span>${parseFloat(ventaCompletada.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Pie de Página A4 */}
              <div className="text-center text-[10px] text-zinc-400 pt-6 border-t border-zinc-200">
                <p>Documento generado electrónicamente por Sistema AutoG POS • Formato A4</p>
                <p>Gracias por su preferencia</p>
              </div>
            </div>

            {/* Botones de Acción (no imprimibles) */}
            <div className="flex items-center gap-2 print:hidden relative">
              {/* Dropdown de Impresión: Ticket o A4 */}
              <div className="relative flex-1" ref={menuImpresionVentaRef}>
                <button
                  type="button"
                  onClick={() => setMenuImpresionVenta(!menuImpresionVenta)}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-600/20"
                >
                  <span className="text-sm">🖨️</span>
                  <span>Imprimir</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      menuImpresionVenta ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Menú Desplegable con opciones Ticket o A4 */}
                {menuImpresionVenta && (
                  <div className="absolute left-0 bottom-full mb-2 w-60 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                    <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Seleccionar Formato
                    </div>
                    <button
                      type="button"
                      onClick={() => dispararImpresionVenta("TICKET")}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <span className="text-xl">🧾</span>
                      <div>
                        <div className="font-bold text-xs text-zinc-900 dark:text-white">Ticket Térmico</div>
                        <div className="text-[11px] text-zinc-500">Rollo POS supermercado (80mm)</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => dispararImpresionVenta("A4")}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <span className="text-xl">📄</span>
                      <div>
                        <div className="font-bold text-xs text-zinc-900 dark:text-white">Imprimir A4</div>
                        <div className="text-[11px] text-zinc-500">Hoja completa estándar</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Botón Nueva Venta */}
              <button
                type="button"
                onClick={() => setVentaCompletada(null)}
                className="flex-1 h-11 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✨</span>
                <span>Nueva Venta</span>
              </button>
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

            {/* Filtro Rápido de 3 Orígenes: Todos | Landing | Tienda | Taller */}
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
                onClick={() => setFiltroOrigenModal("Selector")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filtroOrigenModal === "Selector"
                    ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-sm"
                    : "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400/80 hover:text-cyan-900 dark:hover:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20"
                }`}
              >
                <span>🚗</span>
                <span>Selector</span>
                <span className="text-[10px] opacity-80">
                  ({listaPedidos.filter((p) => obtenerOrigenPedido(p.type) === "Selector").length})
                </span>
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
                onClick={() => setFiltroOrigenModal("Taller")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filtroOrigenModal === "Taller"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-sm"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400/80 hover:text-amber-900 dark:hover:text-amber-300 border border-amber-200 dark:border-amber-500/20"
                }`}
              >
                <span>🔧</span>
                <span>Taller</span>
                <span className="text-[10px] opacity-80">
                  ({listaPedidos.filter((p) => obtenerOrigenPedido(p.type) === "Taller").length})
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

      {/* Navegación móvil POS fija al fondo */}
      <PosMobileNav />
    </div>
  );
}
