"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para las cotizaciones del cliente
const QUOTES = [
  {
    id: 'COT-2023-1045',
    date: '08 Oct 2023',
    vehicle: 'Toyota Hilux 2020',
    status: 'Pendiente', // Pendiente, Aprobada, Rechazada
    items: [
      { name: 'Amortiguadores Delanteros (Par)', price: 120.00, qty: 1 },
      { name: 'Mano de Obra - Suspensión', price: 80.00, qty: 1 },
      { name: 'Alineación', price: 25.00, qty: 1 },
    ],
    notes: 'Se detectó desgaste prematuro en el amortiguador derecho. Se recomienda cambio en par.'
  },
  {
    id: 'COT-2023-0892',
    date: '15 Sep 2023',
    vehicle: 'Honda Civic 2018',
    status: 'Aprobada',
    items: [
      { name: 'Batería 12V LTH', price: 110.00, qty: 1 },
      { name: 'Instalación y Diagnóstico', price: 15.00, qty: 1 },
    ],
    notes: 'Batería actual no retiene carga.'
  }
];

export default function CotizacionesClientePage() {
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(QUOTES[0].id);

  const activeQuote = QUOTES.find(q => q.id === selectedQuoteId);

  const getSubtotal = (items: any[]) => items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  
  const handleApprove = () => {
    alert(`Has aprobado la cotización ${selectedQuoteId}. Nos pondremos a trabajar en tu vehículo.`);
  };

  const handleReject = () => {
    alert(`Has rechazado la cotización ${selectedQuoteId}.`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/cliente" className="text-sm font-medium text-purple-600 hover:text-purple-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-10 flex items-center justify-center text-2xl">
            📝
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Mis Cotizaciones
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Revisa y aprueba presupuestos pendientes de tus vehículos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: List of Quotes */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-2">Presupuestos Recientes</h3>
            
            {QUOTES.map(quote => {
              const isActive = selectedQuoteId === quote.id;
              const subtotal = getSubtotal(quote.items);
              const total = subtotal * 1.16;

              return (
                <button 
                  key={quote.id}
                  onClick={() => setSelectedQuoteId(quote.id)}
                  className={`text-left p-6 rounded-3xl border-2 transition-all flex flex-col gap-3 ${isActive ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-500/10 shadow-md' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm'}`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                        {quote.id}
                      </span>
                      <h4 className="font-bold text-zinc-900 dark:text-white mt-2">{quote.vehicle}</h4>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${quote.status === 'Pendiente' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'}`}>
                      {quote.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end w-full mt-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{quote.date}</span>
                    <span className="font-black text-lg text-purple-600 dark:text-purple-400">${total.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Quote Details */}
          <div className="lg:col-span-7">
            {activeQuote ? (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Detail Header */}
                <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-1">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Detalle del Presupuesto</span>
                    <button className="text-sm font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 px-4 py-2 rounded-xl transition-colors">
                      Descargar PDF
                    </button>
                  </div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{activeQuote.vehicle}</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm">{activeQuote.id} • {activeQuote.date}</p>
                </div>

                {/* Items List */}
                <div className="p-6 md:p-8 flex-grow">
                  
                  {activeQuote.notes && (
                    <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300">
                      <span className="text-xl">⚠️</span>
                      <p className="text-sm font-medium leading-relaxed">{activeQuote.notes}</p>
                    </div>
                  )}

                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                        <th className="pb-3 font-bold">Concepto</th>
                        <th className="pb-3 font-bold text-center">Cant.</th>
                        <th className="pb-3 font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {activeQuote.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-4">
                            <p className="font-bold text-sm text-zinc-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-zinc-500">${item.price.toFixed(2)} c/u</p>
                          </td>
                          <td className="py-4 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {item.qty}
                          </td>
                          <td className="py-4 text-right font-bold text-zinc-900 dark:text-white">
                            ${(item.price * item.qty).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Actions */}
                <div className="p-6 md:p-8 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
                  <div className="w-full md:w-1/2 ml-auto space-y-2 text-sm mb-8">
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                      <span>Subtotal</span>
                      <span>${getSubtotal(activeQuote.items).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                      <span>IVA (16%)</span>
                      <span>${(getSubtotal(activeQuote.items) * 0.16).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-2 flex justify-between items-center">
                      <span className="text-base font-bold text-zinc-900 dark:text-white">Total a Pagar</span>
                      <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        ${(getSubtotal(activeQuote.items) * 1.16).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {activeQuote.status === 'Pendiente' ? (
                    <div className="flex gap-4">
                      <button 
                        onClick={handleReject}
                        className="flex-1 py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/30 transition-colors"
                      >
                        Rechazar
                      </button>
                      <button 
                        onClick={handleApprove}
                        className="flex-1 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 font-bold text-white transition-colors shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                      >
                        <span>✓</span> Aprobar Trabajo
                      </button>
                    </div>
                  ) : (
                    <div className="w-full py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 font-bold text-center flex justify-center items-center gap-2">
                      <span>✅</span> Este presupuesto ya fue aprobado
                    </div>
                  )}
                </div>

              </div>
            ) : null}
          </div>

        </div>

      </main>
    </div>
  );
}
