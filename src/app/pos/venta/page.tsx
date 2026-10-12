"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

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

  // Clientes
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Customer | null>(null);
  const [mostrarModalClientes, setMostrarModalClientes] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  // Carrito
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);

  // 1. Descuento
  const [descuentoTipo, setDescuentoTipo] = useState<"monto" | "porcentaje">("monto");
  const [descuentoValor, setDescuentoValor] = useState<number>(0);
  const [mostrarModalDescuento, setMostrarModalDescuento] = useState(false);

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

  // 3. Cargar conteo de pedidos pendientes
  const cargarConteoWeb = useCallback(async () => {
    try {
      const res = await fetch("/api/solicitudes");
      const data = await res.json();
      if (res.ok && data.success) {
        const count = typeof data.stats?.pendientes === "number"
          ? data.stats.pendientes
          : (data.solicitudes || []).filter((s: any) => s.status === "PENDIENTE").length;
        setSolicitudesPendientesCount(count);
      }
    } catch (err) {
      console.error("Error al cargar conteo solicitudes:", err);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
    cargarClientes();
    cargarConteoWeb();

    const interval = setInterval(cargarConteoWeb, 10000);
    const handleFocus = () => cargarConteoWeb();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [cargarProductos, cargarClientes, cargarConteoWeb]);

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

  // Filtrado de productos
  const filteredProducts = productos.filter((item) => {
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
  const tax = subtotalConDescuento * 0.16; // 16% IVA
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
        taxPercent: 0.16,
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

  // Función 1: Imprimir Ticket Térmico
  const imprimirTicket = () => {
    window.print();
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow flex flex-col md:flex-row p-4 md:p-6 gap-6 w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)]">
        {/* Panel Izquierdo: Catálogo y Búsqueda */}
        <div className="flex-grow flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/pos"
                  className="text-emerald-600 hover:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg transition-colors"
                >
                  &larr;
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛒</span>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Nueva Venta</h1>
                </div>
              </div>

              {/* Botones Rápidos Superiores - Solo Iconos Minimalistas */}
              <div className="flex items-center gap-2">
                {/* Botón: Ítem Personalizado / Manual */}
                <button
                  type="button"
                  onClick={() => setMostrarModalItemManual(true)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-base transition-all shadow-sm active:scale-95"
                  title="Ítem o servicio rápido"
                >
                  <span>⚡</span>
                </button>

                {/* Botón: Ventas en Espera */}
                <button
                  type="button"
                  onClick={() => setMostrarModalEspera(true)}
                  className="relative w-10 h-10 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-base transition-all shadow-sm active:scale-95"
                  title="Ventas en espera"
                >
                  <span>⏸️</span>
                  {ventasEnEspera.length > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black shadow-sm">
                      {ventasEnEspera.length}
                    </span>
                  )}
                </button>

                {/* Botón: Pedidos Web */}
                <Link
                  href="/pos/solicitudes"
                  className="relative h-10 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  title="Pedidos"
                >
                  <span className="text-base">📥</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-black rounded-full shadow-sm transition-all ${
                      solicitudesPendientesCount > 0
                        ? "bg-orange-500 text-white animate-pulse shadow-orange-500/40 ring-2 ring-orange-400/20"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {solicitudesPendientesCount}
                  </span>
                </Link>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Escanear código de barras o buscar producto (Enter para agregar)..."
                className="w-full pl-12 pr-4 py-3.5 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all dark:text-white text-base font-medium"
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
          </div>

          {/* Rejilla de Productos */}
          <div className="flex-grow p-6 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/50">
            {cargandoProductos ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm">Cargando inventario...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-3">
                <span className="text-5xl">📦</span>
                <p className="text-base font-medium">No se encontraron productos en el inventario.</p>
                <button
                  onClick={() => setMostrarModalItemManual(true)}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                >
                  + Cobrar un ítem o servicio personalizado
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((item) => {
                  const priceNum =
                    typeof item.price === "number" ? item.price : parseFloat(item.price) || 0;
                  const isAgotado = item.stock <= 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      disabled={isAgotado}
                      className={`bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all text-left flex flex-col h-full group ${
                        isAgotado
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-emerald-500 hover:shadow-md cursor-pointer"
                      }`}
                    >
                      <div className="flex justify-between items-start w-full mb-3">
                        <span className="text-3xl">
                          {getProductEmoji(item.name, item.category)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                            isAgotado
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                              : item.stock <= item.minStock
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          }`}
                        >
                          {isAgotado ? "Agotado" : `${item.stock} en stock`}
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-900 dark:text-white line-clamp-2 leading-tight mb-1 text-sm">
                        {item.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mb-3 mt-auto">
                        {item.brand ? `${item.brand} • ` : ""}
                        {item.code}
                      </p>
                      <div className="flex justify-between items-end w-full">
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          ${priceNum.toFixed(2)}
                        </span>
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                            isAgotado
                              ? "bg-zinc-100 text-zinc-300"
                              : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 group-hover:bg-emerald-500 group-hover:text-white"
                          }`}
                        >
                          +
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Carrito / Ticket */}
        <div className="w-full md:w-[420px] lg:w-[460px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden h-full">
          {/* Cabecera del Cliente - Minimalista */}
          <div className="px-4 py-3 bg-zinc-900 dark:bg-zinc-950 text-white border-b border-zinc-800 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setMostrarModalClientes(true)}
              className="group flex items-center gap-2.5 text-left p-1 -ml-1 rounded-lg hover:bg-zinc-800/80 transition-all cursor-pointer select-none"
              title="Cambiar o seleccionar cliente"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-emerald-500/20 text-zinc-400 group-hover:text-emerald-400 border border-zinc-700/60 group-hover:border-emerald-500/40 flex items-center justify-center transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 group-hover:text-zinc-300">
                  Cliente
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 truncate max-w-[190px]">
                    {clienteSeleccionado ? clienteSeleccionado.name : "Consumidor Final"}
                  </span>
                  <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-y-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Acciones de Cabecera: Pausar y Vaciar */}
            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={ponerEnEspera}
                    className="text-xs text-purple-300 hover:text-purple-200 px-2 py-1 rounded-md hover:bg-purple-950/50 transition-colors flex items-center gap-1"
                    title="Pausar venta actual y atender otro cliente"
                  >
                    <span>⏸️</span>
                    <span className="text-[11px]">Espera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      limpiarCarrito();
                      if (solicitudActiva) {
                        sessionStorage.removeItem("pos_despacho_solicitud");
                        setSolicitudActiva(null);
                      }
                    }}
                    className="text-xs text-zinc-400 hover:text-rose-400 px-2 py-1 rounded-md hover:bg-rose-500/10 transition-colors"
                    title="Vaciar orden"
                  >
                    Vaciar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Banner de Solicitud Web en Despacho */}
          {solicitudActiva && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <div>
                  <span className="font-semibold">Despachando {solicitudActiva.requestNumber}:</span>{" "}
                  <span>{solicitudActiva.type}</span>
                  {solicitudActiva.vehicleInfo && (
                    <span className="block text-[11px] text-amber-600 dark:text-amber-400">
                      🚗 {solicitudActiva.vehicleInfo}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  sessionStorage.removeItem("pos_despacho_solicitud");
                  setSolicitudActiva(null);
                }}
                className="text-amber-700 hover:text-amber-900 dark:text-amber-400 text-xs underline ml-2"
                title="Desvincular solicitud"
              >
                Desvincular
              </button>
            </div>
          )}

          {/* Lista de Items en Carrito */}
          <div className="flex-grow overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-4">
                <span className="text-6xl opacity-50">🛒</span>
                <p className="text-sm">El carrito está vacío. Haz clic en los productos para agregarlos a la orden.</p>
                <button
                  onClick={() => setMostrarModalItemManual(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-blue-600"
                >
                  + Agregar Ítem Rápido
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.map((item) => {
                  const priceNum =
                    typeof item.product.price === "number"
                      ? item.product.price
                      : parseFloat(item.product.price) || 0;

                  return (
                    <li
                      key={item.product.id}
                      className="flex gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 group"
                    >
                      <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 border border-zinc-100 dark:border-zinc-700">
                        {getProductEmoji(item.product.name, item.product.category)}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight pr-2">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-zinc-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700 p-0.5">
                            <button
                              onClick={() => updateQty(item.product.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-emerald-600 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                            <button
                              onClick={() => updateQty(item.product.id, 1)}
                              className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-emerald-600 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>
                          <p className="font-bold text-zinc-900 dark:text-white">
                            ${(priceNum * item.qty).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Resumen y Botón de Cobro */}
          <div className="p-5 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              {/* Botón de Descuento editable */}
              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <button
                  type="button"
                  onClick={() => setMostrarModalDescuento(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>🏷️</span>
                  <span>
                    Descuento {descuentoValor > 0 ? `(${descuentoTipo === "porcentaje" ? `${descuentoValor}%` : `$${descuentoValor}`})` : ""}
                  </span>
                </button>
                <span className={descuentoCalculado > 0 ? "font-bold text-rose-500" : ""}>
                  -${descuentoCalculado.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>IVA (16%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex justify-between items-center mt-2">
                <span className="text-base font-bold text-zinc-900 dark:text-white">Total a Pagar</span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setMontoRecibido("");
                setMostrarModalPago(true);
              }}
              disabled={cart.length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed text-white text-lg font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-500/20 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>💳</span> Cobrar Ahora
            </button>
          </div>
        </div>
      </main>

      {/* MODAL 1: Seleccionar Cliente */}
      {mostrarModalClientes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Seleccionar Cliente</h3>
              <button
                onClick={() => setMostrarModalClientes(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="Buscar por nombre, documento o teléfono..."
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm mb-4 outline-none focus:border-emerald-500 dark:text-white"
              autoFocus
            />

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              <button
                onClick={() => {
                  setClienteSeleccionado(null);
                  setMostrarModalClientes(false);
                }}
                className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${
                  clienteSeleccionado === null
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">👤 Consumidor Final</p>
                  <p className="text-xs text-zinc-500">Sin registro formal / venta rápida</p>
                </div>
                {clienteSeleccionado === null && <span className="text-emerald-600 font-bold">✓</span>}
              </button>

              {clientesFiltrados.map((cli) => (
                <button
                  key={cli.id}
                  onClick={() => {
                    setClienteSeleccionado(cli);
                    setMostrarModalClientes(false);
                  }}
                  className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${
                    clienteSeleccionado?.id === cli.id
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">{cli.name}</p>
                    <p className="text-xs text-zinc-500">
                      ID: {cli.identification} {cli.phone ? `• Tel: ${cli.phone}` : ""}
                    </p>
                  </div>
                  {clienteSeleccionado?.id === cli.id && (
                    <span className="text-emerald-600 font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
              <Link
                href="/pos/clientes/nuevo"
                className="text-emerald-600 hover:underline font-semibold"
              >
                + Crear Nuevo Cliente
              </Link>
              <button
                onClick={() => setMostrarModalClientes(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Aplicar Descuento */}
      {mostrarModalDescuento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>🏷️</span> Aplicar Descuento
              </h3>
              <button
                onClick={() => setMostrarModalDescuento(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setDescuentoTipo("monto")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  descuentoTipo === "monto"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                $ Monto Fijo
              </button>
              <button
                type="button"
                onClick={() => setDescuentoTipo("porcentaje")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  descuentoTipo === "porcentaje"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                % Porcentaje
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                {descuentoTipo === "monto" ? "Monto a descontar ($)" : "Porcentaje a descontar (%)"}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={descuentoTipo === "monto" ? "0.00" : "0%"}
                value={descuentoValor || ""}
                onChange={(e) => setDescuentoValor(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base font-bold outline-none focus:border-blue-500 dark:text-white"
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
                    className="py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDescuentoValor(0);
                  setMostrarModalDescuento(false);
                }}
                className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300"
              >
                Quitar Descuento
              </button>
              <button
                type="button"
                onClick={() => setMostrarModalDescuento(false)}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Ventas en Espera (Pausa) */}
      {mostrarModalEspera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>⏸️</span> Ventas en Espera ({ventasEnEspera.length})
              </h3>
              <button
                onClick={() => setMostrarModalEspera(false)}
                className="text-zinc-400 hover:text-zinc-600"
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
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between gap-3"
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
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
                        >
                          Recuperar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarVentaEnEspera(v.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 text-xs"
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
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Ítem Rápido / Manual */}
      {mostrarModalItemManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>⚡</span> Agregar Ítem o Servicio Rápido
              </h3>
              <button
                onClick={() => setMostrarModalItemManual(false)}
                className="text-zinc-400 hover:text-zinc-600"
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
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium outline-none focus:border-blue-500 dark:text-white"
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
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-bold outline-none focus:border-blue-500 dark:text-white"
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
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-bold outline-none focus:border-blue-500 dark:text-white"
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
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 outline-none focus:border-blue-500"
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
                  className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Procesar Cobro</h3>
              <button
                onClick={() => setMostrarModalPago(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
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
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Efectivo", "Tarjeta", "Transferencia"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPago(m)}
                    className={`py-3 px-2 rounded-lg text-xs font-bold border transition-all ${
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
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 text-lg font-black text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                />

                {/* Botones de denominaciones rápidas */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 50, 100].map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setMontoRecibido(billete.toString())}
                      className="py-1 rounded-md bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800/50 text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
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

            <div className="flex items-center gap-3">
              <button
                onClick={() => setMostrarModalPago(false)}
                className="flex-1 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarCobro}
                disabled={procesandoVenta}
                className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {procesandoVenta ? "Procesando venta..." : "Completar Venta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Venta Exitosa con Impresión de Ticket Térmico */}
      {ventaCompletada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative text-center print:border-none print:shadow-none print:p-0 print:max-w-none">
            {/* Header del modal (no imprimible) */}
            <div className="print:hidden">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4">
                ✅
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
                ¡Venta Registrada!
              </h3>
              <p className="text-xs text-zinc-500 mb-4">Venta procesada y stock actualizado correctamente</p>
            </div>

            {/* Ticket Térmico Imprimible */}
            <div
              ref={ticketRef}
              className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-left text-xs font-mono space-y-2 mb-6 print:border-none print:p-2 print:text-black print:bg-white"
            >
              <div className="text-center pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                <h4 className="font-bold text-base text-zinc-900 dark:text-white print:text-black">AUTO / G</h4>
                <p className="text-[11px] text-zinc-500">Taller y Repuestos Automotrices</p>
                <p className="text-[11px] text-zinc-500 font-bold mt-1">N° Venta: {ventaCompletada.saleNumber}</p>
              </div>

              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500">Cliente:</span>
                <span className="font-bold text-zinc-900 dark:text-white print:text-black">{ventaCompletada.customerName}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500">Método de Pago:</span>
                <span className="font-bold text-zinc-900 dark:text-white print:text-black">{ventaCompletada.paymentMethod}</span>
              </div>

              {/* Items */}
              <div className="py-2 border-y border-dashed border-zinc-300 dark:border-zinc-700 my-2 space-y-1">
                {ventaCompletada.cartSnap && ventaCompletada.cartSnap.map((it: any, idx: number) => {
                  const pNum = typeof it.product.price === "number" ? it.product.price : parseFloat(it.product.price) || 0;
                  return (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="truncate max-w-[200px]">
                        {it.qty}x {it.product.name}
                      </span>
                      <span className="font-semibold">${(pNum * it.qty).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Totales */}
              {ventaCompletada.descuentoCalculado > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>Descuento:</span>
                  <span>-${ventaCompletada.descuentoCalculado.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">IVA (16%):</span>
                <span>${ventaCompletada.tax?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-300 dark:border-zinc-700 pt-1.5 text-sm font-black">
                <span>TOTAL:</span>
                <span className="text-emerald-600 dark:text-emerald-400 print:text-black">
                  ${parseFloat(ventaCompletada.total).toFixed(2)}
                </span>
              </div>

              {ventaCompletada.montoRecibido && (
                <div className="pt-1 text-[11px] space-y-0.5 border-t border-dashed border-zinc-300">
                  <div className="flex justify-between">
                    <span>Recibido:</span>
                    <span>${ventaCompletada.montoRecibido.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600">
                    <span>Cambio:</span>
                    <span>${(ventaCompletada.cambio || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <p className="text-center text-[10px] text-zinc-400 pt-2">
                ¡Gracias por su compra!
              </p>
            </div>

            {/* Botones de Acción (no imprimibles) */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={imprimirTicket}
                className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🖨️</span>
                <span>Imprimir Ticket</span>
              </button>
              <Link
                href="/pos/historial"
                className="px-3 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Historial
              </Link>
              <button
                onClick={() => setVentaCompletada(null)}
                className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
