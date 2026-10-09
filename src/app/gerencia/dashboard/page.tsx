"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

export default function DashboardGeneral() {
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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Dashboard General</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Resumen del Negocio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <select className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-sm font-medium outline-none focus:border-blue-500">
              <option>Hoy</option>
              <option>Esta semana</option>
              <option>Este mes</option>
              <option>Este año</option>
            </select>
            <button className="h-10 px-4 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors">
              Descargar Reporte
            </button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Ingresos (Hoy)", value: "$2,450.00", trend: "+12.5%", isUp: true, icon: "💵", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
            { label: "Órdenes Activas", value: "34", trend: "+4", isUp: true, icon: "🔧", color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10" },
            { label: "Ticket Promedio", value: "$185.50", trend: "-2.1%", isUp: false, icon: "🧾", color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
            { label: "Nuevos Clientes", value: "12", trend: "+15%", isUp: true, icon: "👥", color: "text-purple-500 bg-purple-50 dark:bg-purple-500/10" },
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${kpi.color}`}>
                  {kpi.icon}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${kpi.isUp ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-red-600 bg-red-50 dark:bg-red-500/10'}`}>
                  {kpi.trend}
                </span>
              </div>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{kpi.label}</h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Placeholder */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Ingresos vs Gastos</h3>
            <div className="flex-grow flex items-end justify-between gap-2 h-64 mt-auto">
              {/* Dummy Bars */}
              {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                <div key={i} className="w-full flex justify-center items-end gap-1 group">
                  <div className="w-1/2 bg-blue-500 rounded-t-sm transition-all hover:bg-blue-400" style={{ height: `${h}%` }}></div>
                  <div className="w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-t-sm transition-all hover:bg-zinc-300 dark:hover:bg-zinc-700" style={{ height: `${h * 0.6}%` }}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs font-medium text-zinc-400">
              <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Últimas Órdenes</h3>
            <div className="space-y-4 flex-grow">
              {[
                { id: "ORD-089", status: "Completado", client: "Juan Pérez", amount: "$350.00", color: "bg-emerald-500" },
                { id: "ORD-090", status: "En Proceso", client: "María Gómez", amount: "$120.00", color: "bg-blue-500" },
                { id: "ORD-091", status: "Pendiente", client: "Carlos Ruiz", amount: "$85.00", color: "bg-amber-500" },
                { id: "ORD-092", status: "Completado", client: "Ana Torres", amount: "$920.00", color: "bg-emerald-500" },
                { id: "ORD-093", status: "Cancelado", client: "Luis Silva", amount: "$0.00", color: "bg-red-500" },
              ].map((order, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${order.color}`}></div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{order.id}</p>
                      <p className="text-xs text-zinc-500">{order.client}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{order.amount}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Ver todas las órdenes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
