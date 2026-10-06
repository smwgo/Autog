"use client";

import { useState } from "react";
import Link from "next/link";

const columns = [
  { id: "RECIBIDOS", title: "Recibidos", color: "border-blue-500" },
  { id: "EN_DIAGNOSTICO", title: "En Diagnóstico", color: "border-purple-500" },
  { id: "ESPERANDO_APROBACION", title: "Espera Aprobación", color: "border-amber-500" },
  { id: "APROBADO", title: "Aprobado", color: "border-green-400" },
  { id: "EN_TRABAJO", title: "En Trabajo", color: "border-blue-400" },
  { id: "ESPERANDO_REPUESTO", title: "Falta Repuesto", color: "border-red-500" },
  { id: "TERMINADO", title: "Terminado", color: "border-emerald-500" },
  { id: "LISTO_PARA_ENTREGA", title: "Listo Entrega", color: "border-emerald-600" },
];

export default function TallerDashboard() {
  
  // Mock data representing a WorkOrder
  const [orders, setOrders] = useState([
    {
      id: "OT-1042",
      client: "Juan Pérez",
      phone: "0991234567",
      vehicle: "Toyota RAV4",
      plate: "XYZ-789",
      mileage: 45000,
      service: "Cambio de aceite y filtros",
      problem: "Ruido al frenar",
      tech: "Carlos M.",
      timeIn: "08:30 AM",
      priority: "ALTA",
      status: "EN_TRABAJO"
    },
    {
      id: "OT-1043",
      client: "María López",
      phone: "0987654321",
      vehicle: "Nissan Versa",
      plate: "ABC-123",
      mileage: 22000,
      service: "Mantenimiento 20k",
      problem: "Ninguno",
      tech: "Sin Asignar",
      timeIn: "09:15 AM",
      priority: "NORMAL",
      status: "RECIBIDOS"
    },
    {
      id: "OT-1044",
      client: "Empresa Logística",
      phone: "0971122334",
      vehicle: "Hino Dutro",
      plate: "GHI-456",
      mileage: 120000,
      service: "Revisión suspensión",
      problem: "Golpe fuerte en baches",
      tech: "Carlos M.",
      timeIn: "07:00 AM",
      priority: "ALTA",
      status: "ESPERANDO_REPUESTO"
    }
  ]);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Tablero de Operaciones</h1>
          <p className="text-zinc-500 text-sm mt-1">Arrastra las órdenes o accede a ellas para registrar trabajos.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors">
             Mis Trabajos Activos (1)
           </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto flex gap-6 pb-4">
        {columns.map(col => (
          <div key={col.id} className="w-80 shrink-0 flex flex-col h-full bg-black/40 rounded-3xl border border-zinc-800 overflow-hidden">
            <div className={`p-4 border-t-4 ${col.color} bg-zinc-900/50 flex justify-between items-center`}>
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">{col.title}</h3>
              <span className="w-6 h-6 rounded-full bg-zinc-800 text-xs font-bold flex items-center justify-center text-zinc-400">
                {orders.filter(o => o.status === col.id).length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {orders.filter(o => o.status === col.id).map(order => (
                <div key={order.id} className="bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 rounded-2xl p-4 shadow-md transition-colors cursor-pointer group">
                  
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded">
                      {order.id}
                    </span>
                    {order.priority === "ALTA" && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Prioridad Alta"></span>
                    )}
                  </div>
                  
                  <h4 className="font-bold text-white text-lg leading-tight mb-1">{order.vehicle}</h4>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-mono font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 border border-zinc-700">{order.plate}</span>
                    <span className="text-xs text-zinc-500">{order.mileage} km</span>
                  </div>

                  <p className="text-xs text-zinc-400 mb-3 line-clamp-2">
                    <span className="font-bold text-zinc-300">Servicio:</span> {order.service}
                    <br/>
                    <span className="font-bold text-zinc-300">Problema:</span> {order.problem}
                  </p>

                  <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500">Tec:</span>
                      <span className="text-xs font-bold text-white">{order.tech}</span>
                    </div>
                    <Link href={`/taller/orden/${order.id}`} className="text-xs font-bold text-amber-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver Detalles →
                    </Link>
                  </div>
                </div>
              ))}
              
              {orders.filter(o => o.status === col.id).length === 0 && (
                <div className="h-24 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center text-xs font-bold text-zinc-600">
                  Sin vehículos
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
