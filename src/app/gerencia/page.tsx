"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

// Mock Data
const comparisonData = [
  { name: 'Lun', PRINCIPAL: 4000, SUCURSAL: 2400 },
  { name: 'Mar', PRINCIPAL: 3000, SUCURSAL: 1398 },
  { name: 'Mié', PRINCIPAL: 2000, SUCURSAL: 9800 },
  { name: 'Jue', PRINCIPAL: 2780, SUCURSAL: 3908 },
  { name: 'Vie', PRINCIPAL: 1890, SUCURSAL: 4800 },
  { name: 'Sáb', PRINCIPAL: 2390, SUCURSAL: 3800 },
  { name: 'Dom', PRINCIPAL: 3490, SUCURSAL: 4300 },
];

const profitData = [
  { month: 'Ene', Ingresos: 45000, Egresos: 28000, Utilidad: 17000 },
  { month: 'Feb', Ingresos: 52000, Egresos: 31000, Utilidad: 21000 },
  { month: 'Mar', Ingresos: 48000, Egresos: 29000, Utilidad: 19000 },
  { month: 'Abr', Ingresos: 61000, Egresos: 35000, Utilidad: 26000 },
];

export default function GerenciaDashboard() {
  const [dateFilter, setDateFilter] = useState("mes");
  const [locationFilter, setLocationFilter] = useState("CONSOLIDADO");

  return (
    <div className="space-y-6">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Centro de Control</h1>
          <p className="text-zinc-500 mt-1">Visión global e indicadores de rendimiento de la empresa.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={locationFilter} 
            onChange={(e) => setLocationFilter(e.target.value)}
            className="h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="CONSOLIDADO">🏢 Consolidado</option>
            <option value="PRINCIPAL">📍 Principal</option>
            <option value="SUCURSAL">📍 Sucursal</option>
          </select>
          
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mes</option>
            <option value="custom">Personalizado...</option>
          </select>
        </div>
      </div>

      {/* Top Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex items-center gap-4">
          <div className="text-red-500 text-2xl">⚠️</div>
          <div>
            <h4 className="text-red-800 dark:text-red-400 font-semibold text-sm">Inventario Crítico</h4>
            <p className="text-red-600 dark:text-red-500 text-xs mt-1">12 productos por debajo del stock mínimo.</p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-center gap-4">
          <div className="text-amber-500 text-2xl">💸</div>
          <div>
            <h4 className="text-amber-800 dark:text-amber-400 font-semibold text-sm">Cuentas en Mora</h4>
            <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">3 clientes superaron los 30 días de crédito.</p>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl flex items-center gap-4">
          <div className="text-blue-500 text-2xl">🛠️</div>
          <div>
            <h4 className="text-blue-800 dark:text-blue-400 font-semibold text-sm">Servicios Atrasados</h4>
            <p className="text-blue-600 dark:text-blue-500 text-xs mt-1">5 vehículos en Taller esperando repuestos.</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Ventas Netas</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">$124,500</p>
          <div className="mt-2 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full inline-flex">
            +14% vs mes ant.
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Utilidad Bruta</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">$45,200</p>
          <div className="mt-2 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full inline-flex">
            +8% vs mes ant.
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Órdenes Taller</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">142</p>
          <div className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Terminadas: 110 | Abiertas: 32
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Cuentas por Cobrar</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">$18,400</p>
          <div className="mt-2 text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full inline-flex">
            Mora: $4,200
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Comparison Chart */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Comparativa: Principal vs Sucursal</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Legend />
                <Bar dataKey="PRINCIPAL" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="SUCURSAL" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Trend */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Flujo y Utilidad (YTD)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Ingresos" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                <Line type="monotone" dataKey="Egresos" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} />
                <Line type="monotone" dataKey="Utilidad" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Inventario Valorizado */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Resumen de Inventario</h3>
            <button className="text-sm text-blue-600 hover:underline">Ver detalle</button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl">
              <div>
                <p className="font-medium text-sm">Valor Total Inventario</p>
                <p className="text-xs text-zinc-500">Costo de mercadería en almacén</p>
              </div>
              <p className="font-bold">$342,100.00</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl">
              <div>
                <p className="font-medium text-sm">Mayor Rotación</p>
                <p className="text-xs text-zinc-500">Aceites, Filtros, Pastillas de Freno</p>
              </div>
              <p className="font-bold">68%</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/50">
              <div>
                <p className="font-medium text-sm">Inventario Muerto</p>
                <p className="text-xs">Sin movimiento &gt; 6 meses</p>
              </div>
              <p className="font-bold">$12,450.00</p>
            </div>
          </div>
        </div>

        {/* Metas y RRHH */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Cumplimiento de Metas</h3>
            <button className="text-sm text-blue-600 hover:underline">Ver RRHH</button>
          </div>
          
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Ventas (Sucursal Norte)</span>
                <span className="text-zinc-500">$32k / $40k</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Servicios Taller (Principal)</span>
                <span className="text-zinc-500">110 / 100</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-green-600 mt-1">¡Meta superada (110%)!</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Cobranza de Cartera</span>
                <span className="text-zinc-500">$14k / $30k</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '46%' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
