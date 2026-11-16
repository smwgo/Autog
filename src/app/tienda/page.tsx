"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";

interface Product {
  id: string;
  name: string;
  code?: string;
  sku?: string;
  brand?: string | null;
  category: string;
  description?: string | null;
  price: number | string;
  stock?: number;
  imageUrl?: string | null;
  photoUrl?: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estado del Carrito y Cajón Lateral (Drawer)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Formulario de Pedido Web hacia POS
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Cargar productos reales desde Neon PostgreSQL
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/productos?modulo=Tienda", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.productos)) {
          setProducts(data.productos);
        } else {
          setProducts([]);
        }
      } catch (e) {
        console.error("Error al cargar productos de tienda:", e);
      } finally {
        setCargando(false);
      }
    }
    load();
  }, []);

  // Agregar al carrito y desplegar a un costado
  const handleComprar = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Feedback visual y apertura lateral
    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 1200);
    setSolicitudExitosa(null);
    setFormError(null);
    setIsCartOpen(true);
  };

  const modificarCantidad = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nuevaCantidad = item.quantity + delta;
            return nuevaCantidad > 0 ? { ...item, quantity: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const eliminarProducto = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const vaciarCarrito = () => {
    setCart([]);
  };

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalMonto = cart.reduce((acc, item) => {
    const p =
      typeof item.product.price === "number"
        ? item.product.price
        : parseFloat(item.product.price) || 0;
    return acc + p * item.quantity;
  }, 0);

  // Enviar pedido hacia el POS
  const handleConfirmarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError("Por favor ingresa tu Nombre y Teléfono / WhatsApp para despachar.");
      return;
    }
    setFormError(null);
    setEnviando(true);

    try {
      const itemsSummary = cart
        .map((item) => `${item.product.name} (x${item.quantity})`)
        .join(", ");

      const itemsJson = cart.map((item) => {
        const priceNum =
          typeof item.product.price === "number"
            ? item.product.price
            : parseFloat(item.product.price) || 0;
        return {
          id: item.product.id,
          code: item.product.code || item.product.sku || "PROD",
          name: item.product.name,
          brand: item.product.brand || "",
          price: priceNum,
          quantity: item.quantity,
          qty: item.quantity,
          category: item.product.category,
        };
      });

      const payload = {
        type: "TIENDA",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || "",
        vehicleInfo: vehicleInfo.trim() || "",
        itemsSummary,
        itemsJson,
        totalEstimated: totalMonto,
        notes: notes.trim(),
      };

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al registrar el pedido");
      }

      setSolicitudExitosa(data.solicitud);
      setCart([]);
    } catch (err: any) {
      alert("Error al procesar el pedido: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  const reiniciarCompra = () => {
    setSolicitudExitosa(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setVehicleInfo("");
    setNotes("");
    setIsCartOpen(false);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow pt-16 sm:pt-24 pb-28 md:pb-16 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full">
        {/* Cabecera de la Tienda */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              title="Volver al Inicio"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                Tienda
              </h1>
            </div>
          </div>

          {/* Botón rápido para abrir el Carrito lateral */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center justify-center gap-3 px-5 py-2.5 min-h-[44px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl shadow-sm text-zinc-800 dark:text-zinc-200 font-semibold text-sm transition-all cursor-pointer group"
          >
            <div className="relative">
              <span className="text-xl">🛒</span>
              {totalItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <span>Ver Carrito</span>
            {totalItemsCount > 0 && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                ${totalMonto.toFixed(2)}
              </span>
            )}
          </button>
        </div>

        {/* Listado de Productos */}
        {cargando ? (
          <div className="py-24 text-center text-zinc-400">
            <div className="inline-block animate-spin text-4xl mb-3">⚙️</div>
            <p className="text-base font-medium">Cargando catálogo de productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 max-w-xl mx-auto p-8">
            <span className="text-5xl block mb-3">📦</span>
            <h2 className="text-xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              No hay productos disponibles
            </h2>
            <p className="text-zinc-500 text-sm">
              Estamos actualizando nuestro inventario. Vuelve pronto o consúltanos directamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const priceNum =
                typeof product.price === "number"
                  ? product.price
                  : parseFloat(product.price) || 0;
              const isAdded = justAddedId === product.id;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300"
                >
                  {/* Foto o Icono */}
                  <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center p-4 overflow-hidden">
                    {(product.imageUrl || product.photoUrl) ? (
                      <img
                        src={product.imageUrl || product.photoUrl || ""}
                        alt={product.name}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                        📦
                      </span>
                    )}

                    {product.brand && (
                      <div className="absolute top-3 right-3 bg-zinc-900/85 dark:bg-zinc-100/90 text-white dark:text-zinc-900 text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-xs">
                        {product.brand}
                      </div>
                    )}
                  </div>

                  {/* Información */}
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        {product.category || "General"}
                      </span>
                      {(product.code || product.sku) && (
                        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                          {product.code || product.sku}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Precio y Botón Comprar */}
                    <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-zinc-400 font-medium">Precio</span>
                        <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                          ${priceNum.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleComprar(product)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${isAdded
                          ? "bg-emerald-600 text-white scale-105"
                          : "bg-zinc-900 hover:bg-blue-600 dark:bg-zinc-100 dark:hover:bg-blue-500 text-white dark:text-zinc-900 dark:hover:text-white"
                          }`}
                      >
                        {isAdded ? (
                          <>
                            <span>✓</span> Agregado
                          </>
                        ) : (
                          <>Comprar</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Botón Flotante del Carrito (Mobile y Desktop) */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-6 right-4 sm:right-6 z-40 bg-zinc-900 dark:bg-blue-600 hover:bg-zinc-800 dark:hover:bg-blue-700 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl flex items-center gap-3 transition-transform hover:scale-105 cursor-pointer border border-white/10 min-h-[48px] min-w-[48px]"
        aria-label="Abrir Carrito de Compras"
      >
        <div className="relative">
          <span className="text-xl">🛒</span>
          {totalItemsCount > 0 && (
            <span className="absolute -top-2 -right-2.5 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {totalItemsCount}
            </span>
          )}
        </div>
        <span className="hidden sm:inline font-bold text-sm">
          {totalItemsCount > 0 ? `$${totalMonto.toFixed(2)}` : "Carrito"}
        </span>
      </button>

      {/* ============================================================== */}
      {/* CARRITO DE COMPRAS A UN COSTADO (SLIDE-OVER DRAWER)              */}
      {/* ============================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Fondo semi-transparente que cierra al hacer clic */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-12 w-full sm:w-auto">
            <div className="w-full sm:w-screen max-w-full sm:max-w-lg bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300 h-full">
              {/* Encabezado del Carrito */}
              <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:pt-5">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      Carrito de Compras
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {totalItemsCount === 0
                        ? "0 artículos"
                        : `${totalItemsCount} ${totalItemsCount === 1 ? "artículo" : "artículos"
                        } seleccionados`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCartOpen(false)}
                  className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-lg cursor-pointer"
                  aria-label="Cerrar carrito"
                >
                  ✕
                </button>
              </div>

              {/* Contenido Central */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                {/* 1. Vista de Confirmación Exitosa */}
                {solicitudExitosa ? (
                  <div className="text-center py-6 px-3 space-y-5 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 text-3xl flex items-center justify-center mx-auto shadow-inner">
                      ✓
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                        ¡Pedido Enviado a Tienda!
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                        Tu solicitud ingresó con éxito a nuestro sistema de Punto de Venta (POS)
                        para despacho y preparación inmediata.
                      </p>
                    </div>

                    {/* Resumen de orden confirmada */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-left text-xs font-mono space-y-2 border border-zinc-200 dark:border-zinc-700/60">
                      <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-700 pb-1">
                        <span className="text-zinc-500 font-sans">Nº Orden:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {solicitudExitosa.requestNumber}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-700 pb-1">
                        <span className="text-zinc-500 font-sans">Cliente:</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {solicitudExitosa.customerName}
                        </span>
                      </div>
                      <div className="border-b border-zinc-200 dark:border-zinc-700 pb-1">
                        <span className="text-zinc-500 font-sans block mb-0.5">Productos:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {solicitudExitosa.itemsSummary}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-zinc-500 font-sans font-bold">Total:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          ${Number(solicitudExitosa.totalEstimated).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={reiniciarCompra}
                      className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
                    >
                      Continuar Comprando
                    </button>
                  </div>
                ) : cart.length === 0 ? (
                  /* 2. Carrito Vacío */
                  <div className="text-center py-16 px-4">
                    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 text-zinc-400">
                      🛒
                    </div>
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                      Tu carrito está vacío
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mb-6">
                      Explora nuestro catálogo y haz clic en &ldquo;Comprar&rdquo; en los repuestos o artículos que necesites.
                    </p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Explorar Productos
                    </button>
                  </div>
                ) : (
                  /* 3. Lista de Artículos + Formulario de Compra */
                  <div className="space-y-6">
                    {/* Lista de Productos Agregados */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Productos en la orden
                        </span>
                        <button
                          onClick={vaciarCarrito}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer"
                        >
                          Vaciar carrito
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {cart.map(({ product, quantity }) => {
                          const p =
                            typeof product.price === "number"
                              ? product.price
                              : parseFloat(product.price) || 0;
                          const subtotal = p * quantity;

                          return (
                            <div
                              key={product.id}
                              className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl"
                            >
                              {/* Miniatura */}
                              <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 p-1">
                                {product.photoUrl ? (
                                  <img
                                    src={product.photoUrl}
                                    alt={product.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-xl">📦</span>
                                )}
                              </div>

                              {/* Título y Precio Unitario */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                  {product.name}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                  <span>${p.toFixed(2)} c/u</span>
                                  {product.brand && (
                                    <>
                                      <span>•</span>
                                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                                        {product.brand}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Control de Cantidad */}
                              <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => modificarCantidad(product.id, -1)}
                                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-sm sm:text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                  title="Disminuir"
                                >
                                  -
                                </button>
                                <span className="w-8 sm:w-7 text-center text-xs font-bold text-zinc-900 dark:text-white">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => modificarCantidad(product.id, 1)}
                                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-sm sm:text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                  title="Aumentar"
                                >
                                  +
                                </button>
                              </div>

                              {/* Subtotal y Eliminar */}
                              <div className="text-right flex flex-col items-end shrink-0 pl-1">
                                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                                  ${subtotal.toFixed(2)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => eliminarProducto(product.id)}
                                  className="text-[11px] text-zinc-400 hover:text-red-500 transition-colors mt-0.5 cursor-pointer min-h-[36px] flex items-center"
                                  title="Eliminar"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resumen de Costos */}
                    <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Subtotal ({totalItemsCount} items):</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          ${totalMonto.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                        <span>Retiro / Entrega:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          En Tienda / A coordinar
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200/60 dark:border-blue-800/60 text-sm font-black text-zinc-900 dark:text-white">
                        <span>Total a Pagar:</span>
                        <span className="text-blue-600 dark:text-blue-400 text-base">
                          ${totalMonto.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Formulario de Datos para Despacho */}
                    <form onSubmit={handleConfirmarPedido} className="space-y-3.5 pt-1">
                      <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-200 dark:border-zinc-800">
                        <span className="text-sm">👤</span>
                        <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                          Datos de Contacto para Comprar
                        </h3>
                      </div>

                      {formError && (
                        <div className="p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium">
                          ⚠️ {formError}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Nombre Completo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Carlos Mendoza"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-2.5 h-11 text-base sm:text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Teléfono / WhatsApp <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="Ej. +58 412 1234567"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-3 py-2.5 h-11 text-base sm:text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Correo Electrónico (Opcional)
                          </label>
                          <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full px-3 py-2.5 h-11 text-base sm:text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Vehículo / Modelo (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Toyota Corolla 2018 1.8L"
                          value={vehicleInfo}
                          onChange={(e) => setVehicleInfo(e.target.value)}
                          className="w-full px-3 py-2.5 h-11 text-base sm:text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Dirección de Entrega o Nota Adicional (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Retiro por sucursal principal o envío a..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full p-3 text-base sm:text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Botón de Enviar Pedido */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={enviando}
                          className="w-full h-12 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {enviando ? (
                            <>
                              <span className="inline-block animate-spin">⚙️</span>
                              <span>Procesando Pedido...</span>
                            </>
                          ) : (
                            <>
                              <span>Comprar Ahora • ${totalMonto.toFixed(2)}</span>
                              <span>➔</span>
                            </>
                          )}
                        </button>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mt-2">
                          🔒 Se registrará directamente en nuestro sistema POS para su preparación.
                        </p>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <PublicMobileNav />
    </div>
  );
}
