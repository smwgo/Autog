"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para el cierre de caja
const SYSTEM_TOTALS = {
  initialCash: 150.00,
  salesCash: 845.50,
  salesCard: 1250.00,
  salesTransfer: 320.00,
  expenses: 45.00, // E.g., compra de agua, insumos menores
  expectedCash: 150.00 + 845.50 - 45.00, // 950.50
  totalSales: 845.50 + 1250.00 + 320.00
};

export default function CierreCajaPage() {
  const [declaredCash, setDeclaredCash] = useState<string>('');
  const [declaredCard, setDeclaredCard] = useState<string>('');
  const [declaredTransfer, setDeclaredTransfer] = useState<string>('');
  const [notes, setNotes] = useState('');

  const cashDiff = (parseFloat(declaredCash) || 0) - SYSTEM_TOTALS.expectedCash;
  const cardDiff = (parseFloat(declaredCard) || 0) - SYSTEM_TOTALS.salesCard;
  const transferDiff = (parseFloat(declaredTransfer) || 0) - SYSTEM_TOTALS.salesTransfer;

  const totalDiff = cashDiff + cardDiff + transferDiff;

  const getDiffColor = (diff: number) => {
    if (diff > 0) return 'text-emerald-600 dark:text-emerald-400';
    if (diff < 0) return 'text-rose-600 dark:text-rose-400';
    return 'text-zinc-500 dark:text-zinc-400';
  };

  const getDiffText = (diff: number) => {
    if (diff > 0) return `+ $${diff.toFixed(2)} (Sobrante)`;
    if (diff < 0) return `- $${Math.abs(diff).toFixed(2)} (Faltante)`;
    return '✓ Cuadrado';
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/pos" className="text-sm font-medium text-amber-600 hover:text-amber-500 flex items-center gap-1 w-fit">
            &larr; Volver a Punto de Venta
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-amber-500 bg-opacity-10 flex items-center justify-center text-2xl">
                💵
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Cierre de Caja
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Cuadre diario, declaración de efectivo y tarjetas.
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Fecha de Operación</p>
            <p className="font-bold text-zinc-900 dark:text-white text-xl">09 Octubre 2023</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side: Declaración (Input) */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-amber-50/50 dark:bg-amber-500/5">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>📝</span> Declaración del Cajero
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Ingresa los montos físicos contados antes de ver el reporte del sistema.
              </p>
            </div>
            
            <div className="p-6 flex-grow space-y-6">
              
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Efectivo Contado en Caja
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-zinc-500 font-bold">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all dark:text-white text-lg font-mono"
                    value={declaredCash}
                    onChange={(e) => setDeclaredCash(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Lotes de Tarjeta (Vouchers)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-zinc-500 font-bold">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all dark:text-white text-lg font-mono"
                    value={declaredCard}
                    onChange={(e) => setDeclaredCard(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Transferencias / Otros
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-zinc-500 font-bold">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all dark:text-white text-lg font-mono"
                    value={declaredTransfer}
                    onChange={(e) => setDeclaredTransfer(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Observaciones
                </label>
                <textarea 
                  placeholder="Detalla cualquier gasto, sobrante o faltante..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all dark:text-white resize-none h-24"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

            </div>
          </div>

          {/* Right Side: Resumen (System Info) */}
          <div className="flex flex-col gap-6">
            
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🖥️</span> Resumen del Sistema
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">Fondo Inicial de Caja</span>
                  <span className="font-mono text-zinc-900 dark:text-white">${SYSTEM_TOTALS.initialCash.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">Ventas en Efectivo</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">+ ${SYSTEM_TOTALS.salesCash.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">Salidas / Gastos</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400">- ${SYSTEM_TOTALS.expenses.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-zinc-900 dark:text-white">Efectivo Esperado</span>
                  <span className="text-xl font-black font-mono text-zinc-900 dark:text-white">
                    ${SYSTEM_TOTALS.expectedCash.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex-grow">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>⚖️</span> Diferencias (Cuadre)
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Efectivo</span>
                  <span className={`text-sm font-bold ${getDiffColor(cashDiff)}`}>
                    {getDiffText(cashDiff)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Tarjetas</span>
                  <span className={`text-sm font-bold ${getDiffColor(cardDiff)}`}>
                    {getDiffText(cardDiff)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Transferencias</span>
                  <span className={`text-sm font-bold ${getDiffColor(transferDiff)}`}>
                    {getDiffText(transferDiff)}
                  </span>
                </div>
                
                <div className={`mt-4 p-4 rounded-xl border ${totalDiff === 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-900 dark:text-white">Diferencia Total</span>
                    <span className={`text-lg font-black ${getDiffColor(totalDiff)}`}>
                      {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-4">
          <button className="px-6 py-3 rounded-xl font-bold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            Imprimir Arqueo Previo
          </button>
          <button className="px-8 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-transform active:scale-95 flex items-center gap-2">
            <span>🔒</span> Confirmar Cierre de Caja
          </button>
        </div>

      </main>
    </div>
  );
}
