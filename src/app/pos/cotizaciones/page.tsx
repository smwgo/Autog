"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para el catálogo en cotizaciones
const INVENTORY = [
  { id: 'PROD-001', name: 'Aceite Sintético 5W-30', price: 15.50, stock: 24 },
  { id: 'PROD-002', name: 'Filtro de Aceite', price: 8.00, stock: 45 },
  { id: 'PROD-003', name: 'Pastillas de Freno (Delanteras)', price: 45.00, stock: 12 },
  { id: 'PROD-004', name: 'Batería 12V 65Ah', price: 110.00, stock: 5 },
  { id: 'PROD-008', name: 'Líquido Limpiaparabrisas', price: 4.50, stock: 30 },
];

export default function CotizacionesPage() {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [quoteItems, setQuoteItems] = useState<{product: any, qty: number, discount: number}[]>([]);

  const filteredInventory = INVENTORY.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = (product: any) => {
    setQuoteItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1, discount: 0 }];
    });
  };

  const removeItem = (id: string) => {
    setQuoteItems(prev => prev.filter(item => item.product.id !== id));
  };

  const updateItem = (id: string, field: 'qty' | 'discount', value: number) => {
    setQuoteItems(prev => prev.map(item => {
      if (item.product.id === id) {
        return { ...item, [field]: value >= 0 ? value : 0 };
      }
      return item;
    }));
  };

  const subtotal = quoteItems.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const totalDiscount = quoteItems.reduce((acc, item) => acc + ((item.product.price * item.qty) * (item.discount / 100)), 0);
  const subtotalAfterDiscount = subtotal - totalDiscount;
  const tax = subtotalAfterDiscount * 0.16;
  const total = subtotalAfterDiscount + tax;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/pos" className="text-sm font-medium text-purple-600 hover:text-purple-500 flex items-center gap-1 w-fit">
            &larr; Volver a Punto de Venta
          </Link>
          <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
            PROFORMA N°: <span className="text-purple-600 dark:text-purple-400">COT-2023-145</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-10 flex items-center justify-center text-2xl">
            📝
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Nueva Cotización
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Creación rápida de proformas para clientes en mostrador.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Client Data & Search */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Client Info */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span>👤</span> Datos del Cliente
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Nombre Completo / Empresa</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Juan Pérez" 
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Teléfono</label>
                    <input 
                      type="tel" 
                      placeholder="+52 123 456 7890" 
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Correo Electrónico</label>
                    <input 
                      type="email" 
                      placeholder="correo@ejemplo.com" 
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all dark:text-white"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Search */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex-grow flex flex-col">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span>📦</span> Agregar Artículos
              </h3>
              
              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Buscar producto por nombre o código..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-purple-500 transition-all dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-3 top-3.5 text-zinc-400">🔍</span>
              </div>

              <div className="flex-grow overflow-y-auto max-h-[300px] border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 p-2">
                {filteredInventory.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 hover:bg-white dark:hover:bg-zinc-800 rounded-lg group transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 mb-1 cursor-pointer" onClick={() => addItem(item)}>
                    <div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">{item.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{item.id} • Stock: {item.stock}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-purple-600 dark:text-purple-400">${item.price.toFixed(2)}</span>
                      <button className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Quote Document */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden">
              
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-purple-50/30 dark:bg-purple-500/5">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>📄</span> Detalle de la Cotización
                </h3>
              </div>
              
              <div className="flex-grow p-6 overflow-y-auto min-h-[300px]">
                {quoteItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-center opacity-70">
                    <span className="text-5xl mb-4">🛒</span>
                    <p>Agrega productos desde el buscador<br/>para armar la cotización.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                        <th className="pb-3 font-bold">Artículo</th>
                        <th className="pb-3 font-bold w-20 text-center">Cant.</th>
                        <th className="pb-3 font-bold w-20 text-right">Precio</th>
                        <th className="pb-3 font-bold w-24 text-center">Desc (%)</th>
                        <th className="pb-3 font-bold w-24 text-right">Subtotal</th>
                        <th className="pb-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {quoteItems.map((item) => (
                        <tr key={item.product.id} className="group">
                          <td className="py-4">
                            <p className="font-bold text-sm text-zinc-900 dark:text-white">{item.product.name}</p>
                            <p className="text-xs text-zinc-500 font-mono">{item.product.id}</p>
                          </td>
                          <td className="py-4 text-center">
                            <input 
                              type="number" 
                              min="1"
                              className="w-14 text-center px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:border-purple-500"
                              value={item.qty}
                              onChange={(e) => updateItem(item.product.id, 'qty', parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td className="py-4 text-right text-sm text-zinc-600 dark:text-zinc-400">
                            ${item.product.price.toFixed(2)}
                          </td>
                          <td className="py-4 text-center">
                            <input 
                              type="number" 
                              min="0"
                              max="100"
                              className="w-14 text-center px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:border-purple-500"
                              value={item.discount}
                              onChange={(e) => updateItem(item.product.id, 'discount', parseInt(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-4 text-right font-bold text-zinc-900 dark:text-white">
                            ${((item.product.price * item.qty) * (1 - item.discount / 100)).toFixed(2)}
                          </td>
                          <td className="py-4 text-right pl-2">
                            <button onClick={() => removeItem(item.product.id)} className="text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
                <div className="w-full md:w-1/2 ml-auto space-y-2 text-sm mb-6">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Subtotal Bruto</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-purple-600 dark:text-purple-400 font-medium">
                      <span>Descuentos</span>
                      <span>-${totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>IVA (16%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-2 flex justify-between items-center">
                    <span className="text-base font-bold text-zinc-900 dark:text-white">Gran Total</span>
                    <span className="text-3xl font-black text-purple-600 dark:text-purple-400">${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2">
                    <span>✉️</span> Enviar por Email
                  </button>
                  <button 
                    disabled={quoteItems.length === 0}
                    className="flex-1 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 font-bold text-white transition-colors flex justify-center items-center gap-2"
                  >
                    <span>🖨️</span> Guardar e Imprimir
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
