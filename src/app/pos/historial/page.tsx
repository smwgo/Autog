"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface SaleItem {
  id: string;
  code: string;
  name: string;
  price: number | string;
  quantity: number;
  total: number | string;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: SaleItem[];
}

export default function HistorialVentasPage() {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ventaDetalle, setVentaDetalle] = useState<Sale | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState(false);

  const cargarVentas = useCallback(async (silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);
      const res = await fetch("/api/ventas");
      const data = await res.json();
      if (res.ok && data.success) {
        setVentas(data.ventas || []);
      }
    } catch (err) {
      console.error("Error al cargar ventas:", err);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarVentas();
    // Actualización en tiempo real cada 5 segundos
    const interval = setInterval(() => {
      cargarVentas(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [cargarVentas]);

  const handleAnularVenta = async (sale: Sale) => {
    if (!confirm(`¿Confirmas que deseas anular la venta ${sale.saleNumber}? Se reintegrará el stock de los productos.`)) {
      return;
    }

    try {
      setAccionEnCurso(true);
      const res = await fetch("/api/ventas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sale.id, status: "Anulada" }),
      });
      const data = await res.json();
      if (data.success) {
        if (ventaDetalle && ventaDetalle.id === sale.id) {
          setVentaDetalle({ ...ventaDetalle, status: "Anulada" });
        }
        await cargarVentas(true);
      } else {
        alert(data.error || "No se pudo anular la venta.");
      }
    } catch (e) {
      alert("Error al procesar la anulación.");
    } finally {
      setAccionEnCurso(false);
    }
  };

  const handleEliminarVenta = async (sale: Sale) => {
    if (!confirm(`¿Deseas eliminar permanentemente la venta ${sale.saleNumber}?`)) {
      return;
    }

    try {
      setAccionEnCurso(true);
      const res = await fetch(`/api/ventas?id=${sale.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setVentaDetalle(null);
        await cargarVentas(true);
      } else {
        alert(data.error || "No se pudo eliminar la venta.");
      }
    } catch (e) {
      alert("Error al eliminar la venta.");
    } finally {
      setAccionEnCurso(false);
    }
  };

  const filteredSales = ventas.filter((sale) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      sale.saleNumber.toLowerCase().includes(term) ||
      sale.customerName.toLowerCase().includes(term) ||
      sale.paymentMethod.toLowerCase().includes(term)
    );
  });

  const getStatusColor = (status: string) => {
    if (status === "Completada" || status === "Pagado")
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30";
    if (status === "Anulada" || status === "Devuelto")
      return "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30";
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/pos"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500 flex items-center gap-1.5 w-fit"
          >
            &larr; Volver a Punto de Venta
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl">
                🧾
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Historial
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/pos/venta"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
            >
              <span>+</span> Nueva Venta
            </Link>
          </div>
        </div>

        {/* Filters / Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Buscar por número de venta, cliente o método de pago..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:border-emerald-500 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3 text-zinc-400">🔍</span>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-6 py-4">N° Venta / Fecha</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Método de Pago</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {cargando && ventas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      Cargando historial...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      No se encontraron ventas.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const totalNum = parseFloat(sale.total.toString()) || 0;
                    const itemsCount = sale.items?.length || 0;
                    const dateFormatted = new Date(sale.createdAt).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr
                        key={sale.id}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {sale.saleNumber}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {dateFormatted}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                            <span>👤</span> {sale.customerName}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {sale.paymentMethod}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-black text-zinc-900 dark:text-white text-base">
                            ${totalNum.toFixed(2)}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {itemsCount} artículo(s)
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(
                              sale.status
                            )}`}
                          >
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setVentaDetalle(sale)}
                              className="text-xs font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Ver Recibo
                            </button>
                            {sale.status !== "Anulada" && (
                              <button
                                onClick={() => handleAnularVenta(sale)}
                                disabled={accionEnCurso}
                                title="Anular venta y reponer inventario"
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
            <span>Total: {filteredSales.length} ventas</span>
          </div>
        </div>
      </main>

      {/* MODAL: Ver Recibo / Detalle de Venta */}
      {ventaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧾</span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Detalle de Venta: {ventaDetalle.saleNumber}
                </h3>
              </div>
              <button
                onClick={() => setVentaDetalle(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-500">Cliente:</span>
                  <p className="font-bold text-zinc-900 dark:text-white">{ventaDetalle.customerName}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Método de Pago:</span>
                  <p className="font-bold text-zinc-900 dark:text-white">{ventaDetalle.paymentMethod}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Fecha y Hora:</span>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    {new Date(ventaDetalle.createdAt).toLocaleString("es-ES")}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Estado:</span>
                  <p
                    className={`font-bold ${
                      ventaDetalle.status === "Anulada" ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {ventaDetalle.status}
                  </p>
                </div>
              </div>

              <div>
                <p className="font-bold text-xs uppercase text-zinc-500 tracking-wider mb-2">Artículos Vendidos</p>
                <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-lg">
                  {ventaDetalle.items?.map((it) => (
                    <div key={it.id} className="p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-white">{it.name}</p>
                        <p className="text-zinc-400 font-mono">{it.code} • x{it.quantity}</p>
                      </div>
                      <p className="font-bold text-zinc-900 dark:text-white">
                        ${(parseFloat(it.price.toString()) * it.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal:</span>
                  <span>${parseFloat(ventaDetalle.subtotal.toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>IVA (16%):</span>
                  <span>${parseFloat(ventaDetalle.tax.toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-white pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Total Cobrado:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">
                    ${parseFloat(ventaDetalle.total.toString()).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <div className="flex items-center gap-2">
                {ventaDetalle.status !== "Anulada" && (
                  <button
                    onClick={() => handleAnularVenta(ventaDetalle)}
                    disabled={accionEnCurso}
                    className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Anular Venta
                  </button>
                )}
                <button
                  onClick={() => handleEliminarVenta(ventaDetalle)}
                  disabled={accionEnCurso}
                  className="px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 text-xs font-bold transition-colors cursor-pointer"
                >
                  Eliminar
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Imprimir
                </button>
                <button
                  onClick={() => setVentaDetalle(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
