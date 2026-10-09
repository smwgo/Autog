"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

export default function InventarioGlobal() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Link href="/gerencia" className="hover:text-blue-600 transition-colors">Gerencia</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Inventario Global</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Control de Inventario
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
              Transferir Stock
            </button>
            <button className="h-10 px-4 rounded-xl bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Total Referencias</h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">1,245</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600">
              <span className="bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg">En catálogo</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Valorización</h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">$142k</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600">
              <span className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">Costo de inventario</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden border-rose-200 dark:border-rose-900/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-rose-600 dark:text-rose-400 text-sm font-medium mb-1">Stock Crítico</h3>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">18</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-rose-600">
              <span className="bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg">Requieren compra</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Transferencias</h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">3</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-purple-600">
              <span className="bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-lg">En tránsito</span>
            </div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            <button className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white whitespace-nowrap">Todos</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Lubricantes</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Filtros</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Frenos</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Stock Bajo
            </button>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <select className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-4 text-sm font-medium outline-none focus:border-amber-500 text-zinc-600 dark:text-zinc-400">
              <option>Todas las sucursales</option>
              <option>Sede Principal</option>
              <option>Sucursal Norte</option>
            </select>
            <div className="relative flex-grow lg:w-64">
              <input 
                type="text" 
                placeholder="Buscar por código o nombre..." 
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-amber-500"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </div>

        {/* Tabla de Inventario */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Código / Producto</th>
                  <th className="px-6 py-4 font-medium">Categoría</th>
                  <th className="px-6 py-4 font-medium text-right">Precio Venta</th>
                  <th className="px-6 py-4 font-medium text-center">Stock Principal</th>
                  <th className="px-6 py-4 font-medium text-center">Stock Norte</th>
                  <th className="px-6 py-4 font-medium text-center">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  { sku: "ACE-10W40-1L", name: "Aceite Sintético 10W-40 1L", cat: "Lubricantes", price: "$12.50", s1: 45, s2: 30, alert: false },
                  { sku: "FIL-ACE-001", name: "Filtro de Aceite Universal", cat: "Filtros", price: "$5.00", s1: 12, s2: 5, alert: true },
                  { sku: "PAS-FRE-DEL", name: "Pastillas de Freno Delanteras", cat: "Frenos", price: "$45.00", s1: 8, s2: 12, alert: false },
                  { sku: "BUI-NGK-01", name: "Bujía Iridium NGK", cat: "Eléctrico", price: "$8.50", s1: 0, s2: 4, alert: true },
                  { sku: "BAT-12V-60A", name: "Batería 12V 60Ah", cat: "Eléctrico", price: "$85.00", s1: 15, s2: 8, alert: false },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{row.sku}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                        {row.cat}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-zinc-100">{row.price}</td>
                    
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${row.s1 <= 5 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {row.s1}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${row.s2 <= 5 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {row.s2}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {row.alert ? (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-1 rounded-lg text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Reabastecer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-lg text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Óptimo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-zinc-400 hover:text-amber-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando 5 de 1,245 productos</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50" disabled>Anterior</button>
              <button className="px-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Siguiente</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
