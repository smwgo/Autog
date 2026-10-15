"use client";

import React from "react";

export function VehicleSearch() {
  const steps = [
    { label: "1. Marca" },
    { label: "2. Modelo" },
    { label: "3. Año" },
    { label: "4. Versión / Motor" }
  ];

  const categories = [
    { title: "Repuestos y accesorios", icon: "⚙️", desc: "Piezas y componentes" },
    { title: "Lubricantes", icon: "💧", desc: "Aceites y fluidos" },
    { title: "Filtros", icon: "🎛️", desc: "Aire, aceite y cabina" },
    { title: "Talleres y servicios", icon: "🛠️", desc: "Mantenimiento y revisión" }
  ];

  return (
    <div className="w-full mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row select-none">
      {/* Columna Izquierda: Selección de Vehículo (Estático) */}
      <div className="w-full md:w-1/3 bg-zinc-50 dark:bg-zinc-900 p-8 md:p-10 border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-6 rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Vehículo</h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Selecciona tu vehículo.</p>
        </div>

        <div className="aspect-[4/3] w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 overflow-hidden relative flex items-center justify-center border border-zinc-200 dark:border-zinc-800/80">
          <div className="text-center p-6 flex flex-col items-center">
            <span className="text-5xl mb-3">🚗</span>
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
              Tu vehículo
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Completa los 4 pasos para ver compatibilidad exacta
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {steps.map(step => (
            <div 
              key={step.label}
              className="w-full h-14 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between shadow-sm cursor-default"
            >
              <span className="text-zinc-500 font-medium">
                {step.label}
              </span>
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Columna Derecha: Búsqueda y Categorías (Estático) */}
      <div className="w-full md:w-2/3 p-8 md:p-10 flex flex-col bg-white dark:bg-zinc-950 rounded-b-2xl md:rounded-bl-none md:rounded-r-2xl">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">¿Qué necesitas?</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Repuestos y servicios garantizados.</p>
        </div>

        <div className="relative mb-10">
          <input 
            type="text" 
            readOnly
            placeholder="Ej. Filtro de aire, Aceite sintético..." 
            className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none cursor-default font-medium"
          />
          <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
          {categories.map(cat => (
            <div 
              key={cat.title} 
              className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-4 bg-zinc-50 dark:bg-zinc-900/50 cursor-default"
            >
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-2xl shadow-sm shrink-0">
                {cat.icon}
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-white">{cat.title}</h4>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
