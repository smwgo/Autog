"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para el panel de tareas (Kanban)
const MOCK_TASKS = [
  {
    id: 'TSK-101',
    title: 'Cambio de Aceite y Filtros',
    vehicle: 'Toyota Hilux (ABC-123)',
    status: 'pending', // pending, in-progress, done
    priority: 'Baja',
    timeEst: '1h 30m',
  },
  {
    id: 'TSK-102',
    title: 'Revisión de Frenos',
    vehicle: 'Honda Civic (XYZ-987)',
    status: 'in-progress',
    priority: 'Alta',
    timeEst: '2h 00m',
  },
  {
    id: 'TSK-103',
    title: 'Alineación y Balanceo',
    vehicle: 'Ford Escape (QWE-554)',
    status: 'pending',
    priority: 'Media',
    timeEst: '1h 00m',
  },
  {
    id: 'TSK-104',
    title: 'Diagnóstico de Motor',
    vehicle: 'Nissan Versa (JHF-432)',
    status: 'in-progress',
    priority: 'Alta',
    timeEst: '3h 30m',
  },
  {
    id: 'TSK-105',
    title: 'Cambio de Batería',
    vehicle: 'Kia Rio (KLM-987)',
    status: 'done',
    priority: 'Baja',
    timeEst: '30m',
  },
  {
    id: 'TSK-106',
    title: 'Revisión Sistema Eléctrico',
    vehicle: 'Chevrolet Spark (GHI-789)',
    status: 'done',
    priority: 'Media',
    timeEst: '2h 15m',
  }
];

export default function MisTareasPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = MOCK_TASKS.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    task.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'Alta': return 'text-rose-600 bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400';
      case 'Media': return 'text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400';
      case 'Baja': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400';
      default: return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const TaskCard = ({ task }: { task: any }) => (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{task.id}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      <h4 className="font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
        {task.title}
      </h4>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 flex items-center gap-2">
        <span>🚗</span> {task.vehicle}
      </p>
      
      <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <span>⏱️</span> {task.timeEst}
        </span>
        <button className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 p-1.5 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/taller" className="text-sm font-medium text-emerald-600 hover:text-emerald-500 flex items-center gap-1 w-fit">
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 bg-opacity-10 flex items-center justify-center text-2xl">
                🔧
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Mis Tareas
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Panel del mecánico con tareas asignadas y progreso.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar tarea..." 
                className="pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow dark:text-white text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-3 text-zinc-400 text-sm">🔍</span>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Column: Por Hacer */}
          <div className="flex-1 w-full bg-zinc-100/50 dark:bg-zinc-900/30 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800/50">
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400"></span>
                Por Hacer
              </h3>
              <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold px-2.5 py-1 rounded-full">
                {pendingTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {pendingTasks.map(task => <TaskCard key={task.id} task={task} />)}
              {pendingTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-zinc-500 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl">
                  No hay tareas pendientes
                </div>
              )}
            </div>
          </div>

          {/* Column: En Progreso */}
          <div className="flex-1 w-full bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl p-4 border border-blue-100 dark:border-blue-900/30">
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                En Progreso
              </h3>
              <span className="bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
                {inProgressTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)}
              {inProgressTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-blue-400/60 border-2 border-dashed border-blue-200 dark:border-blue-900/50 rounded-2xl">
                  Ninguna tarea en progreso
                </div>
              )}
            </div>
          </div>

          {/* Column: Completadas */}
          <div className="flex-1 w-full bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl p-4 border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Completadas
              </h3>
              <span className="bg-emerald-200 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full">
                {doneTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {doneTasks.map(task => <TaskCard key={task.id} task={task} />)}
              {doneTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-emerald-500/60 border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
                  Aún no hay tareas completadas
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
