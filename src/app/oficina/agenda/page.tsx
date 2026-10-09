"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useState } from "react";

export default function CitasAgenda() {
  const [currentDate] = useState("Jueves, 26 de Octubre");

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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Citas y Agenda</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Agenda Diaria
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Ver Calendario Mensual
            </button>
            <button className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Agendar Cita
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              📅
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">12</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Citas para Hoy</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4 border-amber-200 dark:border-amber-900/50">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⏳
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">3</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Vehículos en Espera</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              🚖
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">2 / 6</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Bahías Disponibles</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-xl flex-shrink-0">
              👨‍🔧
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">4</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Técnicos Activos</h3>
            </div>
          </div>
        </div>

        {/* Día y Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white min-w-[200px] text-center">{currentDate}</h2>
            <button className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
            <button className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white ml-2">Hoy</button>
          </div>
          
          <div className="flex gap-2">
            <select className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-sm font-medium outline-none focus:border-emerald-500 text-zinc-600 dark:text-zinc-400 shadow-sm">
              <option>Todos los Técnicos</option>
              <option>Carlos Ruiz</option>
              <option>José Mendoza</option>
              <option>Mario Cedeño</option>
            </select>
          </div>
        </div>

        {/* Tabla de Citas (Formato Timeline) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium w-24">Hora</th>
                  <th className="px-6 py-4 font-medium">Cliente / Vehículo</th>
                  <th className="px-6 py-4 font-medium">Servicio Solicitado</th>
                  <th className="px-6 py-4 font-medium">Asignación</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  { time: "08:00 AM", client: "Fernando López", vehicle: "PCE-1234 (Toyota)", service: "Mantenimiento 50k KM", tech: "Carlos Ruiz", bay: "Bahía 1", status: "En Curso" },
                  { time: "09:30 AM", client: "Andrea Suárez", vehicle: "UBT-1122 (Ford)", service: "Cambio de Pastillas de Freno", tech: "José Mendoza", bay: "Bahía 2", status: "Esperando" },
                  { time: "10:00 AM", client: "Logística Express", vehicle: "GBA-5678 (Hino)", service: "Revisión Preventiva Flota", tech: "Mario Cedeño", bay: "Elevador Principal", status: "Confirmada" },
                  { time: "11:30 AM", client: "Daniela Alvarado", vehicle: "GSD-9012 (Chevrolet)", service: "Diagnóstico Computarizado", tech: "Carlos Ruiz", bay: "Bahía 1", status: "Confirmada" },
                  { time: "02:00 PM", client: "Roberto Gómez", vehicle: "PBZ-8899 (Kia)", service: "Cambio de Aceite y Filtros", tech: "Sin Asignar", bay: "Por definir", status: "Solicitada" },
                  { time: "04:00 PM", client: "María Torres", vehicle: "GTC-5544 (Nissan)", service: "Alineación y Balanceo", tech: "Sin Asignar", bay: "Por definir", status: "Reprogramada" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.time}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.client}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{row.vehicle}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">{row.service}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${row.tech === 'Sin Asignar' ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'}`}>
                            {row.tech}
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{row.bay}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.status === 'En Curso' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                        row.status === 'Esperando' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                        row.status === 'Confirmada' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                        row.status === 'Solicitada' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' :
                        'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors" title="Iniciar Trabajo / Ingresar a Bahía">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                        <button className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors" title="Editar / Asignar Técnico">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
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
