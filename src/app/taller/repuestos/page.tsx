"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para solicitudes de repuestos
const MOCK_REQUESTS = [
  {
    id: 'REQ-5012',
    date: '09 Oct 2023 - 10:30',
    mechanic: 'Carlos Rodríguez',
    orderId: 'ORD-2023-001',
    vehicle: 'Toyota Hilux (ABC-123)',
    items: [
      { name: 'Filtro de Aceite', quantity: 1, available: true },
      { name: 'Aceite Sintético 5W-30 (Litros)', quantity: 4, available: true }
    ],
    status: 'Aprobado', // Pendiente, Aprobado, Entregado, Rechazado
    urgency: 'Normal'
  },
  {
    id: 'REQ-5013',
    date: '09 Oct 2023 - 11:15',
    mechanic: 'Luis Martínez',
    orderId: 'ORD-2023-002',
    vehicle: 'Honda Civic (XYZ-987)',
    items: [
      { name: 'Juego de Pastillas de Freno', quantity: 2, available: false },
      { name: 'Líquido de Frenos DOT 4', quantity: 1, available: true }
    ],
    status: 'Pendiente',
    urgency: 'Alta'
  },
  {
    id: 'REQ-5010',
    date: '08 Oct 2023 - 16:45',
    mechanic: 'Ana Torres',
    orderId: 'ORD-2023-004',
    vehicle: 'Chevrolet Spark (GHI-789)',
    items: [
      { name: 'Bujías Iridium', quantity: 4, available: true },
    ],
    status: 'Entregado',
    urgency: 'Normal'
  }
];

export default function SolicitudRepuestosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRequests = MOCK_REQUESTS.filter(req => 
    req.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.mechanic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Pendiente': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
      case 'Aprobado': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      case 'Entregado': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
      case 'Rechazado': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    if (urgency === 'Alta') return <span className="text-rose-500 text-sm animate-pulse" title="Urgencia Alta">⚠️ Alta</span>;
    return <span className="text-zinc-500 text-sm">Normal</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/taller" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1 w-fit">
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500 bg-opacity-10 flex items-center justify-center text-2xl">
                🔩
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Solicitud de Repuestos
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Petición de partes e insumos a la bodega o inventario.
            </p>
          </div>
          
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
            <span>+</span> Nueva Petición
          </button>
        </div>

        {/* Filters / Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input 
              type="text" 
              placeholder="Buscar por ID, vehículo o mecánico..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3.5 text-zinc-400">🔍</span>
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium">
              <option value="">Todos los Estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Entregado">Entregado</option>
            </select>
          </div>
        </div>

        {/* Requests Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-sm flex flex-col">
              
              {/* Card Header */}
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start bg-zinc-50/50 dark:bg-zinc-800/20">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{req.id}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusStyle(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{req.date}</p>
                </div>
                <div className="text-right">
                  {getUrgencyIcon(req.urgency)}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-grow">
                <div className="mb-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Vehículo / Orden</p>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      🚗 {req.vehicle}
                    </p>
                    <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      {req.orderId}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Artículos Solicitados</p>
                  <ul className="space-y-2">
                    {req.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">{item.quantity}x</span>
                          <span className="text-zinc-600 dark:text-zinc-400">{item.name}</span>
                        </div>
                        {item.available ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="En inventario"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-rose-500" title="Sin stock"></span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-5 pt-0 mt-auto">
                <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                      👨‍🔧
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Solicitante</p>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{req.mechanic}</p>
                    </div>
                  </div>
                  
                  <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 px-4 py-2 rounded-xl transition-colors">
                    Ver Detalles
                  </button>
                </div>
              </div>

            </div>
          ))}

          {filteredRequests.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <span className="text-5xl mb-4 block">🔩</span>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No se encontraron peticiones</h3>
              <p className="text-zinc-500 dark:text-zinc-400">Intenta buscar con otro término.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
