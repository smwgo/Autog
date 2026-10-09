"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

const MY_VEHICLES = [
  { id: 'VEH-001', name: 'Toyota Hilux 2020', plate: 'ABC-123' },
  { id: 'VEH-002', name: 'Honda Civic 2018', plate: 'XYZ-987' },
  { id: 'VEH-003', name: 'Ford Escape 2021', plate: 'QWE-554' }
];

const SERVICES = [
  { id: 'SRV-01', name: 'Mantenimiento Preventivo (Cambio de aceite, filtros)', time: '1-2 hrs' },
  { id: 'SRV-02', name: 'Revisión General y Diagnóstico', time: '1 hr' },
  { id: 'SRV-03', name: 'Cambio de Pastillas de Freno', time: '2 hrs' },
  { id: 'SRV-04', name: 'Alineación y Balanceo', time: '1 hr' },
  { id: 'SRV-05', name: 'Otro (Especificar en comentarios)', time: 'Variable' },
];

export default function AgendarCitaPage() {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
        <Header />
        <main className="flex-grow flex items-center justify-center p-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 max-w-lg w-full text-center border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">Cita Solicitada</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8">
              Tu solicitud ha sido enviada con éxito al taller. Nos contactaremos pronto para confirmar tu asistencia.
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => setIsSubmitted(false)}
                className="px-6 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Agendar Otra
              </button>
              <Link 
                href="/cliente"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-4xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/cliente" className="text-sm font-medium text-emerald-600 hover:text-emerald-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 bg-opacity-10 flex items-center justify-center text-2xl">
            📅
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Agendar Cita
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Programa mantenimientos y revisiones fácilmente.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8">
            
            {/* Step 1: Vehicle */}
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">1</span>
                ¿Qué vehículo requiere atención?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MY_VEHICLES.map((v) => (
                  <label 
                    key={v.id} 
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${selectedVehicle === v.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                  >
                    <input 
                      type="radio" 
                      name="vehicle" 
                      className="hidden"
                      value={v.id}
                      checked={selectedVehicle === v.id}
                      onChange={() => setSelectedVehicle(v.id)}
                    />
                    <div className="font-bold text-zinc-900 dark:text-white mb-1">{v.name}</div>
                    <div className="text-sm font-mono text-zinc-500 dark:text-zinc-400">{v.plate}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: Service */}
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">2</span>
                ¿Qué servicio necesitas?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {SERVICES.map((s) => (
                  <label 
                    key={s.id} 
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex justify-between items-center ${selectedService === s.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="service" 
                        className="w-5 h-5 accent-emerald-500"
                        value={s.id}
                        checked={selectedService === s.id}
                        onChange={() => setSelectedService(s.id)}
                      />
                      <span className="font-bold text-zinc-900 dark:text-white">{s.name}</span>
                    </div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">⏱️ {s.time}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 3: Date & Time */}
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">3</span>
                Fecha y Hora de Preferencia
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Fecha Sugerida</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 dark:text-white font-medium"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Hora Sugerida</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 dark:text-white font-medium"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  >
                    <option value="">Selecciona un horario...</option>
                    <option value="08:00">08:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Comments */}
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">4</span>
                Detalles Adicionales (Opcional)
              </h3>
              <textarea 
                placeholder="Ej. Hay un ruido extraño al frenar..."
                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 transition-all dark:text-white resize-none h-32"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                type="submit"
                disabled={!selectedVehicle || !selectedService || !selectedDate || !selectedTime}
                className="w-full md:w-auto ml-auto block bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-lg font-bold px-10 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                Solicitar Cita
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
