"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

export default function GestionPersonal() {
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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Gestión de Personal</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Directorio de Empleados
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-10 px-4 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Nuevo Empleado
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-xl flex-shrink-0">
              👥
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">24</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Total Empleados</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              ✅
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">22</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Activos</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-xl flex-shrink-0">
              ⏸️
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">2</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Inactivos / Vacaciones</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              🏢
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">3</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Sucursales</h3>
            </div>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            <button className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-white whitespace-nowrap">Todos</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Taller</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Ventas / POS</button>
            <button className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors whitespace-nowrap">Administración</button>
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Buscar empleado..." 
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-purple-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Tabla de Personal */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Empleado</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium">Ubicación</th>
                  <th className="px-6 py-4 font-medium">Último Acceso</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  { name: "Carlos Ruiz", email: "carlos@autopro.com", role: "Mecánico Senior", roleType: "TALLER", location: "Sucursal Norte", lastLogin: "Hoy, 08:30 AM", status: "Activo" },
                  { name: "Ana Torres", email: "ana@autopro.com", role: "Cajera", roleType: "POS", location: "Sede Principal", lastLogin: "Hoy, 09:15 AM", status: "Activo" },
                  { name: "Juan Pérez", email: "juan@autopro.com", role: "Gerente Sucursal", roleType: "GERENCIA", location: "Sucursal Norte", lastLogin: "Ayer", status: "Activo" },
                  { name: "María Gómez", email: "maria@autopro.com", role: "Atención Cliente", roleType: "OFICINA", location: "Sede Principal", lastLogin: "Hace 2 días", status: "Vacaciones" },
                  { name: "Luis Silva", email: "luis@autopro.com", role: "Supervisor", roleType: "SUPERVISOR", location: "Ambas", lastLogin: "Hoy, 07:45 AM", status: "Activo" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
                          {row.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.name}</p>
                          <p className="text-xs text-zinc-500">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                        {row.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.location}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.lastLogin}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${row.status === 'Activo' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-zinc-400 hover:text-purple-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando 5 de 24 empleados</span>
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
