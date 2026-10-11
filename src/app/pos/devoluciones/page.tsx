"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface SaleItem {
  id: string;
  productId?: string;
  code?: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface SaleData {
  id: string;
  saleNumber: string;
  customerName?: string;
  total: number;
  createdAt: string;
  items: SaleItem[];
}

export default function DevolucionesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState<SaleData | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"Nota de Crédito" | "Efectivo">("Nota de Crédito");
  const [completedNote, setCompletedNote] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Historial de devoluciones
  const [viewHistory, setViewHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/devoluciones");
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.devoluciones || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (viewHistory) {
      fetchHistory();
    }
  }, [viewHistory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setInvoice(null);
    setSelectedItemIds([]);
    setCompletedNote(null);

    try {
      const res = await fetch(`/api/devoluciones?invoiceNumber=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (data.success && data.sale) {
        setInvoice({
          id: data.sale.id,
          saleNumber: data.sale.saleNumber,
          customerName: data.sale.customerName || (data.sale.customer ? `${data.sale.customer.name} ${data.sale.customer.lastName || ""}` : "Consumidor Final"),
          total: Number(data.sale.total),
          createdAt: new Date(data.sale.createdAt).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          items: (data.sale.items || []).map((it: any) => ({
            id: it.id,
            productId: it.productId,
            code: it.code || "",
            name: it.name,
            price: Number(it.price),
            quantity: Number(it.quantity),
            total: Number(it.total),
          })),
        });
      } else {
        setErrorMsg(data.error || "Factura no encontrada.");
      }
    } catch (err: any) {
      setErrorMsg("Error al consultar la factura.");
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getRefundAmount = () => {
    if (!invoice) return 0;
    return invoice.items
      .filter((item) => selectedItemIds.includes(item.id))
      .reduce((acc, item) => acc + item.price * item.quantity, 0);
  };

  const handleProcesarDevolucion = async () => {
    if (!invoice || selectedItemIds.length === 0 || !returnReason) return;

    const itemsToReturn = invoice.items.filter((it) => selectedItemIds.includes(it.id));
    const refundTotal = getRefundAmount();

    try {
      setProcessing(true);
      setErrorMsg(null);

      const res = await fetch("/api/devoluciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: invoice.id,
          saleNumber: invoice.saleNumber,
          customerName: invoice.customerName,
          items: itemsToReturn,
          reason: returnReason,
          refundMethod,
          refundTotal,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCompletedNote(data.noteNumber);
        setInvoice(null);
        setSelectedItemIds([]);
        setReturnReason("");
        setSearchQuery("");
      } else {
        setErrorMsg(data.error || "Error al procesar la devolución.");
      }
    } catch (err: any) {
      setErrorMsg("Error de conexión al procesar.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/pos"
            className="text-sm font-medium text-rose-600 hover:text-rose-500 flex items-center gap-1 w-fit"
          >
            &larr; Volver a Punto de Venta
          </Link>
          <button
            onClick={() => setViewHistory(!viewHistory)}
            className="text-sm font-bold px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            {viewHistory ? "Nueva Devolución" : "Ver Historial"}
          </button>
        </div>

        {/* Header Section */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-2xl text-rose-600">
            🔄
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Devoluciones
          </h1>
        </div>

        {/* Modal / Card Devolución Exitosa */}
        {completedNote && (
          <div className="mb-8 p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-3xl">✅</span>
              <div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                  Devolución Registrada Exitosamente
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Comprobante generado:{" "}
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">
                    {completedNote}
                  </span>{" "}
                  • El inventario fue actualizado.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCompletedNote(null)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
            >
              Aceptar
            </button>
          </div>
        )}

        {/* Vista de Historial */}
        {viewHistory ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
              Historial de Devoluciones
            </h3>
            {loadingHistory ? (
              <p className="text-center py-10 text-zinc-500">Cargando...</p>
            ) : historyList.length === 0 ? (
              <p className="text-center py-10 text-zinc-500">No hay devoluciones registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                    <tr>
                      <th className="pb-3">Comprobante</th>
                      <th className="pb-3">Referencia / Cliente</th>
                      <th className="pb-3">Artículos</th>
                      <th className="pb-3 text-right">Total</th>
                      <th className="pb-3 text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {historyList.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        <td className="py-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                          {item.requestNumber}
                        </td>
                        <td className="py-3 text-zinc-800 dark:text-zinc-200">{item.customerName}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">{item.itemsSummary}</td>
                        <td className="py-3 text-right font-bold text-zinc-900 dark:text-white">
                          ${Number(item.totalEstimated).toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-xs text-zinc-500">
                          {new Date(item.createdAt).toLocaleDateString("es-ES")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Search & Invoice Details */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Search Box */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                  Buscar Factura Original
                </h3>
                <form onSubmit={handleSearch} className="flex gap-4">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="Número de factura o recibo (ej: VEN-182505)..."
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all dark:text-white font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="absolute left-4 top-4 text-zinc-400 text-xl">🧾</span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 px-8 py-3.5 rounded-2xl font-bold transition-colors disabled:opacity-50"
                  >
                    {loading ? "Buscando..." : "Buscar"}
                  </button>
                </form>

                {errorMsg && (
                  <p className="mt-3 text-sm font-semibold text-rose-500">{errorMsg}</p>
                )}
              </div>

              {/* Invoice Results */}
              {invoice ? (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-rose-50/50 dark:bg-rose-500/5 flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                        Factura Encontrada
                      </h3>
                      <p className="text-sm font-mono text-rose-600 dark:text-rose-400 font-bold">
                        {invoice.saleNumber}
                      </p>
                    </div>
                    <div className="text-right text-sm text-zinc-500 dark:text-zinc-400">
                      <p>Fecha: {invoice.createdAt}</p>
                      <p>Cliente: {invoice.customerName}</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">
                      Selecciona los artículos a devolver:
                    </p>
                    <div className="space-y-3">
                      {invoice.items.map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                            selectedItemIds.includes(item.id)
                              ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              className="w-5 h-5 accent-rose-500 cursor-pointer"
                              checked={selectedItemIds.includes(item.id)}
                              onChange={() => toggleItemSelection(item.id)}
                            />
                          </div>
                          <div className="flex-grow">
                            <p className="font-bold text-zinc-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                              {item.code ? `Cód: ${item.code} • ` : ""}Cantidad: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-900 dark:text-white">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 border-dashed p-12 text-center text-zinc-500 dark:text-zinc-400">
                  <span className="text-4xl mb-3 block opacity-50">🔍</span>
                  <p className="text-sm font-medium">Busca una factura para iniciar la devolución.</p>
                </div>
              )}
            </div>

            {/* Right Column: Processing & Summary */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div
                className={`bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col h-full transition-opacity ${
                  !invoice ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
                  Detalles del Reembolso
                </h3>

                <div className="space-y-6 flex-grow">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                      Motivo de la Devolución
                    </label>
                    <select
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-rose-500 dark:text-white font-medium"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    >
                      <option value="">Seleccione un motivo...</option>
                      <option value="defectuoso">Producto Defectuoso</option>
                      <option value="equivocado">Producto Equivocado</option>
                      <option value="arrepentimiento">El cliente ya no lo necesita</option>
                      <option value="garantia">Garantía</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                      Método de Reembolso
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRefundMethod("Nota de Crédito")}
                        className={`py-3 px-4 border-2 rounded-xl font-bold text-sm transition-colors ${
                          refundMethod === "Nota de Crédito"
                            ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                        }`}
                      >
                        Nota de Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefundMethod("Efectivo")}
                        className={`py-3 px-4 border-2 rounded-xl font-bold text-sm transition-colors ${
                          refundMethod === "Efectivo"
                            ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                        }`}
                      >
                        Efectivo
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      * Se recomienda emitir Nota de Crédito para compras de mostrador.
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-lg text-zinc-600 dark:text-zinc-400 font-medium">
                      Total a Reembolsar
                    </span>
                    <span className="text-4xl font-black text-rose-600 dark:text-rose-400">
                      ${getRefundAmount().toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleProcesarDevolucion}
                    disabled={selectedItemIds.length === 0 || !returnReason || processing}
                    className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>🔄</span> {processing ? "Procesando..." : "Procesar Devolución"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
