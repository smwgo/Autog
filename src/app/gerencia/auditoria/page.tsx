"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

export default function AuditoriaSistema() {
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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Auditoría de Sistema</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Registro de Actividades
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
              Descargar Logs
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              📝
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">1,452</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Eventos (24h)</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⚠️
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">12</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Modificaciones</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-xl flex-shrink-0">
              ⛔
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">3</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Alertas Críticas</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              🔐
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">45</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Inicios de Sesión</h3>
            </div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            <button className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white whitespace-nowrap">Todos los eventos</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Inicios de sesión</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Facturación</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Inventario</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Críticos
            </button>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <select className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-4 text-sm font-medium outline-none focus:border-red-500 text-zinc-600 dark:text-zinc-400">
              <option>Últimas 24 horas</option>
              <option>Últimos 7 días</option>
              <option>Último mes</option>
            </select>
          </div>
        </div>

        {/* Tabla de Auditoría */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Fecha y Hora</th>
                  <th className="px-6 py-4 font-medium">Usuario / IP</th>
                  <th className="px-6 py-4 font-medium">Módulo</th>
                  <th className="px-6 py-4 font-medium">Acción Realizada</th>
                  <th className="px-6 py-4 font-medium">Detalles (Antes -> Después)</th>
                  <th className="px-6 py-4 font-medium text-center">Nivel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  { date: "Hoy, 10:45:12 AM", user: "Ana Torres (Cajera)", ip: "192.168.1.45", mod: "Caja/POS", action: "Anulación de Factura", details: "Factura F-001-089 anulada. Motivo: Error de digitación", level: "CRÍTICO" },
                  { date: "Hoy, 10:15:00 AM", user: "Carlos Ruiz (Mecánico)", ip: "192.168.1.112", mod: "Taller", action: "Cierre de Orden", details: "Orden de Trabajo #1042 marcada como 'Completada'", level: "INFO" },
                  { date: "Hoy, 09:30:22 AM", user: "Juan Pérez (Gerente)", ip: "192.168.1.10", mod: "Inventario", action: "Modificación de Precio", details: "Batería 12V 60Ah: Precio $80.00 -> $85.00", level: "ADVERTENCIA" },
                  { date: "Hoy, 09:15:05 AM", user: "Ana Torres (Cajera)", ip: "192.168.1.45", mod: "Sistema", action: "Inicio de Sesión", details: "Login exitoso desde Sede Principal", level: "INFO" },
                  { date: "Hoy, 08:05:40 AM", user: "Sistema", ip: "localhost", mod: "Inventario", action: "Alerta de Stock", details: "Aceite Sintético 10W-40: Stock menor a mínimo (4 unidades)", level: "ADVERTENCIA" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{row.date}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.user}</p>
                      <p className="text-xs text-zinc-500">{row.ip}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                        {row.mod}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-800 dark:text-zinc-200">{row.action}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs max-w-xs truncate" title={row.details}>
                      {row.details}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.level === 'CRÍTICO' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                        row.level === 'ADVERTENCIA' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                        'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      }`}>
                        {row.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando 5 eventos recientes</span>
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
