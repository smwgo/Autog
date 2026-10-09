"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useState } from "react";

export default function FacturacionSRI() {
  const [tab, setTab] = useState<"facturas" | "notas">("facturas");

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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Facturación y SRI</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Documentos Electrónicos
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-10 px-4 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Emitir Factura Manual
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              💵
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">$1,840</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Facturado (Hoy)</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4 border-amber-200 dark:border-amber-900/50">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⏳
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">3</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Pendientes de Autorizar</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4 border-rose-200 dark:border-rose-900/50">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-xl flex-shrink-0">
              ❌
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">1</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Documento Rechazado</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              🧾
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">14</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Notas de Crédito (Mes)</h3>
            </div>
          </div>
        </div>

        {/* View Switcher & Filtros */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setTab("facturas")}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'facturas' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Facturas
            </button>
            <button 
              onClick={() => setTab("notas")}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'notas' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Notas de Crédito
            </button>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-4 text-sm font-medium outline-none focus:border-purple-500 text-zinc-600 dark:text-zinc-400 hidden md:block">
              <option>Octubre 2026</option>
              <option>Septiembre 2026</option>
            </select>
            <div className="relative flex-grow md:w-72">
              <input 
                type="text" 
                placeholder="Buscar cliente o # documento..." 
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-purple-500"
              />
              <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </div>

        {/* Tabla Dinámica */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium"># Documento</th>
                  <th className="px-6 py-4 font-medium">Fecha</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium text-right">Total</th>
                  <th className="px-6 py-4 font-medium text-center">Estado SRI</th>
                  <th className="px-6 py-4 font-medium text-right">Clave Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tab === 'facturas' ? [
                  { id: "001-001-00001042", date: "Hoy, 10:45 AM", client: "Ricardo Montero", ruc: "0923456789", total: "$350.00", status: "Autorizado", key: "...89012" },
                  { id: "001-001-00001041", date: "Hoy, 09:30 AM", client: "Logística Express S.A.", ruc: "1792345678001", total: "$1,250.00", status: "Autorizado", key: "...89011" },
                  { id: "001-001-00001040", date: "Hoy, 08:15 AM", client: "Daniela Alvarado", ruc: "0956781234", total: "$85.50", status: "Rechazado", key: "N/A" },
                  { id: "001-001-00001039", date: "Ayer", client: "Consumidor Final", ruc: "9999999999", total: "$15.00", status: "Pendiente", key: "Procesando..." },
                  { id: "001-001-00001038", date: "Ayer", client: "Carlos Villagómez", ruc: "0912345678", total: "$420.00", status: "Autorizado", key: "...89008" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{row.id}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.date}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.client}</p>
                      <p className="text-xs text-zinc-500">{row.ruc}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">{row.total}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.status === 'Pendiente' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                        row.status === 'Autorizado' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                        'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                      }`}>
                        {row.status}
                      </span>
                      {row.status === 'Rechazado' && (
                        <p className="text-[10px] text-rose-500 mt-1">Firma inválida</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs font-mono text-zinc-400">{row.key}</span>
                        <button className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors" title="Descargar PDF">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : [
                  { id: "001-001-00000015", date: "24 Oct 2026", client: "Ricardo Montero", ref: "Aplica a F-1042", total: "$50.00", status: "Autorizado", key: "...NC015" },
                  { id: "001-001-00000014", date: "20 Oct 2026", client: "Andrea Suárez", ref: "Aplica a F-1020", total: "$310.00", status: "Autorizado", key: "...NC014" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{row.id}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.date}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.client}</p>
                      <p className="text-xs text-zinc-500">{row.ref}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600 dark:text-rose-400">- {row.total}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs font-mono text-zinc-400">{row.key}</span>
                        <button className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors" title="Descargar PDF">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando {tab === 'facturas' ? '5' : '2'} documentos</span>
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
