"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useState } from "react";

export default function ComprasProveedores() {
  const [tab, setTab] = useState<"proveedores" | "ordenes">("proveedores");

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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Compras y Proveedores</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Gestión de Abastecimiento
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {tab === 'proveedores' ? (
              <button className="h-10 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Nuevo Proveedor
              </button>
            ) : (
              <button className="h-10 px-4 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Crear Orden de Compra
              </button>
            )}
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 text-xl flex-shrink-0">
              🤝
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">42</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Proveedores Activos</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4 border-rose-200 dark:border-rose-900/50">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-xl flex-shrink-0">
              💵
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">$4,250</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Cuentas por Pagar</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4 border-amber-200 dark:border-amber-900/50">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⏳
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">5</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Órdenes en Tránsito</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              📦
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">$12.4k</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Compras (Mes)</h3>
            </div>
          </div>
        </div>

        {/* View Switcher & Filtros */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setTab("proveedores")}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'proveedores' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Directorio de Proveedores
            </button>
            <button 
              onClick={() => setTab("ordenes")}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'ordenes' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Órdenes de Compra
            </button>
          </div>
          
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder={tab === 'proveedores' ? "Buscar proveedor o RUC..." : "Buscar orden OC-..."} 
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-indigo-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Tabla Dinámica */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                {tab === 'proveedores' ? (
                  <tr>
                    <th className="px-6 py-4 font-medium">Proveedor / RUC</th>
                    <th className="px-6 py-4 font-medium">Contacto</th>
                    <th className="px-6 py-4 font-medium">Categorías</th>
                    <th className="px-6 py-4 font-medium text-right">Saldo por Pagar</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-6 py-4 font-medium"># Orden</th>
                    <th className="px-6 py-4 font-medium">Proveedor</th>
                    <th className="px-6 py-4 font-medium">Fecha Esperada</th>
                    <th className="px-6 py-4 font-medium text-right">Total</th>
                    <th className="px-6 py-4 font-medium text-center">Estado</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tab === 'proveedores' ? [
                  { name: "Importadora AutoParts Cía. Ltda.", ruc: "0991234567001", contact: "Mario Valdés", email: "ventas@autoparts.com", cats: ["Lubricantes", "Filtros"], balance: "$1,250.00" },
                  { name: "Frenos del Pacífico S.A.", ruc: "1792345678001", contact: "Lucía Paredes", email: "pedidos@frenospac.com", cats: ["Frenos"], balance: "$0.00" },
                  { name: "Distribuidora Eléctrica Motors", ruc: "0998765432001", contact: "Carlos Ruiz", email: "carlos@emotors.com", cats: ["Eléctrico", "Baterías"], balance: "$3,000.00" },
                  { name: "Herramientas y Equipos Industriales", ruc: "1798887776001", contact: "Ana Torres", email: "info@herramientasec.com", cats: ["Equipos Taller"], balance: "$0.00" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{row.ruc}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-900 dark:text-zinc-300 font-medium">{row.contact}</p>
                      <p className="text-xs text-zinc-500">{row.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {row.cats.map((c, idx) => (
                          <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${row.balance === '$0.00' ? 'text-zinc-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {row.balance}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.balance !== '$0.00' && (
                          <button className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors" title="Registrar Pago">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </button>
                        )}
                        <button className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors" title="Ver Perfil">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : [
                  { id: "OC-00105", provider: "Importadora AutoParts Cía. Ltda.", date: "Hoy", total: "$450.00", status: "En Tránsito" },
                  { id: "OC-00104", provider: "Distribuidora Eléctrica Motors", date: "Mañana", total: "$1,200.00", status: "Solicitado" },
                  { id: "OC-00103", provider: "Frenos del Pacífico S.A.", date: "24 Oct 2026", total: "$280.00", status: "Recibido" },
                  { id: "OC-00102", provider: "Importadora AutoParts Cía. Ltda.", date: "22 Oct 2026", total: "$800.00", status: "Borrador" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{row.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.provider}</p>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.date}</td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">{row.total}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.status === 'Borrador' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' :
                        row.status === 'Solicitado' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                        row.status === 'En Tránsito' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status === 'En Tránsito' && (
                          <button className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors" title="Marcar como Recibido">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          </button>
                        )}
                        <button className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors" title="Ver PDF / Imprimir">
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
            <span>Mostrando 4 registros</span>
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
