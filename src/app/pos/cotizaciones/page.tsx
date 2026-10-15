"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface Product {
  id: string;
  code: string;
  name: string;
  category?: string;
  price: number;
  stock: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  identification?: string;
}

interface QuoteItem {
  id: string;
  productId: string;
  code: string;
  name: string;
  price: number;
  qty: number;
  discount: number;
}

export default function CotizacionesPage() {
  const [quoteNumber, setQuoteNumber] = useState(() => `COT-${Date.now().toString().slice(-6)}`);

  // Cliente
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [mostrarModalClientes, setMostrarModalClientes] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  // Catálogo de productos desde la base de datos
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Artículos de la cotización
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState<string | null>(null);

  // Vista de Historial de Cotizaciones
  const [vistaHistorial, setVistaHistorial] = useState(false);
  const [historialCotizaciones, setHistorialCotizaciones] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // 1. Cargar productos desde Neon
  const cargarProductos = async () => {
    try {
      setCargandoProductos(true);
      const res = await fetch("/api/productos");
      const data = await res.json();
      if (data.success && Array.isArray(data.productos)) {
        setProductos(
          data.productos.map((p: any) => ({
            id: p.id,
            code: p.code || "S/C",
            name: p.name,
            category: p.category || "General",
            price: parseFloat(p.price) || 0,
            stock: p.stock ?? 0,
          }))
        );
      }
    } catch (e) {
      console.error("Error al cargar productos:", e);
    } finally {
      setCargandoProductos(false);
    }
  };

  // 2. Cargar clientes desde Neon
  const cargarClientes = async () => {
    try {
      const res = await fetch("/api/clientes");
      const data = await res.json();
      if (data.success && Array.isArray(data.clientes)) {
        setClientes(data.clientes);
      }
    } catch (e) {
      console.error("Error al cargar clientes:", e);
    }
  };

  // 3. Cargar historial de cotizaciones desde Neon
  const cargarHistorial = async () => {
    try {
      setCargandoHistorial(true);
      const res = await fetch("/api/cotizaciones");
      const data = await res.json();
      if (data.success) {
        setHistorialCotizaciones(data.cotizaciones || []);
      }
    } catch (e) {
      console.error("Error al cargar historial:", e);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    cargarProductos();
    cargarClientes();
  }, []);

  useEffect(() => {
    if (vistaHistorial) {
      cargarHistorial();
    }
  }, [vistaHistorial]);

  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return clientes.slice(0, 10);
    const term = busquedaCliente.toLowerCase();
    return clientes.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.identification && c.identification.toLowerCase().includes(term))
    );
  }, [clientes, busquedaCliente]);

  const seleccionarCliente = (c: Customer) => {
    setClientName(c.name);
    setClientPhone(c.phone || "");
    setClientEmail(c.email || "");
    setMostrarModalClientes(false);
  };

  const productosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return productos.slice(0, 10);
    const term = searchTerm.toLowerCase();
    return productos.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
  }, [productos, searchTerm]);

  const addItem = (product: Product) => {
    setQuoteItems((prev) => {
      const index = prev.findIndex((i) => i.productId === product.id);
      if (index > -1) {
        const copy = [...prev];
        copy[index] = { ...copy[index], qty: copy[index].qty + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          code: product.code,
          name: product.name,
          price: product.price,
          qty: 1,
          discount: 0,
        },
      ];
    });
  };

  const removeItem = (id: string) => {
    setQuoteItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setQuoteItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty } : i))
    );
  };

  const updateDiscount = (id: string, discount: number) => {
    const val = Math.min(100, Math.max(0, discount || 0));
    setQuoteItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, discount: val } : i))
    );
  };

  // Cálculos financieros
  const subtotal = quoteItems.reduce((acc, i) => acc + i.price * i.qty, 0);
  const totalDescuento = quoteItems.reduce(
    (acc, i) => acc + i.price * i.qty * (i.discount / 100),
    0
  );
  const subtotalNeto = Math.max(0, subtotal - totalDescuento);
  const iva = subtotalNeto * 0.16;
  const granTotal = subtotalNeto + iva;

  // Guardar cotización real en Neon
  const handleGuardarCotizacion = async () => {
    if (quoteItems.length === 0) {
      alert("Agrega al menos un producto a la cotización.");
      return;
    }

    try {
      setGuardando(true);
      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: clientName || "Consumidor Final",
          customerPhone: clientPhone || null,
          customerEmail: clientEmail || null,
          items: quoteItems,
          total: granTotal,
          notes: `Folio: ${quoteNumber} | Subtotal: $${subtotal.toFixed(2)} | Descuento: $${totalDescuento.toFixed(2)} | IVA: $${iva.toFixed(2)}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGuardadoExitoso(data.folio || quoteNumber);
        setQuoteNumber(`COT-${Date.now().toString().slice(-6)}`);
      } else {
        alert(data.error || "No se pudo guardar la cotización.");
      }
    } catch (e) {
      alert("Error al guardar en el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCotizacion = async (id: string) => {
    if (!confirm("¿Deseas eliminar esta cotización?")) return;
    try {
      const res = await fetch(`/api/cotizaciones?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        cargarHistorial();
      }
    } catch (e) {
      alert("Error al eliminar.");
    }
  };

  const nuevaCotizacionReset = () => {
    setQuoteItems([]);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setGuardadoExitoso(null);
    setQuoteNumber(`COT-${Date.now().toString().slice(-6)}`);
    setVistaHistorial(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/pos"
              title="Volver a POS"
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-purple-600 hover:border-purple-500 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl shrink-0">
              📝
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Cotizaciones
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVistaHistorial(!vistaHistorial)}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              {vistaHistorial ? "Nueva Cotización" : "Cotizaciones"}
            </button>

            {!vistaHistorial && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-500">Folio:</span>
                <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-3.5 py-1.5 rounded-xl">
                  {quoteNumber}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notificación de Guardado */}
        {guardadoExitoso && !vistaHistorial && (
          <div className="mb-8 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                  Cotización guardada exitosamente
                </h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Comprobante: <span className="font-mono font-bold">{guardadoExitoso}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 cursor-pointer"
              >
                Imprimir
              </button>
              <button
                onClick={nuevaCotizacionReset}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm rounded-xl hover:bg-zinc-300 cursor-pointer"
              >
                Nueva
              </button>
            </div>
          </div>
        )}

        {/* VISTA 1: Historial de Cotizaciones */}
        {vistaHistorial ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
              Cotizaciones
            </h3>
            {cargandoHistorial ? (
              <p className="text-center py-12 text-zinc-500 font-medium">Cargando...</p>
            ) : historialCotizaciones.length === 0 ? (
              <p className="text-center py-12 text-zinc-500 font-medium">
                No hay cotizaciones registradas todavía.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="pb-3.5 px-4">Folio</th>
                      <th className="pb-3.5 px-4">Cliente</th>
                      <th className="pb-3.5 px-4">Artículos</th>
                      <th className="pb-3.5 px-4 text-right">Total</th>
                      <th className="pb-3.5 px-4 text-right">Fecha</th>
                      <th className="pb-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                    {historialCotizaciones.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        <td className="py-4 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                          {item.requestNumber}
                        </td>
                        <td className="py-4 px-4 font-semibold text-zinc-900 dark:text-white">
                          {item.customerName}
                        </td>
                        <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                          {item.itemsSummary}
                        </td>
                        <td className="py-4 px-4 text-right font-black text-zinc-900 dark:text-white">
                          ${Number(item.totalEstimated).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right text-xs text-zinc-500">
                          {new Date(item.createdAt).toLocaleDateString("es-ES")}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleEliminarCotizacion(item.id)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* VISTA 2: Formulario Principal de Cotización */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Client Data + Products Catalog */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Card: Datos del Cliente */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👤</span>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      Datos del Cliente
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarModalClientes(true)}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                  >
                    Buscar Cliente
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                      Nombre o Empresa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez / Empresa S.A."
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-purple-500 transition-all"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        placeholder="+52 123 456 7890"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-purple-500 transition-all"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-purple-500 transition-all"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Catálogo de Productos */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      Agregar Artículos
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {productos.length} en almacén
                  </span>
                </div>

                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-purple-500 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="absolute left-4 top-3.5 text-zinc-400 text-xl">
                    🔍
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {cargandoProductos ? (
                    <p className="text-center py-10 text-sm text-zinc-400 font-medium">
                      Cargando catálogo...
                    </p>
                  ) : productosFiltrados.length === 0 ? (
                    <p className="text-center py-10 text-sm text-zinc-400 font-medium">
                      No se encontraron artículos.
                    </p>
                  ) : (
                    productosFiltrados.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-purple-400 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            {item.code} • Stock: {item.stock}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
                            ${item.price.toFixed(2)}
                          </span>
                          <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-purple-600 group-hover:text-white text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-lg font-bold transition-colors">
                            +
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Detalle de la Cotización */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[620px]">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📄</span>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      Detalle de la Cotización
                    </h3>
                  </div>
                  <span className="text-sm font-semibold text-zinc-500 font-mono">
                    {quoteItems.length} artículo(s)
                  </span>
                </div>

                {/* Items Table */}
                <div className="flex-grow p-6 overflow-y-auto">
                  {quoteItems.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-400 text-center space-y-3">
                      <span className="text-5xl opacity-40">🛒</span>
                      <p className="text-base font-medium">
                        Agrega productos desde el buscador para armar la cotización.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-xs font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3 uppercase tracking-wider">
                            <th className="pb-3">Artículo</th>
                            <th className="pb-3 text-center w-28">Cant.</th>
                            <th className="pb-3 text-right w-24">Precio</th>
                            <th className="pb-3 text-center w-24">Desc (%)</th>
                            <th className="pb-3 text-right w-28">Total</th>
                            <th className="pb-3 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
                          {quoteItems.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              <td className="py-4 pr-3">
                                <p className="font-bold text-zinc-900 dark:text-white text-sm">
                                  {item.name}
                                </p>
                                <p className="text-xs text-zinc-400 font-mono">
                                  {item.code}
                                </p>
                              </td>
                              <td className="py-4 text-center">
                                <div className="inline-flex items-center border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, item.qty - 1)}
                                    className="px-2.5 py-1.5 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-3 text-sm font-bold min-w-[28px] text-center">
                                    {item.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, item.qty + 1)}
                                    className="px-2.5 py-1.5 text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-4 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                ${item.price.toFixed(2)}
                              </td>
                              <td className="py-4 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-16 text-center py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-bold focus:outline-none focus:border-purple-500"
                                  value={item.discount}
                                  onChange={(e) =>
                                    updateDiscount(item.id, parseInt(e.target.value) || 0)
                                  }
                                />
                              </td>
                              <td className="py-4 text-right font-black text-zinc-900 dark:text-white text-sm">
                                $
                                {(
                                  item.price *
                                  item.qty *
                                  (1 - item.discount / 100)
                                ).toFixed(2)}
                              </td>
                              <td className="py-4 text-right pl-2">
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="text-zinc-400 hover:text-rose-500 transition-colors p-1 text-base cursor-pointer"
                                  title="Quitar"
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

                {/* Totales y Botones de Acción */}
                <div className="p-6 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
                  <div className="w-full sm:w-72 ml-auto space-y-2 text-sm mb-6">
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400 font-medium">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {totalDescuento > 0 && (
                      <div className="flex justify-between text-purple-600 dark:text-purple-400 font-bold">
                        <span>Descuento:</span>
                        <span>-${totalDescuento.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-600 dark:text-zinc-400 font-medium">
                      <span>IVA (16%):</span>
                      <span>${iva.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex justify-between items-center text-base font-bold text-zinc-900 dark:text-white">
                      <span>Gran Total:</span>
                      <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        ${granTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => window.print()}
                      disabled={quoteItems.length === 0}
                      className="flex-1 py-4 px-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-bold text-base text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <span>🖨️</span> Imprimir
                    </button>
                    <button
                      onClick={handleGuardarCotizacion}
                      disabled={quoteItems.length === 0 || guardando}
                      className="flex-1 py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 font-bold text-base text-white transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-98"
                    >
                      <span>💾</span> {guardando ? "Guardando..." : "Guardar Cotización"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Búsqueda de Clientes Registrados */}
      {mostrarModalClientes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-normal text-zinc-900 dark:text-white flex items-center gap-2">
                <span>👥</span> Seleccionar Cliente Registrado
              </h3>
              <button
                onClick={() => setMostrarModalClientes(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o identificación..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:border-purple-500 dark:text-white"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                autoFocus
              />
              <span className="absolute left-3.5 top-3 text-zinc-400">🔍</span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {clientesFiltrados.length === 0 ? (
                <p className="text-center py-8 text-sm text-zinc-400 font-medium">
                  No se encontraron clientes registrados.
                </p>
              ) : (
                clientesFiltrados.map((cli) => (
                  <div
                    key={cli.id}
                    onClick={() => seleccionarCliente(cli)}
                    className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {cli.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {cli.phone ? `📞 ${cli.phone} • ` : ""}{cli.email || "Sin correo"}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:underline">
                      Seleccionar
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
