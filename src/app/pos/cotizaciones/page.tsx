"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

interface Product {
  id: string;
  code: string;
  name: string;
  category?: string;
  price: number;
  stock: number;
  isService?: boolean;
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

  // Catálogo de productos y servicios desde Neon
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "PRODUCTOS" | "SERVICIOS">("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  // Artículos de la cotización
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState<string | null>(null);

  // Vista de Historial de Cotizaciones
  const [vistaHistorial, setVistaHistorial] = useState(false);
  const [historialCotizaciones, setHistorialCotizaciones] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Confirmación de eliminación con modal de textos cortos
  const [cotizacionAEliminar, setCotizacionAEliminar] = useState<{ id: string; folio: string; total: number } | null>(null);
  const [eliminandoCotizacion, setEliminandoCotizacion] = useState(false);

  // 1. Cargar productos y servicios desde Neon
  const cargarProductos = async () => {
    try {
      setCargandoProductos(true);
      const [resProd, resServ] = await Promise.all([
        fetch("/api/productos"),
        fetch("/api/servicios-taller?activos=true"),
      ]);

      let items: Product[] = [];

      if (resProd.ok) {
        const dProd = await resProd.json();
        if (dProd.success && Array.isArray(dProd.productos)) {
          items = [
            ...items,
            ...dProd.productos.map((p: any) => ({
              id: p.id,
              code: p.code || "PRD",
              name: p.name,
              category: p.category || "Productos",
              price: parseFloat(p.price) || 0,
              stock: p.stock ?? 0,
              isService: false,
            })),
          ];
        }
      }

      if (resServ.ok) {
        const dServ = await resServ.json();
        if (dServ.success && Array.isArray(dServ.servicios)) {
          items = [
            ...items,
            ...dServ.servicios.map((s: any) => ({
              id: s.id,
              code: s.code || "SRV",
              name: s.name,
              category: s.category || "Servicios",
              price: parseFloat(s.price) || 0,
              stock: 999,
              isService: true,
            })),
          ];
        }
      }

      setProductos(items);
    } catch (e) {
      console.error("Error al cargar productos y servicios:", e);
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
    cargarHistorial();
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
    let lista = productos;
    if (filtroTipo === "PRODUCTOS") {
      lista = lista.filter((p) => !p.isService);
    } else if (filtroTipo === "SERVICIOS") {
      lista = lista.filter((p) => p.isService);
    }

    if (!searchTerm.trim()) return lista.slice(0, 15);
    const term = searchTerm.toLowerCase();
    return lista.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
  }, [productos, filtroTipo, searchTerm]);

  const addItem = (product: Product) => {
    setQuoteItems((prev) => {
      const index = prev.findIndex((i) => i.productId === product.id);
      if (index > -1) {
        const copy = [...prev];
        const currentQty = Number(copy[index].qty) || 0;
        copy[index] = {
          ...copy[index],
          qty: currentQty + 1,
          price: Number(copy[index].price) || Number(product.price) || 0,
          discount: Number(copy[index].discount) || 0,
        };
        return copy;
      }
      return [
        ...prev,
        {
          id: `${product.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          productId: product.id,
          code: product.code || "PRD",
          name: product.name || "Artículo",
          price: Number(product.price) || 0,
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
    const val = Number(qty);
    if (isNaN(val) || val <= 0) {
      removeItem(id);
      return;
    }
    setQuoteItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: val } : i))
    );
  };

  const updateDiscount = (id: string, discount: number) => {
    const num = Number(discount);
    const val = isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
    setQuoteItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, discount: val } : i))
    );
  };

  // Cálculos financieros protegidos contra NaN
  const subtotal = quoteItems.reduce((acc, i) => {
    const p = Number(i.price) || 0;
    const q = Number(i.qty) || 0;
    return acc + p * q;
  }, 0);

  const totalDescuento = quoteItems.reduce((acc, i) => {
    const p = Number(i.price) || 0;
    const q = Number(i.qty) || 0;
    const d = Math.min(100, Math.max(0, Number(i.discount) || 0));
    return acc + p * q * (d / 100);
  }, 0);

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

  const confirmarEliminarCotizacion = async () => {
    if (!cotizacionAEliminar) return;
    try {
      setEliminandoCotizacion(true);
      const res = await fetch(`/api/cotizaciones?id=${cotizacionAEliminar.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCotizacionAEliminar(null);
        cargarHistorial();
      } else {
        alert(data.error || "Error al eliminar.");
      }
    } catch (e) {
      alert("Error al eliminar.");
    } finally {
      setEliminandoCotizacion(false);
    }
  };

  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const handleCargarParaEditar = (item: any) => {
    setEditingQuoteId(item.id);
    setQuoteNumber(item.requestNumber || `COT-${Date.now().toString().slice(-6)}`);
    setClientName(item.customerName || "");
    setClientPhone(item.customerPhone || "");
    setClientEmail(item.customerEmail || "");
    try {
      const parsed = item.itemsJson ? JSON.parse(item.itemsJson) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized: QuoteItem[] = parsed.map((it: any, idx: number) => ({
          id: it.id ? String(it.id) : `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          productId: it.productId || it.id || `prd-${idx}`,
          code: it.code || "ART",
          name: it.name || "Artículo",
          price: Number(it.price) || 0,
          qty: Math.max(1, Number(it.qty ?? it.quantity) || 1),
          discount: Math.min(100, Math.max(0, Number(it.discount ?? it.discountPercent) || 0)),
        }));
        setQuoteItems(sanitized);
      } else {
        setQuoteItems([]);
      }
    } catch {
      setQuoteItems([]);
    }
    setVistaHistorial(false);
  };

  const handleActualizarCotizacionExistente = async () => {
    if (!editingQuoteId || quoteItems.length === 0) return;
    try {
      setGuardando(true);
      const res = await fetch("/api/cotizaciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingQuoteId,
          customerName: clientName || "Consumidor Final",
          customerPhone: clientPhone || null,
          customerEmail: clientEmail || null,
          items: quoteItems,
          total: granTotal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGuardadoExitoso(quoteNumber);
        setEditingQuoteId(null);
      } else {
        alert(data.error || "Error al actualizar cotización.");
      }
    } catch {
      alert("Error al actualizar la cotización.");
    } finally {
      setGuardando(false);
    }
  };

  const nuevaCotizacionReset = () => {
    setEditingQuoteId(null);
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

      <main className="flex-grow p-4 sm:p-6 md:p-12 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/pos"
              title="Volver a Panel POS"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Cotizaciones
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              {historialCotizaciones.length}
            </span>
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
              <p className="text-center py-12 text-zinc-500 font-medium">Cargando cotizaciones...</p>
            ) : historialCotizaciones.length === 0 ? (
              <p className="text-center py-12 text-zinc-500 font-medium">
                No hay cotizaciones registradas todavía.
              </p>
            ) : (
              <>
                {/* Mobile Cards (md:hidden) adaptadas con orden idéntico a facturas */}
                <div className="md:hidden space-y-3.5">
                  {historialCotizaciones.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Icono de cotización estilo factura */}
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30">
                            📋
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {item.customerName || "Consumidor Final"}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                              <span className="font-semibold text-purple-600 dark:text-purple-400">#{item.requestNumber}</span>
                            </p>
                          </div>
                        </div>

                        {/* Acciones Rápidas (Toque táctil >= 44px) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCargarParaEditar(item)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-purple-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-purple-50 dark:hover:bg-purple-500/10 active:scale-95 transition-all cursor-pointer"
                            title="Editar cotización"
                            aria-label="Editar cotización"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCotizacionAEliminar({ id: item.id, folio: item.requestNumber, total: Number(item.totalEstimated || 0) })}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                            title="Eliminar cotización"
                            aria-label="Eliminar cotización"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {item.itemsSummary && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                          {item.itemsSummary}
                        </p>
                      )}

                      {/* Datos secundarios (Total y Fecha) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 font-bold font-mono text-xs">
                          💰 ${Number(item.totalEstimated).toFixed(2)}
                        </span>

                        <span className="text-zinc-400 ml-auto text-[11px] whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (hidden md:block) */}
                <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-3.5 px-4">Folio</th>
                          <th className="py-3.5 px-4">Cliente</th>
                          <th className="py-3.5 px-4">Artículos</th>
                          <th className="py-3.5 px-4 text-right">Total</th>
                          <th className="py-3.5 px-4 text-right">Fecha</th>
                          <th className="py-3.5 px-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {historialCotizaciones.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                              {item.requestNumber}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-white">
                              {item.customerName}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                              {item.itemsSummary}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-white">
                              ${Number(item.totalEstimated).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-xs text-zinc-500 whitespace-nowrap">
                              {new Date(item.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                <button
                                  onClick={() => handleCargarParaEditar(item)}
                                  className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                  title="Editar cotización"
                                  aria-label="Editar cotización"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setCotizacionAEliminar({ id: item.id, folio: item.requestNumber, total: Number(item.totalEstimated || 0) })}
                                  className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                  title="Eliminar cotización"
                                  aria-label="Eliminar cotización"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
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
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 transition-all"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 transition-all"
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
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500 transition-all"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Catálogo de Productos y Servicios */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      Agregar Artículos
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-mono">
                    {productos.length} disponibles
                  </span>
                </div>

                {/* Filtros Tipo: Todos, Productos, Servicios */}
                <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setFiltroTipo("TODOS")}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                      filtroTipo === "TODOS"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipo("PRODUCTOS")}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                      filtroTipo === "PRODUCTOS"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    📦 Productos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipo("SERVICIOS")}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                      filtroTipo === "SERVICIOS"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    🔧 Servicios
                  </button>
                </div>

                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Buscar producto o servicio por nombre o código..."
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
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                              {item.name}
                            </p>
                            {item.isService && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                Servicio
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            {item.code} {item.isService ? "• Mano de obra / Taller" : `• Stock: ${item.stock}`}
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
                        {quoteItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-16 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                              Sin artículos agregados
                            </td>
                          </tr>
                        ) : (
                          quoteItems.map((item, idx) => {
                            const itemPrice = Number(item.price) || 0;
                            const itemQty = Number(item.qty) || 1;
                            const itemDiscount = Math.min(100, Math.max(0, Number(item.discount) || 0));
                            const itemTotal = itemPrice * itemQty * (1 - itemDiscount / 100);

                            return (
                              <tr
                                key={item.id ? `${item.id}-${idx}` : `quote-row-${idx}`}
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
                                      onClick={() => updateQuantity(item.id, itemQty - 1)}
                                      className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-base font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 text-sm font-bold min-w-[28px] text-center">
                                      {itemQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateQuantity(item.id, itemQty + 1)}
                                      className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-base font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="py-4 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                  ${itemPrice.toFixed(2)}
                                </td>
                                <td className="py-4 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-16 h-9 sm:h-8 text-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-bold focus:outline-none focus:border-purple-500"
                                    value={item.discount === 0 ? "0" : (item.discount ?? 0)}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const val = raw === "" ? 0 : parseFloat(raw);
                                      updateDiscount(item.id, isNaN(val) ? 0 : val);
                                    }}
                                  />
                                </td>
                                <td className="py-4 text-right font-black text-zinc-900 dark:text-white text-sm">
                                  ${itemTotal.toFixed(2)}
                                </td>
                                <td className="py-4 text-right pl-2">
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-base cursor-pointer"
                                    title="Quitar"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      </table>
                    </div>
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
                      onClick={editingQuoteId ? handleActualizarCotizacionExistente : handleGuardarCotizacion}
                      disabled={quoteItems.length === 0 || guardando}
                      className="flex-1 py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 font-bold text-base text-white transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-98"
                    >
                      <span>💾</span> {guardando ? "Guardando..." : editingQuoteId ? "Actualizar Cotización" : "Guardar Cotización"}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>👥</span> Seleccionar Cliente Registrado
              </h3>
              <button
                onClick={() => setMostrarModalClientes(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative mb-4 shrink-0">
              <input
                type="text"
                placeholder="Buscar por nombre, WhatsApp o identificación..."
                className="w-full pl-10 pr-4 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm focus:outline-none focus:border-purple-500 dark:text-white"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                autoFocus
              />
              <span className="absolute left-3.5 top-2.5 text-zinc-400">🔍</span>
            </div>

            <div className="overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 flex-grow pr-1">
              {clientesFiltrados.length === 0 ? (
                <p className="text-center py-8 text-sm text-zinc-400 font-medium">
                  No se encontraron clientes registrados.
                </p>
              ) : (
                clientesFiltrados.map((cli) => (
                  <div
                    key={cli.id}
                    onClick={() => seleccionarCliente(cli)}
                    className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors flex justify-between items-center group min-h-[52px]"
                  >
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {cli.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {cli.phone ? `📞 ${cli.phone} • ` : ""}{cli.email || "Sin correo"}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:underline px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40">
                      Seleccionar
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación con Textos Cortos */}
      {cotizacionAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  ¿Eliminar cotización?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800 text-xs flex justify-between items-center">
              <span className="font-mono text-zinc-600 dark:text-zinc-400 font-bold">{cotizacionAEliminar.folio}</span>
              <span className="font-bold text-zinc-900 dark:text-white">${cotizacionAEliminar.total.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCotizacionAEliminar(null)}
                disabled={eliminandoCotizacion}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminarCotizacion}
                disabled={eliminandoCotizacion}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-rose-500/20 active:scale-95"
              >
                {eliminandoCotizacion ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Bar */}
      <PosMobileNav />
    </div>
  );
}
