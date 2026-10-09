"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

export default function ReportesFinancieros() {
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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Reportes Financieros</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Estados Financieros
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="month" 
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-sm font-medium outline-none focus:border-blue-500"
              defaultValue="2026-10"
            />
            <button className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Total Ingresos</h3>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">$45,230.00</p>
            <div className="mt-4 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 inline-block px-2 py-1 rounded-lg">
              +8.4% vs mes anterior
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Total Egresos</h3>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">$18,450.00</p>
            <div className="mt-4 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 inline-block px-2 py-1 rounded-lg">
              +1.2% vs mes anterior
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
            <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Flujo Neto</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">$26,780.00</p>
            <div className="mt-4 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 inline-block px-2 py-1 rounded-lg">
              Margen Saludable
            </div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white">Todos</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">Ventas</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">Compras</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">Impuestos SRI</button>
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Buscar transacción..." 
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Descripción</th>
                  <th className="px-6 py-4 font-medium">Categoría</th>
                  <th className="px-6 py-4 font-medium">Referencia</th>
                  <th className="px-6 py-4 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  { date: "24 Oct 2026", desc: "Pago Orden de Reparación #1042", cat: "Ventas", ref: "F-001-042", amount: "+ $450.00", isIncome: true },
                  { date: "24 Oct 2026", desc: "Compra Repuestos Proveedor A", cat: "Compras", ref: "OC-0091", amount: "- $120.00", isIncome: false },
                  { date: "23 Oct 2026", desc: "Venta Mostrador Repuestos", cat: "Ventas", ref: "F-001-041", amount: "+ $85.50", isIncome: true },
                  { date: "22 Oct 2026", desc: "Pago Servicios Básicos", cat: "Operativos", ref: "TRF-441", amount: "- $320.00", isIncome: false },
                  { date: "22 Oct 2026", desc: "Pago Orden de Reparación #1040", cat: "Ventas", ref: "F-001-040", amount: "+ $1,250.00", isIncome: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{row.date}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{row.desc}</td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                        {row.cat}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.ref}</td>
                    <td className={`px-6 py-4 text-right font-bold ${row.isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {row.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando 5 de 142 transacciones</span>
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
