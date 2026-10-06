"use client";
import { useState } from "react";

export function VehicleSearch() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [version, setVersion] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate navigation to results
    console.log("Searching for", { brand, model, year, version });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-xl border border-zinc-100 dark:border-zinc-800">
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Marca</label>
          <select 
            value={brand} 
            onChange={(e) => setBrand(e.target.value)}
            className="h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="" disabled>Seleccionar Marca</option>
            <option value="toyota">Toyota</option>
            <option value="nissan">Nissan</option>
            <option value="honda">Honda</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Modelo</label>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            disabled={!brand}
            className="h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
          >
            <option value="" disabled>Seleccionar Modelo</option>
            {brand === 'toyota' && <option value="corolla">Corolla</option>}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Año</label>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            disabled={!model}
            className="h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
          >
            <option value="" disabled>Año</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Versión / Motor</label>
          <select 
            value={version} 
            onChange={(e) => setVersion(e.target.value)}
            disabled={!year}
            className="h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50"
          >
            <option value="" disabled>Versión</option>
            <option value="1.8">1.8L</option>
            <option value="2.0">2.0L</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={!version}
          className="h-12 w-full rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all"
        >
          Buscar Productos
        </button>

      </form>

      {/* Suggested Products (mock) */}
      {version && (
        <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Productos compatibles con tu vehículo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500 transition-colors">
              <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4 flex items-center justify-center">🛢️</div>
              <h4 className="font-medium">Aceite Sintético 5W-30</h4>
              <p className="text-sm text-zinc-500 mt-1">Recomendado</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="font-bold">$45.00</span>
                <button className="text-blue-600 font-medium text-sm hover:underline">Añadir</button>
              </div>
            </div>
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500 transition-colors">
              <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4 flex items-center justify-center">⚙️</div>
              <h4 className="font-medium">Filtro de Aceite Original</h4>
              <p className="text-sm text-zinc-500 mt-1">Compatible Exacto</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="font-bold">$12.50</span>
                <button className="text-blue-600 font-medium text-sm hover:underline">Añadir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
