"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para historial de servicios
const MOCK_HISTORY = [
  {
    id: 'SRV-8901',
    date: '15 Sep 2023',
    vehicle: 'Toyota Corolla 2020',
    plate: 'ABC-123',
    client: 'Juan Pérez',
    services: ['Cambio de aceite sintético', 'Cambio de filtro de aire', 'Revisión de niveles'],
    cost: '$120.00',
    mechanic: 'Carlos Rodríguez',
    mileage: '45,200 km'
  },
  {
    id: 'SRV-8845',
    date: '02 Sep 2023',
    vehicle: 'Honda Civic 2018',
    plate: 'XYZ-987',
    client: 'María Gómez',
    services: ['Cambio de pastillas de freno', 'Rectificación de discos'],
    cost: '$250.00',
    mechanic: 'Luis Martínez',
    mileage: '68,100 km'
  },
  {
    id: 'SRV-8712',
    date: '20 Ago 2023',
    vehicle: 'Ford Ranger 2021',
    plate: 'DEF-456',
    client: 'Empresa Logística SA',
    services: ['Mantenimiento preventivo 50K', 'Alineación y balanceo', 'Cambio de llantas traseras'],
    cost: '$480.00',
    mechanic: 'Ana Torres',
    mileage: '50,050 km'
  },
  {
    id: 'SRV-8650',
    date: '10 Ago 2023',
    vehicle: 'Nissan Versa 2019',
    plate: 'JHF-432',
    client: 'Roberto Sánchez',
    services: ['Diagnóstico de motor', 'Cambio de bujías', 'Limpieza de inyectores'],
    cost: '$190.00',
    mechanic: 'Carlos Rodríguez',
    mileage: '82,400 km'
  }
];

export default function HistorialServiciosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = MOCK_HISTORY.filter(record => 
    record.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    record.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/taller" className="text-sm font-medium text-purple-600 hover:text-purple-500 flex items-center gap-1 w-fit">
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-10 flex items-center justify-center text-2xl">
                📖
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Historial de Servicios
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Consultas de reparaciones anteriores por placa o cliente.
            </p>
          </div>
          
          <button className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-500 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
            <span>📥</span> Exportar Reporte
          </button>
        </div>

        {/* Big Search Bar */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8">
          <div className="relative max-w-3xl mx-auto">
            <input 
              type="text" 
              placeholder="Ingresa la placa (Ej: ABC-123), nombre del cliente o ID del servicio..." 
              className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all dark:text-white text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-5 top-4 text-zinc-400 text-2xl">🔍</span>
          </div>
        </div>

        {/* History Timeline / List */}
        <div className="space-y-6">
          {filteredHistory.map((record) => (
            <div key={record.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors shadow-sm flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Date & ID */}
              <div className="md:w-48 flex-shrink-0 flex flex-col justify-center border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 pb-4 md:pb-0 md:pr-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1 font-medium">Fecha de Servicio</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-400 mb-2">{record.date}</p>
                <span className="inline-block bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono px-2.5 py-1 rounded-md">
                  {record.id}
                </span>
              </div>

              {/* Middle Column: Vehicle & Services */}
              <div className="flex-grow">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      {record.vehicle}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">{record.plate}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">👤 {record.client}</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-0.5">Kilometraje</p>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">{record.mileage}</p>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-500/5 rounded-xl p-4 border border-purple-100 dark:border-purple-500/10">
                  <p className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-2">Trabajos Realizados:</p>
                  <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 text-sm space-y-1">
                    {record.services.map((service, idx) => (
                      <li key={idx}>{service}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column: Cost & Actions */}
              <div className="md:w-48 flex-shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Mecánico</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-4">{record.mechanic}</p>
                  
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Costo Total</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{record.cost}</p>
                </div>
                
                <button className="mt-4 w-full bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 dark:text-purple-300 py-2.5 rounded-xl text-sm font-bold transition-colors">
                  Ver Factura
                </button>
              </div>

            </div>
          ))}

          {filteredHistory.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <span className="text-5xl mb-4 block">🚗</span>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No se encontraron registros</h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                No hay historial de servicios que coincida con "{searchTerm}". Revisa la placa o el nombre e intenta nuevamente.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
