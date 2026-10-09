"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

export default function MiPerfilPage() {
  const [activeTab, setActiveTab] = useState('personales'); // personales, seguridad, notificaciones
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-5xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/cliente" className="text-sm font-medium text-zinc-600 hover:text-zinc-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-zinc-500 bg-opacity-10 flex items-center justify-center text-2xl">
                ⚙️
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Mi Perfil
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Actualiza tus datos de contacto y preferencias.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar / Tabs */}
          <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
            <button 
              onClick={() => setActiveTab('personales')}
              className={`text-left px-5 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'personales' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
            >
              👤 Datos Personales
            </button>
            <button 
              onClick={() => setActiveTab('seguridad')}
              className={`text-left px-5 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'seguridad' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
            >
              🔒 Seguridad
            </button>
            <button 
              onClick={() => setActiveTab('notificaciones')}
              className={`text-left px-5 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === 'notificaciones' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
            >
              🔔 Notificaciones
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-grow">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden p-6 md:p-10 relative">
              
              {/* Toast de éxito guardando */}
              <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-emerald-500/20 transition-all duration-300 ${isSaved ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                Cambios guardados con éxito
              </div>

              {activeTab === 'personales' && (
                <form onSubmit={handleSave} className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Datos Personales</h2>
                  
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-4xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      👤
                    </div>
                    <div>
                      <button type="button" className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold rounded-xl transition-colors mb-2 block text-sm">
                        Cambiar Avatar
                      </button>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">JPG, GIF o PNG. Max 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Nombre Completo</label>
                      <input 
                        type="text" 
                        defaultValue="Juan Pérez"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">RFC / Documento</label>
                      <input 
                        type="text" 
                        defaultValue="XAXX010101000"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Correo Electrónico</label>
                      <input 
                        type="email" 
                        defaultValue="juan@ejemplo.com"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Teléfono Móvil</label>
                      <input 
                        type="tel" 
                        defaultValue="+52 555 123 4567"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Dirección de Facturación</label>
                      <input 
                        type="text" 
                        defaultValue="Av. Principal 123, Col. Centro, CP 01000"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                    <button type="submit" className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-8 py-3.5 rounded-2xl font-bold transition-colors shadow-lg">
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'seguridad' && (
                <form onSubmit={handleSave} className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Seguridad y Contraseña</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Contraseña Actual</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Nueva Contraseña</label>
                        <input 
                          type="password" 
                          placeholder="Mínimo 8 caracteres"
                          className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Confirmar Contraseña</label>
                        <input 
                          type="password" 
                          placeholder="Repite la nueva contraseña"
                          className="w-full px-4 py-3.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                    <button type="submit" className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-8 py-3.5 rounded-2xl font-bold transition-colors shadow-lg">
                      Actualizar Contraseña
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'notificaciones' && (
                <form onSubmit={handleSave} className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Preferencias de Notificación</h2>
                  
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white">Recordatorios de Servicio</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Recibe alertas cuando tu auto necesite mantenimiento.</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-zinc-900 dark:accent-white" />
                    </label>

                    <label className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white">Estado de Reparaciones</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Actualizaciones en tiempo real por SMS sobre trabajos en curso.</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-zinc-900 dark:accent-white" />
                    </label>

                    <label className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white">Promociones y Ofertas</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Descuentos exclusivos en repuestos y mano de obra.</p>
                      </div>
                      <input type="checkbox" className="w-5 h-5 accent-zinc-900 dark:accent-white" />
                    </label>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                    <button type="submit" className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-8 py-3.5 rounded-2xl font-bold transition-colors shadow-lg">
                      Guardar Preferencias
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
