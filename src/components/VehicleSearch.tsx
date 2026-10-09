"use client";
import React, { useState } from "react";
import Link from "next/link";

// Simulación de base de datos para no alterar el backend ni inventar datos dinámicamente
const REAL_DB_MOCK = {
  vehicles: [
    { brand: "Toyota", model: "Corolla", year: "2022", version: "1.8L", photoUrl: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=600" },
    { brand: "Nissan", model: "Sentra", year: "2021", version: "2.0L", photoUrl: "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&q=80&w=600" },
  ],
  products: [
    { id: '1', category: 'Lubricantes', name: "Aceite Sintético 5W-30", price: 45.00, compatibility: ["Toyota Corolla", "Nissan Sentra"], stock: 12, isService: false },
    { id: '2', category: 'Filtros', name: "Filtro de Aceite Original", price: 12.50, compatibility: ["Toyota Corolla"], stock: 5, isService: false },
    { id: '3', category: 'Servicios', name: "Mantenimiento Preventivo Básico", price: null, compatibility: ["Toyota Corolla", "Nissan Sentra"], isService: true, description: "Cambio de aceite, filtros y revisión de 20 puntos." }
  ]
};

export function VehicleSearch() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [version, setVersion] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Estado derivado para la búsqueda
  const selectedVehicle = REAL_DB_MOCK.vehicles.find(v => v.brand === brand && v.model === model);
  const vehiclePhoto = selectedVehicle?.photoUrl || null;
  const isVehicleSelected = brand && model && year && version;

  const filteredProducts = REAL_DB_MOCK.products.filter(p => {
    if (!isVehicleSelected) return false;
    const compatible = p.compatibility.some(c => c.includes(brand) && c.includes(model));
    if (!compatible) return false;
    if (activeCategory && p.category !== activeCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="w-full mx-auto bg-white dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col md:flex-row">
       {/* Columna Izquierda: Selección de Vehículo */}
       <div className="w-full md:w-1/3 bg-zinc-50 dark:bg-zinc-900 p-8 md:p-10 border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Vehículo</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Selecciona los datos exactos para garantizar compatibilidad real.</p>
          </div>

          <div className="aspect-[4/3] w-full rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50 overflow-hidden relative flex items-center justify-center border border-zinc-200 dark:border-zinc-800/80">
             {vehiclePhoto ? (
               <>
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={vehiclePhoto} alt={`${brand} ${model}`} className="w-full h-full object-cover animate-in fade-in duration-700" />
               </>
             ) : (
               <div className="text-zinc-400 dark:text-zinc-500 flex flex-col items-center">
                 <svg className="w-10 h-10 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                 <span className="text-sm font-semibold tracking-wide">Esperando selección</span>
               </div>
             )}
          </div>

          <div className="flex flex-col gap-3">
            <select value={brand} onChange={e => { setBrand(e.target.value); setModel(""); setYear(""); setVersion(""); }} className="w-full h-14 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none shadow-sm cursor-pointer">
              <option value="" disabled>1. Marca</option>
              <option value="Toyota">Toyota</option>
              <option value="Nissan">Nissan</option>
            </select>
            
            <select value={model} onChange={e => { setModel(e.target.value); setYear(""); setVersion(""); }} disabled={!brand} className="w-full h-14 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="" disabled>2. Modelo</option>
              {brand === 'Toyota' && <option value="Corolla">Corolla</option>}
              {brand === 'Nissan' && <option value="Sentra">Sentra</option>}
            </select>

            <select value={year} onChange={e => { setYear(e.target.value); setVersion(""); }} disabled={!model} className="w-full h-14 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="" disabled>3. Año</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
            </select>

            <select value={version} onChange={e => setVersion(e.target.value)} disabled={!year} className="w-full h-14 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="" disabled>4. Versión / Motor</option>
              <option value="1.8L">1.8L</option>
              <option value="2.0L">2.0L</option>
            </select>
          </div>
       </div>

       {/* Columna Derecha: Búsqueda y Categorías */}
       <div className="w-full md:w-2/3 p-8 md:p-10 flex flex-col bg-white dark:bg-zinc-950">
         <div className="mb-8">
           <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">¿Qué necesitas?</h2>
           <p className="text-zinc-500 dark:text-zinc-400">Encuentra repuestos exactos y servicios garantizados.</p>
         </div>

         <div className="relative mb-10">
           <input 
             type="text" 
             placeholder="Ej. Filtro de aire, Aceite sintético..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             disabled={!isVehicleSelected}
             className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none transition-all disabled:opacity-50 font-medium"
           />
           <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
         </div>

         {!isVehicleSelected ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow opacity-40 pointer-events-none grayscale transition-all duration-500">
             {[
               { title: "Repuestos y accesorios", icon: "⚙️", desc: "Piezas y componentes" },
               { title: "Lubricantes", icon: "💧", desc: "Aceites y fluidos" },
               { title: "Filtros", icon: "🎛️", desc: "Aire, aceite y cabina" },
               { title: "Talleres y servicios", icon: "🛠️", desc: "Mantenimiento y revisión" }
             ].map(cat => (
               <div key={cat.title} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-4 bg-zinc-50 dark:bg-zinc-900/50">
                 <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-2xl shadow-sm">{cat.icon}</div>
                 <div>
                   <h4 className="font-bold text-zinc-900 dark:text-white">{cat.title}</h4>
                   <p className="text-sm text-zinc-500">{cat.desc}</p>
                 </div>
               </div>
             ))}
           </div>
         ) : (
           <div className="flex flex-col flex-grow animate-in fade-in duration-500">
             {/* Filtros de Categorías */}
             <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar mb-2">
               {['Repuestos', 'Lubricantes', 'Filtros', 'Servicios'].map(cat => (
                 <button 
                   key={cat} 
                   onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                   className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all border ${activeCategory === cat ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-md' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
                 >
                   {cat}
                 </button>
               ))}
             </div>

             {/* Resultados */}
             <div className="flex-grow rounded-2xl pt-4 overflow-y-auto max-h-[350px] pr-2">
                {filteredProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center space-y-3 py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                    <div>
                      <p className="font-bold text-zinc-700 dark:text-zinc-300">No hay existencias confirmadas</p>
                      <p className="text-sm mt-1">Modifica tu búsqueda o solicita una cotización.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.map(p => (
                      <div key={p.id} className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-shadow group">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-xl shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-700">
                            {p.isService ? '🛠️' : '📦'}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-white text-lg leading-tight">{p.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-md">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                                Compatible
                              </span>
                              {!p.isService && (
                                <span className="text-xs text-zinc-500 font-medium tracking-wide">
                                  {p.stock} disponibles
                                </span>
                              )}
                            </div>
                            {p.description && <p className="text-sm text-zinc-500 mt-2">{p.description}</p>}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0 border-t sm:border-t-0 border-zinc-200 dark:border-zinc-800 pt-4 sm:pt-0">
                          {p.price !== null ? (
                            <span className="font-black text-xl text-zinc-900 dark:text-white">${p.price.toFixed(2)}</span>
                          ) : (
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider bg-zinc-200/50 dark:bg-zinc-800 px-2 py-1 rounded">Precio por Diagnóstico</span>
                          )}
                          <button 
                            onClick={() => {
                              // Limitar y validar el contenido temporal (nunca guardar passwords o datos sensibles aquí)
                              const requestIntent = {
                                productId: p.id,
                                productName: p.name,
                                isService: p.isService,
                                vehicle: { brand, model, year, version },
                                timestamp: Date.now()
                              };
                              sessionStorage.setItem('autoG_pendingRequest', JSON.stringify(requestIntent));
                              window.location.href = '/registro';
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                          >
                            {p.isService ? 'Agendar' : 'Agregar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
           </div>
         )}
       </div>
    </div>
  );
}
