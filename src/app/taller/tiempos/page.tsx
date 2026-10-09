"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para control de tiempos
const MOCK_TIME_RECORDS = [
  {
    id: 'TR-001',
    task: 'Diagnóstico de Motor',
    orderId: 'ORD-2023-004',
    mechanic: 'Carlos Rodríguez',
    date: '09 Oct 2023',
    duration: '2h 15m',
    status: 'Finalizado',
    revenue: '$85.00'
  },
  {
    id: 'TR-002',
    task: 'Cambio de Aceite y Filtros',
    orderId: 'ORD-2023-001',
    mechanic: 'Luis Martínez',
    date: '09 Oct 2023',
    duration: '0h 45m',
    status: 'Finalizado',
    revenue: '$30.00'
  },
  {
    id: 'TR-003',
    task: 'Revisión de Frenos',
    orderId: 'ORD-2023-002',
    mechanic: 'Ana Torres',
    date: '08 Oct 2023',
    duration: '1h 30m',
    status: 'Finalizado',
    revenue: '$55.00'
  }
];

export default function ControlTiemposPage() {
  const [activeTimer, setActiveTimer] = useState(true);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/taller" className="text-sm font-medium text-rose-600 hover:text-rose-500 flex items-center gap-1 w-fit">
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-rose-500 bg-opacity-10 flex items-center justify-center text-2xl">
                ⏱️
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Control de Tiempos
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Registro de horas trabajadas por cada orden de trabajo.
            </p>
          </div>
          
          <button className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
            <span>📊</span> Ver Reporte Mensual
          </button>
        </div>

        {/* Top Widgets: Active Timer & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Active Timer Widget */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-3xl">
                  👨‍🔧
                </div>
                {activeTimer && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                )}
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Trabajo Actual</p>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Reparación Transmisión</h3>
                <p className="text-sm font-mono text-rose-600 dark:text-rose-400 mt-1">ORD-2023-005 • Honda Civic</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-black text-zinc-900 dark:text-white font-mono tracking-tighter">
                  01:24<span className="text-2xl text-zinc-400">:45</span>
                </p>
              </div>
              <button 
                onClick={() => setActiveTimer(!activeTimer)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shadow-md transition-transform hover:scale-105 active:scale-95 ${
                  activeTimer ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {activeTimer ? '⏸' : '▶️'}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-3xl shadow-sm text-white flex flex-col justify-center">
            <h3 className="text-rose-100 font-medium mb-1">Horas Totales (Hoy)</h3>
            <p className="text-4xl font-bold mb-4">4h 30m</p>
            <div className="flex justify-between items-end border-t border-rose-400/50 pt-4">
              <div>
                <p className="text-xs text-rose-200">Eficiencia</p>
                <p className="font-bold">92%</p>
              </div>
              <div>
                <p className="text-xs text-rose-200 text-right">Tareas completadas</p>
                <p className="font-bold text-right">3</p>
              </div>
            </div>
          </div>

        </div>

        {/* Logged Sessions Form/Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Registros Anteriores</h3>
            <button className="text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 rounded-lg">
              + Registro Manual
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">ID / Tarea</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Orden / Vehículo</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tiempo Invertido</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Facturable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {MOCK_TIME_RECORDS.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-white">{record.task}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{record.mechanic}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 inline-block mb-1">
                        {record.orderId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                      {record.date}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        ⏱️ {record.duration}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{record.revenue}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
