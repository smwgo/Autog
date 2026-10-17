"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

const modules = [
  {
    title: "Venta",
    href: "/pos/venta",
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
  },
  {
    title: "Facturas",
    href: "/pos/facturas",
    gradient: "from-indigo-500 to-purple-600",
    shadow: "shadow-indigo-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-8m8 4h-8m6 4h-6" />
      </svg>
    ),
  },
  {
    title: "Clientes",
    href: "/pos/clientes",
    gradient: "from-blue-500 to-indigo-600",
    shadow: "shadow-blue-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Productos",
    href: "/pos/catalogo",
    gradient: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    title: "Servicios",
    href: "/pos/servicios",
    gradient: "from-teal-400 to-cyan-600",
    shadow: "shadow-teal-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Caja",
    href: "/pos/caja",
    gradient: "from-amber-400 to-amber-600",
    shadow: "shadow-amber-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="12" x="2" y="6" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    title: "Cotizaciones",
    href: "/pos/cotizaciones",
    gradient: "from-fuchsia-500 to-purple-600",
    shadow: "shadow-fuchsia-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
  },
  {
    title: "Promociones",
    href: "/pos/promociones",
    gradient: "from-orange-500 to-rose-500",
    shadow: "shadow-orange-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <circle cx="7" cy="7" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Créditos",
    href: "/pos/creditos",
    gradient: "from-cyan-400 to-blue-500",
    shadow: "shadow-cyan-500/25",
    icon: (
      <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
        <circle cx="7" cy="15" r="1" fill="currentColor" />
        <line x1="11" x2="16" y1="15" y2="15" />
      </svg>
    ),
  },
];

export default function PosPanel() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-8 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
          >
            &larr; Volver
          </Link>
        </div>

        <div className="mb-6 sm:mb-10">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 flex items-center justify-center text-white shrink-0">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                POS
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {modules.map((mod) => (
            <Link 
              key={mod.href} 
              href={mod.href}
              className="group block bg-white dark:bg-zinc-900/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 min-h-[92px] sm:min-h-[110px] border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all hover:shadow-xl active:scale-[0.98] overflow-hidden relative flex flex-col justify-center"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${mod.gradient} ${mod.shadow} shadow-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    {mod.icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                    {mod.title}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors shrink-0">
                  <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <PosMobileNav />
    </div>
  );
}
