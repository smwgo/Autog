"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para simular una factura encontrada
const MOCK_INVOICE = {
  id: 'FAC-2023-0899',
  date: '08 Oct 2023',
  client: 'María Gómez',
  total: 53.00,
  items: [
    { id: 'PROD-003', name: 'Pastillas de Freno (Delanteras)', price: 45.00, qty: 1, returnable: true },
    { id: 'PROD-002', name: 'Filtro de Aceite', price: 8.00, qty: 1, returnable: true },
  ]
};

export default function DevolucionesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [invoice, setInvoice] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [returnReason, setReturnReason] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Simula la búsqueda
    if (searchQuery.toUpperCase() === 'FAC-2023-0899' || searchQuery === '899') {
      setInvoice(MOCK_INVOICE);
      setSelectedItems([]);
    } else {
      setInvoice(null);
      alert("Factura no encontrada. Intenta con '899'.");
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getRefundAmount = () => {
    if (!invoice) return 0;
    return invoice.items
      .filter((item: any) => selectedItems.includes(item.id))
      .reduce((acc: number, item: any) => acc + (item.price * item.qty), 0);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/pos" className="text-sm font-medium text-rose-600 hover:text-rose-500 flex items-center gap-1 w-fit">
            &larr; Volver a Punto de Venta
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-rose-500 bg-opacity-10 flex items-center justify-center text-2xl">
                🔄
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Devoluciones
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Gestión de notas de crédito y cambios de productos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Search & Invoice Details */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Search Box */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Buscar Factura Original</h3>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="relative flex-grow">
                  <input 
                    type="text" 
                    placeholder="Número de factura o recibo..." 
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all dark:text-white font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className="absolute left-4 top-4 text-zinc-400 text-xl">🧾</span>
                </div>
                <button type="submit" className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 px-8 py-3.5 rounded-2xl font-bold transition-colors">
                  Buscar
                </button>
              </form>
            </div>

            {/* Invoice Results */}
            {invoice ? (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-rose-50/50 dark:bg-rose-500/5 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-1">
                      Factura Encontrada
                    </h3>
                    <p className="text-sm font-mono text-rose-600 dark:text-rose-400 font-bold">{invoice.id}</p>
                  </div>
                  <div className="text-right text-sm text-zinc-500 dark:text-zinc-400">
                    <p>Fecha: {invoice.date}</p>
                    <p>Cliente: {invoice.client}</p>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">Selecciona los artículos a devolver:</p>
                  <div className="space-y-3">
                    {invoice.items.map((item: any) => (
                      <label 
                        key={item.id} 
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${selectedItems.includes(item.id) ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                      >
                        <div className="flex-shrink-0">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-rose-500 cursor-pointer"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                          />
                        </div>
                        <div className="flex-grow">
                          <p className="font-bold text-zinc-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{item.id} • Cantidad: {item.qty}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-zinc-900 dark:text-white">${item.price.toFixed(2)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 border-dashed p-12 text-center text-zinc-500 dark:text-zinc-400">
                <span className="text-4xl mb-4 block opacity-50">🔍</span>
                <p>Ingresa el número de factura para ver los artículos y procesar la devolución.</p>
                <p className="text-sm mt-2 opacity-70">Puedes probar buscando "899"</p>
              </div>
            )}

          </div>

          {/* Right Column: Processing & Summary */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <div className={`bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col h-full transition-opacity ${!invoice ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Detalles del Reembolso</h3>
              
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
                    <button className="py-3 px-4 border-2 border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl font-bold text-sm">
                      Nota de Crédito
                    </button>
                    <button className="py-3 px-4 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-sm hover:border-zinc-300">
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
                  <span className="text-lg text-zinc-600 dark:text-zinc-400 font-medium">Total a Reembolsar</span>
                  <span className="text-4xl font-black text-rose-600 dark:text-rose-400">
                    ${getRefundAmount().toFixed(2)}
                  </span>
                </div>

                <button 
                  disabled={selectedItems.length === 0 || !returnReason}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-2xl transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>🔄</span> Procesar Devolución
                </button>
              </div>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
