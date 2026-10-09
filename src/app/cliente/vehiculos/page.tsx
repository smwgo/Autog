"use client";

import React from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para los vehículos del cliente
const MY_VEHICLES = [
  {
    id: 'VEH-001',
    brand: 'Toyota',
    model: 'Hilux',
    year: 2020,
    plate: 'ABC-123',
    mileage: '45,200',
    status: 'En Taller', // En Taller, Al Día, Mantenimiento Próximo
    nextService: '15 Oct 2023',
    image: '🚙'
  },
  {
    id: 'VEH-002',
    brand: 'Honda',
    model: 'Civic',
    year: 2018,
    plate: 'XYZ-987',
    mileage: '68,100',
    status: 'Al Día',
    nextService: '20 Ene 2024',
    image: '🚗'
  },
  {
    id: 'VEH-003',
    brand: 'Ford',
    model: 'Escape',
    year: 2021,
    plate: 'QWE-554',
    mileage: '49,800',
    status: 'Mantenimiento Próximo',
    nextService: '10 Nov 2023',
    image: '🚙'
  }
];

export default function MisVehiculosPage() {

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Al Día': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30';
      case 'En Taller': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30';
      case 'Mantenimiento Próximo': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/cliente" className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
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
                Mis Vehículos
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Revisa el estado, kilometraje y detalles de tus vehículos.
            </p>
          </div>
          
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
            <span>+</span> Agregar Vehículo
          </button>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MY_VEHICLES.map((vehicle) => (
            <div key={vehicle.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col">
              
              {/* Card Header */}
              <div className="p-6 pb-0 flex justify-between items-start">
                <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-4xl shadow-inner">
                  {vehicle.image}
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${getStatusBadge(vehicle.status)}`}>
                  {vehicle.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-grow">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-1">
                  {vehicle.brand} {vehicle.model}
                </h3>
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-6">
                  <span>{vehicle.year}</span>
                  <span>•</span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 font-mono text-zinc-700 dark:text-zinc-300 tracking-wider">
                    {vehicle.plate}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
                      <span>⏲️</span> Kilometraje
                    </p>
                    <p className="font-bold text-zinc-900 dark:text-white">{vehicle.mileage} <span className="text-xs font-normal">km</span></p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
                      <span>📅</span> Próx. Servicio
                    </p>
                    <p className="font-bold text-zinc-900 dark:text-white">{vehicle.nextService}</p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-6 pt-0 mt-auto">
                <div className="flex gap-3">
                  <button className="flex-1 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm">
                    Ver Historial
                  </button>
                  <button className="flex-1 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 font-bold text-blue-600 dark:text-blue-400 transition-colors text-sm">
                    Agendar Cita
                  </button>
                </div>
              </div>

            </div>
          ))}

          {/* Add New Vehicle Card Placeholder */}
          <button className="bg-transparent border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-6 flex flex-col items-center justify-center text-zinc-500 hover:text-blue-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all min-h-[320px]">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900">
              +
            </div>
            <h3 className="font-bold text-lg mb-1">Agregar otro vehículo</h3>
            <p className="text-sm text-center max-w-[200px]">Registra un nuevo auto para llevar su control de mantenimiento.</p>
          </button>

        </div>
      </main>
    </div>
  );
}
