"use client";

import { useState } from "react";
import Link from "next/link";

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  // Mock data representing the specific WorkOrder
  const [activeTab, setActiveTab] = useState("INFO"); // INFO, INSPECCION, TRABAJOS, REPUESTOS
  
  const [inspection, setInspection] = useState([
    { id: 1, category: "Frenos", status: "AMARILLO", note: "Pastillas delanteras al 30%" },
    { id: 2, category: "Neumáticos", status: "VERDE", note: "Presión correcta, buen dibujo" },
    { id: 3, category: "Suspensión", status: "ROJO", note: "Amortiguador derecho con fuga" },
  ]);

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white overflow-hidden">
      
      {/* Top Bar Navigation */}
      <header className="h-16 border-b border-zinc-800 flex items-center px-6 shrink-0 gap-4">
        <Link href="/taller" className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors">
          ←
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-3">
            <span className="text-amber-500">{params.id}</span>
            <span>Toyota RAV4 (XYZ-789)</span>
            <span className="px-2 py-1 text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded uppercase tracking-wider">
              EN TRABAJO
            </span>
          </h1>
        </div>
        <div className="ml-auto flex gap-2">
           {/* Time tracking start/pause */}
           <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
             ▶ Iniciar Trabajo
           </button>
           <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm font-bold shadow-lg transition-colors flex items-center gap-2">
             ✓ Terminar
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Nav Tabs */}
        <div className="w-48 bg-black border-r border-zinc-800 flex flex-col gap-2 p-4 shrink-0">
          <button onClick={() => setActiveTab("INFO")} className={`p-3 rounded-xl text-left text-sm font-bold transition-colors ${activeTab === "INFO" ? "bg-zinc-800 text-amber-500" : "text-zinc-500 hover:text-white"}`}>
            ℹ️ Información
          </button>
          <button onClick={() => setActiveTab("INSPECCION")} className={`p-3 rounded-xl text-left text-sm font-bold transition-colors ${activeTab === "INSPECCION" ? "bg-zinc-800 text-amber-500" : "text-zinc-500 hover:text-white"}`}>
            🔍 Inspección (Checklist)
          </button>
          <button onClick={() => setActiveTab("TRABAJOS")} className={`p-3 rounded-xl text-left text-sm font-bold transition-colors ${activeTab === "TRABAJOS" ? "bg-zinc-800 text-amber-500" : "text-zinc-500 hover:text-white"}`}>
            🔧 Trabajos
          </button>
          <button onClick={() => setActiveTab("REPUESTOS")} className={`p-3 rounded-xl text-left text-sm font-bold transition-colors ${activeTab === "REPUESTOS" ? "bg-zinc-800 text-amber-500" : "text-zinc-500 hover:text-white"}`}>
            ⚙️ Repuestos
          </button>
          <button className="p-3 rounded-xl text-left text-sm font-bold text-zinc-500 hover:text-white transition-colors mt-auto flex items-center gap-2">
            📷 Subir Fotos
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50">
          
          {activeTab === "INFO" && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-black p-6 rounded-3xl border border-zinc-800">
                <h3 className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-4">Datos del Vehículo</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Cliente</p>
                    <p className="font-bold text-lg">Juan Pérez</p>
                    <p className="text-sm text-zinc-400">0991234567</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Vehículo / Placa</p>
                    <p className="font-bold text-lg">Toyota RAV4 <span className="text-amber-500 bg-amber-500/10 px-2 rounded ml-2">XYZ-789</span></p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Kilometraje Actual</p>
                    <p className="font-bold text-lg">45,000 km</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">Motor</p>
                    <p className="font-bold text-lg">2.5L Gasolina</p>
                  </div>
                </div>
              </div>

              <div className="bg-black p-6 rounded-3xl border border-zinc-800">
                 <h3 className="text-zinc-500 text-sm font-bold uppercase tracking-wider mb-4">Motivo de Ingreso</h3>
                 <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                   <p className="font-bold text-amber-400">Problema Reportado:</p>
                   <p className="mt-1">Ruido al frenar en la llanta delantera derecha.</p>
                 </div>
                 <div className="mt-4">
                   <p className="font-bold text-white mb-2">Servicios solicitados (POS):</p>
                   <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
                     <li>Revisión de frenos (Diagnóstico)</li>
                     <li>Cambio de aceite y filtros</li>
                   </ul>
                 </div>
              </div>
            </div>
          )}

          {activeTab === "INSPECCION" && (
            <div className="max-w-4xl space-y-6">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold">Checklist de Inspección</h2>
                <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-colors">
                  + Agregar Punto
                </button>
              </div>

              <div className="space-y-4">
                {inspection.map(item => (
                  <div key={item.id} className="bg-black border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="w-1/4 font-bold text-lg">{item.category}</div>
                    
                    <div className="flex gap-2 shrink-0">
                       <button className={`w-12 h-10 rounded-xl border-2 transition-all ${item.status === 'VERDE' ? 'bg-green-500 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-zinc-900 border-zinc-700 hover:border-green-500/50'}`}></button>
                       <button className={`w-12 h-10 rounded-xl border-2 transition-all ${item.status === 'AMARILLO' ? 'bg-amber-500 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-zinc-900 border-zinc-700 hover:border-amber-500/50'}`}></button>
                       <button className={`w-12 h-10 rounded-xl border-2 transition-all ${item.status === 'ROJO' ? 'bg-red-500 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-zinc-900 border-zinc-700 hover:border-red-500/50'}`}></button>
                    </div>

                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={item.note} 
                        readOnly
                        placeholder="Observaciones..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl h-10 px-4 text-sm outline-none focus:border-amber-500"
                      />
                    </div>

                    <button className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex items-center justify-center transition-colors">
                      📷
                    </button>
                  </div>
                ))}

                {/* Additional recommendation flow when Yellow/Red is marked */}
                <div className="mt-6 p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl">
                  <h3 className="font-bold text-amber-500 mb-2">Recomendar Trabajo Adicional</h3>
                  <p className="text-sm text-zinc-400 mb-4">Se detectaron puntos críticos (Rojo/Amarillo). Envíe una propuesta al cliente para su aprobación vía POS.</p>
                  <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-lg transition-colors">
                    Crear Propuesta de Trabajo
                  </button>
                </div>

              </div>
            </div>
          )}

          {activeTab === "TRABAJOS" && (
            <div className="max-w-4xl space-y-6">
              <h2 className="text-2xl font-bold mb-6">Trabajos a Realizar</h2>
              
              {/* Specialized Oil Change Flow */}
              <div className="bg-black border border-zinc-800 p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-amber-500">🛢️ Cambio de Aceite</h3>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-bold uppercase">Hecho</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Lubricante Utilizado</span>
                    <span className="font-bold">Aceite Sintético 5W-30 (4 Litros)</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Filtro</span>
                    <span className="font-bold">Filtro Original TOY-992</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block mb-1">Km Actual</span>
                    <span className="font-bold">45,000 km</span>
                  </div>
                  <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/30">
                    <span className="text-blue-400 block mb-1">Próximo Mantenimiento</span>
                    <span className="font-bold text-blue-300">55,000 km</span>
                  </div>
                </div>
              </div>

              {/* Regular Service */}
              <div className="bg-black border border-zinc-800 p-6 rounded-3xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Revisión de Frenos</h3>
                  <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors border border-zinc-700">
                    Marcar Completado
                  </button>
                </div>
                <textarea 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-amber-500 resize-none h-24"
                  placeholder="Detalles del trabajo realizado..."
                ></textarea>
              </div>
            </div>
          )}

          {activeTab === "REPUESTOS" && (
            <div className="max-w-4xl space-y-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Uso de Repuestos</h2>
                  <p className="text-zinc-500 text-sm mt-1">Busca y descarga los repuestos del inventario para esta orden.</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                  + Agregar Repuesto
                </button>
              </div>

              <div className="bg-black border border-zinc-800 rounded-3xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-zinc-500 bg-zinc-900 border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Repuesto / SKU</th>
                      <th className="px-6 py-4 text-center">Cantidad</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-800 hover:bg-zinc-900/50">
                      <td className="px-6 py-4">
                        <p className="font-bold">Pastillas de Freno Delanteras</p>
                        <p className="text-xs text-zinc-500 font-mono">SKU-BRK-001</p>
                      </td>
                      <td className="px-6 py-4 text-center font-bold">1 set</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-bold">APLICADO</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-zinc-500">-</span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-800 hover:bg-zinc-900/50">
                      <td className="px-6 py-4">
                        <p className="font-bold">Amortiguador Derecho</p>
                        <p className="text-xs text-zinc-500 font-mono">SKU-SUS-092</p>
                      </td>
                      <td className="px-6 py-4 text-center font-bold">1</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold">FALTA STOCK</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors">
                          Avisar Oficina
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
