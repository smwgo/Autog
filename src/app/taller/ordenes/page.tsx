"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Mock data for active orders
const MOCK_ORDERS = [
  {
    id: 'ORD-2023-001',
    vehicle: 'Toyota Hilux 2020',
    plate: 'ABC-123',
    client: 'Juan Pérez',
    status: 'En Diagnóstico',
    progress: 25,
    mechanic: 'Carlos Rodríguez',
    dateIn: '2023-10-08',
    estimatedOut: '2023-10-10',
    color: 'bg-amber-500'
  },
  {
    id: 'ORD-2023-002',
    vehicle: 'Honda Civic 2018',
    plate: 'XYZ-987',
    client: 'María Gómez',
    status: 'Reparando',
    progress: 60,
    mechanic: 'Luis Martínez',
    dateIn: '2023-10-07',
    estimatedOut: '2023-10-09',
    color: 'bg-blue-500'
  },
  {
    id: 'ORD-2023-003',
    vehicle: 'Ford Ranger 2021',
    plate: 'DEF-456',
    client: 'Empresa Logística SA',
    status: 'Espera de Repuestos',
    progress: 40,
    mechanic: 'Carlos Rodríguez',
    dateIn: '2023-10-05',
    estimatedOut: 'Pendiente',
    color: 'bg-rose-500'
  },
  {
    id: 'ORD-2023-004',
    vehicle: 'Chevrolet Spark 2019',
    plate: 'GHI-789',
    client: 'Ana Torres',
    status: 'Listo para Entregar',
    progress: 100,
    mechanic: 'Luis Martínez',
    dateIn: '2023-10-08',
    estimatedOut: '2023-10-09',
    color: 'bg-emerald-500'
  }
];

export default function ActiveOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = MOCK_ORDERS.filter(order => 
    order.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    order.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/taller" className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1 w-fit">
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-10 flex items-center justify-center text-2xl">
                🚗
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Órdenes Activas
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Gestión de vehículos en taller y estado de reparación.
            </p>
          </div>
          
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
            <span>+</span> Nueva Orden
          </button>
        </div>

        {/* Filters / Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input 
              type="text" 
              placeholder="Buscar por placa, cliente o vehículo..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-3.5 text-zinc-400">🔍</span>
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium">
              <option value="">Todos los Estados</option>
              <option value="diagnostico">En Diagnóstico</option>
              <option value="reparando">Reparando</option>
              <option value="espera">Espera de Repuestos</option>
            </select>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-lg relative overflow-hidden group">
              
              {/* Status Badge */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {order.id}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${order.color} bg-opacity-10 text-${order.color.replace('bg-', '')} dark:text-white flex items-center gap-1.5`}>
                  <span className={`w-2 h-2 rounded-full ${order.color}`}></span>
                  {order.status}
                </span>
              </div>

              {/* Main Info */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
                  {order.vehicle}
                </h3>
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 tracking-wider">
                    {order.plate}
                  </span>
                  <span>•</span>
                  <span>{order.client}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Progreso</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{order.progress}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${order.color} transition-all duration-1000 ease-out`} 
                    style={{ width: `${order.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Footer Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Mecánico Asignado</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs">👨‍🔧</span>
                    {order.mechanic}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Ingreso / Entrega</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {order.dateIn} &rarr; {order.estimatedOut}
                  </p>
                </div>
              </div>

              {/* Action Overlay on Hover */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-white dark:from-zinc-900 via-white/90 dark:via-zinc-900/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform flex justify-end">
                <button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-105 transition-transform">
                  Ver Detalles
                </button>
              </div>

            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <span className="text-4xl mb-4 block">🔍</span>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No se encontraron órdenes</h3>
              <p className="text-zinc-500 dark:text-zinc-400">Intenta con otros términos de búsqueda.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
