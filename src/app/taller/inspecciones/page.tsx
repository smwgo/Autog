"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba (mock data) para inspecciones
const MOCK_INSPECTIONS = [
  {
    id: 'INSP-001',
    vehicle: 'Nissan Versa 2021',
    plate: 'JHF-432',
    type: 'Recepción',
    status: 'Pendiente',
    assignedTo: 'Carlos Rodríguez',
    date: '2023-10-09 08:30',
    color: 'bg-amber-500' // Pendiente
  },
  {
    id: 'INSP-002',
    vehicle: 'Kia Rio 2019',
    plate: 'KLM-987',
    type: 'Diagnóstico',
    status: 'En Progreso',
    assignedTo: 'Luis Martínez',
    date: '2023-10-09 09:15',
    color: 'bg-blue-500' // En progreso
  },
  {
    id: 'INSP-003',
    vehicle: 'Toyota Corolla 2022',
    plate: 'RTY-112',
    type: 'Pre-Entrega',
    status: 'Completado',
    assignedTo: 'Ana Torres',
    date: '2023-10-08 16:45',
    color: 'bg-emerald-500' // Completado
  },
  {
    id: 'INSP-004',
    vehicle: 'Ford Escape 2018',
    plate: 'QWE-554',
    type: 'Recepción',
    status: 'Pendiente',
    assignedTo: 'Sin asignar',
    date: '2023-10-09 10:00',
    color: 'bg-amber-500' // Pendiente
  }
];

export default function InspeccionesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInspections = MOCK_INSPECTIONS.filter(insp => 
    insp.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    insp.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insp.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/taller" className="text-sm font-medium text-amber-600 hover:text-amber-500 flex items-center gap-1 w-fit">
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-amber-500 bg-opacity-10 flex items-center justify-center text-2xl">
                📋
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Inspecciones Técnicas
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Checklist de recepción, diagnóstico y estado del vehículo.
            </p>
          </div>
          
          <button className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
            <span>+</span> Nueva Inspección
          </button>
        </div>

        {/* Filters / Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input 
              type="text" 
              placeholder="Buscar por placa, vehículo o ID de inspección..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3.5 text-zinc-400">🔍</span>
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white font-medium">
              <option value="">Cualquier Estado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Progreso">En Progreso</option>
              <option value="Completado">Completado</option>
            </select>
          </div>
        </div>

        {/* Inspections Table / List */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">ID / Vehículo</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Fecha Programada</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredInspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-white">{insp.vehicle}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {insp.plate}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">{insp.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                      {insp.type}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${insp.color} bg-opacity-10 text-${insp.color.replace('bg-', '')} dark:text-white`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${insp.color}`}></span>
                        {insp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs">👤</div>
                      {insp.assignedTo}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {insp.date}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors">
                        {insp.status === 'Pendiente' ? 'Iniciar' : 'Ver Detalle'}
                      </button>
                    </td>
                  </tr>
                ))}
                
                {filteredInspections.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <span className="text-3xl mb-3 block">📋</span>
                      <p className="text-zinc-900 dark:text-white font-medium mb-1">No hay inspecciones</p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">No se encontraron resultados para tu búsqueda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
