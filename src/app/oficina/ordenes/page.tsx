"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useState } from "react";

export default function OrdenesCotizaciones() {
  const [view, setView] = useState<"ordenes" | "cotizaciones">("cotizaciones");

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Link href="/oficina" className="hover:text-blue-600 transition-colors">Oficina</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Órdenes y Cotizaciones</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Gestión de Trabajos
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-10 px-4 rounded-xl bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Nueva Cotización
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4 border-amber-200 dark:border-amber-900/50">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⏳
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">12</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Cotizaciones Pendientes</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              🔧
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">8</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Órdenes en Taller</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              ✅
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">4</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Trabajos Terminados</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-xl flex-shrink-0">
              💰
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">$3.2k</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Cotizado (Semana)</h3>
            </div>
          </div>
        </div>

        {/* View Switcher & Filtros */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setView("cotizaciones")}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'cotizaciones' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Cotizaciones
            </button>
            <button 
              onClick={() => setView("ordenes")}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'ordenes' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Órdenes de Trabajo
            </button>
          </div>
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Buscar placa, cliente o #ID..." 
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-amber-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Tabla Dinámica */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Documento</th>
                  <th className="px-6 py-4 font-medium">Cliente / Vehículo</th>
                  <th className="px-6 py-4 font-medium">Creado</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Total</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {view === 'cotizaciones' ? [
                  { id: "COT-00105", client: "Ricardo Montero", vehicle: "PCE-1234 (Toyota Yaris)", date: "Hoy, 09:30 AM", status: "Pendiente Aprobación", total: "$185.00" },
                  { id: "COT-00104", client: "Logística Express", vehicle: "GBA-5678 (Hino)", date: "Ayer", status: "Aprobada", total: "$420.50" },
                  { id: "COT-00103", client: "Daniela Alvarado", vehicle: "GSD-9012 (Chevrolet)", date: "24 Oct 2026", status: "Rechazada", total: "$85.00" },
                  { id: "COT-00102", client: "Andrea Suárez", vehicle: "UBT-1122 (Ford 150)", date: "23 Oct 2026", status: "Facturada", total: "$310.00" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.client}</p>
                      <p className="text-xs text-zinc-500">{row.vehicle}</p>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.status === 'Pendiente Aprobación' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                        row.status === 'Aprobada' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                        row.status === 'Facturada' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                        'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">{row.total}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status === 'Pendiente Aprobación' && (
                          <button className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors" title="Aprobar Cotización">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          </button>
                        )}
                        <button className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors" title="Ver Detalles">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : [
                  { id: "ORD-00088", client: "Logística Express", vehicle: "GBA-5678 (Hino)", date: "Hoy, 10:15 AM", status: "En Taller", total: "$420.50" },
                  { id: "ORD-00087", client: "Carlos Villagómez", vehicle: "PBD-4567 (Hyundai)", date: "Ayer", status: "Esperando Repuestos", total: "$120.00" },
                  { id: "ORD-00086", client: "Andrea Suárez", vehicle: "UBT-1122 (Ford 150)", date: "23 Oct 2026", status: "Terminado", total: "$310.00" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.client}</p>
                      <p className="text-xs text-zinc-500">{row.vehicle}</p>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.status === 'Esperando Repuestos' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                        row.status === 'En Taller' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">{row.total}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors" title="Ver Orden">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
