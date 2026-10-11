"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

const clientesIniciales = [
  { id: "0923456789", name: "Ricardo Montero", type: "Personal", phone: "0991234567", email: "ricardo.m@email.com", vehicles: ["PCE-1234 (Toyota)", "GBA-5678 (Kia)"], lastVisit: "Hace 2 días", vip: true },
  { id: "1792345678001", name: "Logística Express S.A.", type: "Empresa", phone: "022345678", email: "flota@logistica.com", vehicles: ["Flota (15 vehículos)"], lastVisit: "Hoy", vip: true },
  { id: "0956781234", name: "Daniela Alvarado", type: "Personal", phone: "0987654321", email: "dani_alva@email.com", vehicles: ["GSD-9012 (Chevrolet)"], lastVisit: "Hace 3 meses", vip: false },
  { id: "0912345678", name: "Carlos Villagómez", type: "Personal", phone: "0998765432", email: "carlos.v@email.com", vehicles: ["PBD-4567 (Hyundai)"], lastVisit: "Hace 1 año", vip: false },
  { id: "0987654321", name: "Andrea Suárez", type: "Personal", phone: "0999888777", email: "andrea_s@email.com", vehicles: ["UBT-1122 (Ford)"], lastVisit: "Hace 1 semana", vip: false },
];

export default function GestionClientes() {
  const [clientes] = useState(clientesIniciales);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const clientesFiltrados = clientes.filter((row) => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = 
      row.name.toLowerCase().includes(q) ||
      row.id.includes(q) ||
      row.vehicles.some(v => v.toLowerCase().includes(q));

    if (!coincideBusqueda) return false;

    if (filtro === "flota") return row.vehicles.some(v => v.toLowerCase().includes("flota") || row.vehicles.length > 1);
    if (filtro === "empresa") return row.type === "Empresa";
    if (filtro === "vip") return row.vip;
    return true;
  });

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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Clientes</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Clientes
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                1,284
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/oficina/clientes/nuevo"
              className="h-10 px-4 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 shadow-sm shadow-blue-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
              Nuevo Cliente
            </Link>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              👥
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">1,284</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Clientes</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              🚗
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">1,840</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Vehículos</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⭐
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">142</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">VIP</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-xl flex-shrink-0">
              📅
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">18</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Nuevos</h3>
            </div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cédula, nombre o placa..." 
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>

          <div className="relative w-full md:w-auto">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full md:w-auto appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-medium rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
            >
              <option value="todos">Todos</option>
              <option value="flota">Con Flota (Múltiples Vehículos)</option>
              <option value="empresa">Empresas (RUC)</option>
              <option value="vip">⭐ VIP</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabla de Clientes */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Contacto</th>
                  <th className="px-6 py-4 font-medium">Vehículos</th>
                  <th className="px-6 py-4 font-medium">Última Visita</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {clientesFiltrados.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${row.type === 'Empresa' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                          {row.type === 'Empresa' ? '🏢' : row.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                            {row.vip && <span className="text-amber-500 text-xs" title="Cliente VIP">⭐</span>}
                          </div>
                          <p className="text-xs text-zinc-500">ID: {row.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-900 dark:text-zinc-300">{row.phone}</p>
                      <p className="text-xs text-zinc-500">{row.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {row.vehicles.map((v, idx) => (
                          <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium inline-block w-max">
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.lastVisit}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors" title="Agendar Cita">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        </button>
                        <button className="p-2 text-zinc-400 hover:text-blue-600 transition-colors" title="Ver Perfil">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando {clientesFiltrados.length} clientes</span>
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
