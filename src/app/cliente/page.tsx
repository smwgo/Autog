"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ClienteMobileNav } from "@/components/ClienteMobileNav";

const modules = [
  {
    title: "Vehículos",
    href: "/cliente/vehiculos",
    color: "bg-blue-600",
    gradient: "from-blue-600 via-indigo-600 to-blue-700",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    title: "Citas",
    href: "/cliente/citas",
    color: "bg-emerald-500",
    gradient: "from-emerald-500 via-teal-500 to-emerald-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    title: "Historial",
    href: "/cliente/historial",
    color: "bg-amber-500",
    gradient: "from-amber-500 via-orange-500 to-amber-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="9" />
        <path d="M3.05 11a9 9 0 0 1 .5-3m1.45-3a9 9 0 0 1 3-1.45" />
      </svg>
    ),
  },
  {
    title: "Cotizaciones",
    href: "/cliente/cotizaciones",
    color: "bg-purple-500",
    gradient: "from-purple-500 via-indigo-500 to-purple-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
  },
  {
    title: "Facturas",
    href: "/cliente/facturas",
    color: "bg-indigo-600",
    gradient: "from-indigo-500 via-blue-600 to-indigo-700",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-8m8 4h-8m6 4h-6" />
      </svg>
    ),
  },
  {
    title: "Perfil",
    href: "/cliente/perfil",
    color: "bg-zinc-600",
    gradient: "from-zinc-500 via-slate-600 to-zinc-700",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function ClientePanel() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Cabecera: Flecha de regreso y Título Cliente (Idéntico a POS) */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Link 
              href="/" 
              aria-label="Volver"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-500/10 dark:bg-zinc-800/30 hover:bg-zinc-500/20 dark:hover:bg-zinc-800/60 border border-zinc-300/40 dark:border-zinc-700/30 text-zinc-700 dark:text-zinc-200 backdrop-blur-sm transition-all flex items-center justify-center shrink-0 active:scale-95"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Cliente
            </h1>
          </div>
        </div>

        {/* Módulos Cliente: Exactamente igual al panel POS con solo un título por tarjeta */}
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
      </main>

      {/* Barra de navegación móvil inferior con safe-area */}
      <ClienteMobileNav />
    </div>
  );
}
