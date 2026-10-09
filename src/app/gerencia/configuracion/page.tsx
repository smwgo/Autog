"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useState } from "react";

export default function ConfiguracionSistema() {
  const [activeTab, setActiveTab] = useState("general");

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
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Configuración</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Ajustes Globales
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-10 px-6 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
              Guardar Cambios
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Menu de Ajustes (Tabs) */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-2 shadow-sm flex flex-col gap-1">
              <button 
                onClick={() => setActiveTab("general")}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                🏢 Datos de la Empresa
              </button>
              <button 
                onClick={() => setActiveTab("sucursales")}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${activeTab === 'sucursales' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                🏪 Sucursales
              </button>
              <button 
                onClick={() => setActiveTab("impuestos")}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${activeTab === 'impuestos' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                🧾 Facturación y SRI
              </button>
              <button 
                onClick={() => setActiveTab("notificaciones")}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${activeTab === 'notificaciones' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                🔔 Notificaciones
              </button>
              <button 
                onClick={() => setActiveTab("seguridad")}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${activeTab === 'seguridad' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
              >
                🛡️ Seguridad
              </button>
            </div>
          </div>

          {/* Área de Contenido */}
          <div className="flex-grow">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
              
              {/* Vista: Datos de la Empresa */}
              {activeTab === 'general' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    Datos de la Empresa
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 flex items-center gap-6 mb-2">
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col items-center justify-center text-zinc-400 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span className="text-[10px] font-medium">Subir Logo</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Logo de la Empresa</h3>
                        <p className="text-xs text-zinc-500 max-w-xs">Sube una imagen en formato PNG o JPG (máx. 2MB). Recomendado: 512x512px.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Razón Social</label>
                      <input type="text" defaultValue="AutoPro Servicios Automotrices S.A." className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Nombre Comercial</label>
                      <input type="text" defaultValue="AutoPro" className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">RUC</label>
                      <input type="text" defaultValue="0992345678001" className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Teléfono Principal</label>
                      <input type="text" defaultValue="04-234-5678" className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Dirección Matriz</label>
                      <input type="text" defaultValue="Av. de las Américas y Plaza Dañín, Guayaquil, Ecuador" className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-sm outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Vista: Sucursales (Placeholder visual) */}
              {activeTab === 'sucursales' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Sucursales Activas</h2>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Añadir Sucursal</button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/20">
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">Sede Principal <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">Matriz</span></h3>
                        <p className="text-sm text-zinc-500 mt-1">Av. de las Américas y Plaza Dañín</p>
                      </div>
                      <button className="p-2 text-zinc-400 hover:text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    </div>
                    <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/20">
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white">Sucursal Norte</h3>
                        <p className="text-sm text-zinc-500 mt-1">Vía a Samborondón Km 2.5</p>
                      </div>
                      <button className="p-2 text-zinc-400 hover:text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vista: Facturación */}
              {activeTab === 'impuestos' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    Facturación y SRI
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Porcentaje de IVA (%)</label>
                      <input type="number" defaultValue="15" className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Moneda del Sistema</label>
                      <select className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-sm outline-none focus:border-blue-500">
                        <option>Dólares (USD)</option>
                        <option>Euros (EUR)</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex items-start gap-4 mt-2">
                        <div className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
                        <div>
                          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Firma Electrónica (SRI)</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">La firma electrónica actual (*.p12) expira en 45 días. Recuerde actualizarla para no interrumpir la facturación.</p>
                          <button className="mt-3 text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700">Actualizar Firma</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vista: Notificaciones */}
              {activeTab === 'notificaciones' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    Alertas y Correos
                  </h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white">Alertas de Stock Bajo</h3>
                        <p className="text-sm text-zinc-500 mt-0.5">Enviar correo al administrador cuando un producto llegue al mínimo.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white">Recordatorios a Clientes</h3>
                        <p className="text-sm text-zinc-500 mt-0.5">Enviar WhatsApp/Email 24h antes de una cita agendada.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white">Resumen Diario de Caja</h3>
                        <p className="text-sm text-zinc-500 mt-0.5">Enviar reporte automático al correo gerencial al cerrar el día.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Vista: Seguridad */}
              {activeTab === 'seguridad' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    Seguridad y Respaldos
                  </h2>
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                      <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Backups Automáticos</h3>
                      <p className="text-sm text-zinc-500 mb-4">La base de datos se respalda de manera segura cada 12 horas en la nube.</p>
                      <button className="text-sm font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Descargar último Backup (.sql)
                      </button>
                    </div>
                    
                    <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-500/5">
                      <h3 className="font-bold text-rose-700 dark:text-rose-400 mb-1">Cierre de Sesiones Activas</h3>
                      <p className="text-sm text-rose-600/70 dark:text-rose-400/70 mb-4">Obliga a todos los empleados en todas las sucursales a volver a iniciar sesión.</p>
                      <button className="text-sm font-bold text-white bg-rose-600 px-4 py-2 rounded-xl hover:bg-rose-700 transition-colors">
                        Cerrar Todas las Sesiones
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
