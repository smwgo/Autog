"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

export default function CajaLiquidaciones() {
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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Caja y Liquidaciones</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
              Flujo de Caja Diaria
              <span className="text-sm font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                CAJA ABIERTA
              </span>
            </h1>
            <p className="text-sm text-zinc-500 mt-2">Apertura: Hoy, 08:00 AM por Ana Torres</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Ingreso / Egreso Manual
            </button>
            <button className="h-10 px-6 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition-colors shadow-sm">
              Cerrar Caja (Cuadre)
            </button>
          </div>
        </div>

        {/* Resumen por Método de Pago */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg flex-shrink-0">
                💵
              </div>
              <span className="text-xs font-bold text-zinc-500">Saldo Actual</span>
            </div>
            <div>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-0.5">Efectivo en Caja</h3>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">$485.50</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-lg flex-shrink-0">
                💳
              </div>
            </div>
            <div>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-0.5">Tarjetas (POS)</h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">$1,240.00</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-lg flex-shrink-0">
                🏦
              </div>
            </div>
            <div>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-0.5">Transferencias</h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">$850.00</p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500 opacity-5 rounded-bl-full -mr-4 -mt-4"></div>
          </div>

          <div className="bg-teal-600 p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col justify-between text-white border border-teal-500">
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">
                📊
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-teal-100 text-sm font-medium mb-0.5">Total Ingresos del Turno</h3>
              <p className="text-3xl font-bold">$2,575.50</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-bl-full -mr-4 -mt-4"></div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            <button className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white whitespace-nowrap">Todas las Transacciones</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Solo Efectivo</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Tarjetas</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap flex items-center gap-1 text-rose-500">
              Egresos / Salidas
            </button>
          </div>
          <div className="relative w-full lg:w-72">
            <input 
              type="text" 
              placeholder="Buscar recibo o factura..." 
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-teal-500"
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
                  <th className="px-6 py-4 font-medium">Hora</th>
                  <th className="px-6 py-4 font-medium">Concepto</th>
                  <th className="px-6 py-4 font-medium">Método de Pago</th>
                  <th className="px-6 py-4 font-medium">Referencia</th>
                  <th className="px-6 py-4 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  { time: "10:45 AM", concept: "Cobro Factura F-001-1042", method: "Tarjeta Crédito (POS)", ref: "Voucher #4592", amount: "+ $350.00", isIncome: true },
                  { time: "09:30 AM", concept: "Cobro Factura F-001-1041", method: "Transferencia Banco Pichincha", ref: "Comprobante #990123", amount: "+ $1,250.00", isIncome: true },
                  { time: "09:15 AM", concept: "Pago proveedor de agua (Botellones)", method: "Efectivo", ref: "Vale de Caja #12", amount: "- $15.00", isIncome: false },
                  { time: "08:30 AM", concept: "Venta Mostrador (Filtros)", method: "Efectivo", ref: "F-001-1040", amount: "+ $45.50", isIncome: true },
                  { time: "08:00 AM", concept: "Fondo de Apertura (Caja Chica)", method: "Efectivo", ref: "Apertura Turno", amount: "+ $100.00", isIncome: true, isBase: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.time}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${row.isBase ? 'text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {row.concept}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
                        row.method.includes('Efectivo') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                        row.method.includes('Tarjeta') ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                        'bg-purple-50 text-purple-600 dark:bg-purple-500/10'
                      }`}>
                        {row.method.includes('Efectivo') ? '💵' : row.method.includes('Tarjeta') ? '💳' : '🏦'}
                        {row.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.ref}</td>
                    <td className={`px-6 py-4 text-right font-bold ${
                      row.isBase ? 'text-zinc-500 dark:text-zinc-400' :
                      row.isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {row.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando 5 transacciones del turno actual</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50" disabled>Anterior</button>
              <button className="px-3 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50" disabled>Siguiente</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
