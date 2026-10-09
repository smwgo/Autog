"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para el historial de servicios del cliente
const SERVICE_HISTORY = [
  {
    id: 'ORD-2023-1045',
    date: '15 Sep 2023',
    vehicle: 'Toyota Hilux 2020 (ABC-123)',
    mileage: '45,200 km',
    type: 'Mantenimiento Preventivo',
    details: 'Cambio de aceite sintético, filtro de aceite, revisión de fluidos y ajuste de frenos.',
    cost: 185.00,
    warranty: { active: true, expires: '15 Mar 2024 o 50,000 km' }
  },
  {
    id: 'ORD-2023-0892',
    date: '02 Jul 2023',
    vehicle: 'Honda Civic 2018 (XYZ-987)',
    mileage: '65,500 km',
    type: 'Reparación Sistema de Frenos',
    details: 'Reemplazo de pastillas de freno delanteras y rectificación de discos.',
    cost: 210.50,
    warranty: { active: true, expires: '02 Ene 2024' }
  },
  {
    id: 'ORD-2022-1205',
    date: '10 Nov 2022',
    vehicle: 'Ford Escape 2021 (QWE-554)',
    mileage: '40,100 km',
    type: 'Alineación y Balanceo',
    details: 'Alineación computarizada, balanceo de 4 ruedas y rotación de llantas.',
    cost: 45.00,
    warranty: { active: false, expires: '10 Feb 2023' }
  },
  {
    id: 'ORD-2022-0540',
    date: '15 May 2022',
    vehicle: 'Toyota Hilux 2020 (ABC-123)',
    mileage: '35,000 km',
    type: 'Mantenimiento Preventivo',
    details: 'Cambio de aceite, filtros de aire y cabina. Revisión general de suspensión.',
    cost: 150.00,
    warranty: { active: false, expires: '15 Nov 2022' }
  }
];

export default function HistorialServiciosPage() {
  const [selectedVehicle, setSelectedVehicle] = useState('Todos');

  const filteredHistory = selectedVehicle === 'Todos' 
    ? SERVICE_HISTORY 
    : SERVICE_HISTORY.filter(h => h.vehicle.includes(selectedVehicle));

  const vehicles = ['Todos', 'Toyota Hilux', 'Honda Civic', 'Ford Escape'];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-5xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/cliente" className="text-sm font-medium text-amber-600 hover:text-amber-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-amber-500 bg-opacity-10 flex items-center justify-center text-2xl">
                📖
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Historial de Servicios
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Consulta los trabajos realizados y garantías activas de tus vehículos.
            </p>
          </div>
          
          <div className="flex gap-2 bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto max-w-full">
            {vehicles.map(v => (
              <button 
                key={v}
                onClick={() => setSelectedVehicle(v)}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${selectedVehicle === v ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline / List */}
        <div className="space-y-6">
          {filteredHistory.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
              <span className="text-4xl mb-4 block opacity-50">📖</span>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No hay historial</h3>
              <p className="text-zinc-500 dark:text-zinc-400">No se encontraron servicios previos para el vehículo seleccionado.</p>
            </div>
          ) : (
            filteredHistory.map((record, index) => (
              <div key={record.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col md:flex-row gap-6 relative overflow-hidden group">
                
                {/* Decorative Side Line (Timeline visual) */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 group-hover:w-2 transition-all"></div>

                {/* Left block: Date & Vehicle */}
                <div className="md:w-1/3 flex flex-col gap-1 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 pb-4 md:pb-0 md:pr-6">
                  <span className="text-amber-600 dark:text-amber-400 font-black text-lg">{record.date}</span>
                  <span className="font-mono text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800 w-fit px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 mb-2">
                    {record.id}
                  </span>
                  <h4 className="font-bold text-zinc-900 dark:text-white mt-1">{record.vehicle}</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <span>⏲️</span> {record.mileage}
                  </p>
                </div>

                {/* Middle block: Details */}
                <div className="md:w-1/2 flex flex-col">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{record.type}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4 flex-grow">
                    {record.details}
                  </p>
                  
                  {/* Warranty Badge */}
                  <div>
                    {record.warranty.active ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                        <span>🛡️</span> Garantía Activa (Vence: {record.warranty.expires})
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                        <span>⚠️</span> Garantía Expirada
                      </div>
                    )}
                  </div>
                </div>

                {/* Right block: Action / Price */}
                <div className="md:w-1/6 flex flex-row md:flex-col justify-between items-end md:justify-center md:items-end border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 pl-0 md:pl-6">
                  <div className="text-left md:text-right w-full mb-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Costo Total</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">${record.cost.toFixed(2)}</p>
                  </div>
                  <button className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
                    Ver Factura
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
}
