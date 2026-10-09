"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para facturas del cliente
const INVOICES = [
  {
    id: 'F-2023-0899',
    uuid: 'A1B2C3D4-E5F6-7890',
    date: '15 Sep 2023',
    concept: 'Servicio de Mantenimiento Preventivo (Hilux)',
    amount: 185.00,
    status: 'Pagada', // Pagada, Pendiente
    paymentMethod: 'Tarjeta de Crédito',
  },
  {
    id: 'F-2023-0850',
    uuid: 'B2C3D4E5-F6G7-8901',
    date: '02 Jul 2023',
    concept: 'Reparación de Frenos (Civic)',
    amount: 210.50,
    status: 'Pagada',
    paymentMethod: 'Transferencia Bancaria',
  },
  {
    id: 'F-2023-0910',
    uuid: 'C3D4E5F6-G7H8-9012',
    date: '08 Oct 2023',
    concept: 'Compra de Repuestos de Mostrador',
    amount: 45.00,
    status: 'Pendiente',
    paymentMethod: 'Por Definir',
  }
];

export default function FacturasPagosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas'); // Todas, Pagada, Pendiente

  const filteredInvoices = INVOICES.filter(inv => {
    const matchesSearch = inv.concept.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todas' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-6xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/cliente" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <span>RFC:</span>
            <span className="font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
              XAXX010101000
            </span>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500 bg-opacity-10 flex items-center justify-center text-2xl">
                🧾
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Facturas y Pagos
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Descarga tus facturas electrónicas y revisa pagos pendientes.
            </p>
          </div>
          
          <button className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-zinc-700 dark:text-zinc-300 px-5 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
            <span>⬇️</span> Descargar Reporte Anual
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input 
              type="text" 
              placeholder="Buscar por número de factura o concepto..." 
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-4 text-zinc-400 text-xl">🔍</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar shrink-0">
            {['Todas', 'Pagada', 'Pendiente'].map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-3.5 rounded-2xl font-bold whitespace-nowrap transition-colors ${statusFilter === status ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List */}
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
              <span className="text-4xl mb-4 block opacity-50">🧾</span>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No se encontraron facturas</h3>
              <p className="text-zinc-500 dark:text-zinc-400">Intenta cambiar los filtros de búsqueda.</p>
            </div>
          ) : (
            filteredInvoices.map((inv) => (
              <div key={inv.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col md:flex-row gap-6 items-center group">
                
                {/* Status Indicator */}
                <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex-shrink-0">
                  {inv.status === 'Pagada' ? (
                    <span className="text-emerald-500 text-3xl">✓</span>
                  ) : (
                    <span className="text-amber-500 text-3xl">!</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-grow w-full">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">{inv.id}</span>
                    <span className={`md:hidden px-3 py-1 rounded-full text-xs font-bold border ${inv.status === 'Pagada' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'}`}>
                      {inv.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 leading-tight">{inv.concept}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 mt-3">
                    <span className="flex items-center gap-1">📅 {inv.date}</span>
                    <span className="flex items-center gap-1">💳 {inv.paymentMethod}</span>
                    <span className="flex items-center gap-1 hidden lg:flex">📄 UUID: {inv.uuid}</span>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end gap-4 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 pl-0 md:pl-6 shrink-0">
                  <div className="text-left md:text-right">
                    <p className={`text-2xl font-black ${inv.status === 'Pagada' ? 'text-zinc-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}>
                      ${inv.amount.toFixed(2)}
                    </p>
                    <span className={`hidden md:inline-block px-2 py-0.5 mt-1 rounded text-xs font-bold border ${inv.status === 'Pagada' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'}`}>
                      {inv.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    {inv.status === 'Pendiente' ? (
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/20 whitespace-nowrap text-sm">
                        Pagar Ahora
                      </button>
                    ) : (
                      <>
                        <button className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap text-sm flex items-center gap-2" title="Descargar XML">
                          <span className="text-indigo-600 dark:text-indigo-400">{'</>'}</span> XML
                        </button>
                        <button className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap text-sm flex items-center gap-2" title="Descargar PDF">
                          📄 PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
}
