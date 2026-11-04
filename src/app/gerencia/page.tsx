"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { GerenciaExecutiveKpis } from "@/components/gerencia/GerenciaExecutiveKpis";

const modules = [
  {
    title: "Indicadores",
    href: "/gerencia/dashboard",
    color: "bg-blue-600",
    gradient: "from-blue-600 via-indigo-600 to-blue-700",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
  },
  {
    title: "Finanzas",
    href: "/gerencia/reportes",
    color: "bg-emerald-500",
    gradient: "from-emerald-500 via-teal-500 to-emerald-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "Nómina",
    href: "/gerencia/personal",
    color: "bg-purple-500",
    gradient: "from-purple-500 via-indigo-500 to-purple-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Tareas",
    href: "/gerencia/tareas",
    color: "bg-amber-500",
    gradient: "from-amber-500 via-orange-500 to-amber-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    title: "Configuración",
    href: "/gerencia/configuracion",
    color: "bg-zinc-600",
    gradient: "from-zinc-500 via-slate-600 to-zinc-700",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    title: "Usuarios",
    href: "/gerencia/usuarios",
    color: "bg-cyan-500",
    gradient: "from-cyan-500 via-sky-500 to-blue-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <rect x="15" y="11" width="7" height="7" rx="1.5" />
        <path d="M17 11V9a1.5 1.5 0 0 1 3 0v2" />
      </svg>
    ),
  },
];

export default function GerenciaPanel() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full space-y-8">
        {/* Panel Ejecutivo KPI (Estilo CEO - Dirección) */}
        <GerenciaExecutiveKpis backHref="/acceso" />

        {/* Sección de Módulos */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {modules.map((mod, index) => (
            <Link 
              key={mod.href} 
              href={mod.href}
              className="group block bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 min-h-[96px] sm:min-h-[104px] border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all duration-300 ease-out hover:-translate-y-1.5 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.97] overflow-hidden relative flex flex-col justify-center"
            >
              {/* Esquina con color suave: más nítido y pastel en modo claro */}
              <div
                style={{ animationDelay: `${index * 0.4}s` }}
                className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-[0.08] dark:opacity-5 rounded-bl-full -mr-10 -mt-10 transition-all duration-500 ease-out group-hover:scale-125 group-hover:opacity-20 dark:group-hover:opacity-15 auto-corner-mobile sm:animate-none pointer-events-none`}
              />
              {/* Destello de brillo diagonal: visible tanto en modo claro como oscuro */}
              <div 
                style={{ animationDelay: `${index * 0.4}s` }}
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full auto-shine-mobile sm:animate-none transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-zinc-400/15 dark:via-white/[0.07] to-transparent pointer-events-none" 
              />

              <div className="flex items-center justify-between gap-3 min-w-0 relative z-10 w-full">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${mod.gradient} shadow-md flex items-center justify-center flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    {mod.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-normal text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                    {mod.title}
                  </h3>
                </div>

                {/* Flecha a la derecha con micro-interacción en hover/tap */}
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-transparent flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:border-blue-200 dark:group-hover:border-transparent group-hover:translate-x-1 transition-all duration-200 shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>
      </main>

      {/* Barra de navegación móvil inferior con safe-area */}
      <GerenciaMobileNav />
    </div>
  );
}
