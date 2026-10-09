"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para el historial de ventas
const SALES_HISTORY = [
  { id: 'FAC-2023-0902', date: '09 Oct 2023, 14:30', client: 'Consumidor Final', items: 3, total: 145.50, status: 'Pagado', payment: 'Tarjeta de Crédito', cashier: 'Caja 1' },
  { id: 'FAC-2023-0901', date: '09 Oct 2023, 11:15', client: 'Empresa Logística SA', items: 12, total: 850.00, status: 'Pagado', payment: 'Transferencia', cashier: 'Caja 1' },
  { id: 'FAC-2023-0900', date: '09 Oct 2023, 09:45', client: 'Juan Pérez', items: 1, total: 25.00, status: 'Pagado', payment: 'Efectivo', cashier: 'Caja 2' },
  { id: 'FAC-2023-0899', date: '08 Oct 2023, 16:20', client: 'María Gómez', items: 2, total: 53.00, status: 'Devuelto', payment: 'Efectivo', cashier: 'Caja 1' },
  { id: 'FAC-2023-0898', date: '08 Oct 2023, 10:10', client: 'Taller Mecánico Hermanos', items: 5, total: 320.00, status: 'Pagado', payment: 'Tarjeta de Débito', cashier: 'Caja 2' },
  { id: 'FAC-2023-0897', date: '07 Oct 2023, 15:55', client: 'Consumidor Final', items: 1, total: 12.00, status: 'Pagado', payment: 'Efectivo', cashier: 'Caja 1' },
];

export default function HistorialVentasPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSales = SALES_HISTORY.filter(sale => 
    sale.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sale.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.date.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    if (status === 'Pagado') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
    if (status === 'Devuelto') return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
    return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/pos" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1 w-fit">
            &larr; Volver a Punto de Venta
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500 bg-opacity-10 flex items-center justify-center text-2xl">
                🧾
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Historial de Ventas
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Reimpresión de facturas y consultas de ventas pasadas.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-zinc-700 dark:text-zinc-300 px-5 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
              <span>📅</span> Filtrar por Fecha
            </button>
          </div>
        </div>

        {/* Filters / Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input 
              type="text" 
              placeholder="Buscar por número de factura, cliente o fecha..." 
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-4 text-zinc-400 text-xl">🔍</span>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Factura / Fecha</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pago / Origen</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Total</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">Estado</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400 mb-1">{sale.id}</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        {sale.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                        <span>👤</span> {sale.client}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        {sale.payment}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-500">
                        Emitida en: {sale.cashier}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-zinc-900 dark:text-white text-lg">
                        ${sale.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {sale.items} artículo(s)
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-sm font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-2 rounded-xl transition-colors" title="Ver Detalles">
                          👁️
                        </button>
                        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 px-3 py-2 rounded-xl transition-colors" title="Reimprimir">
                          🖨️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <span className="text-4xl mb-4 block">🧾</span>
                      <p className="text-zinc-900 dark:text-white font-bold text-lg mb-1">No hay ventas registradas</p>
                      <p className="text-zinc-500 dark:text-zinc-400">Prueba ajustando los filtros o el término de búsqueda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination (Mock) */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center text-sm text-zinc-500 dark:text-zinc-400">
            <span>Mostrando {filteredSales.length} resultados</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-50" disabled>&lt;</button>
              <button className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold">1</button>
              <button className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800">2</button>
              <button className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800">&gt;</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
