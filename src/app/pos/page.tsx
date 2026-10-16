"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

const modules = [
  {
    title: "Venta",
    subtitle: "Terminal rápida y cobros",
    icon: "🛒",
    href: "/pos/venta",
    color: "bg-emerald-500",
  },
  {
    title: "Facturas",
    subtitle: "Comprobantes emitidos",
    icon: "🧾",
    href: "/pos/facturas",
    color: "bg-indigo-500",
  },
  {
    title: "Clientes",
    subtitle: "Directorio y fidelización",
    icon: "👥",
    href: "/pos/clientes",
    color: "bg-blue-500",
  },
  {
    title: "Productos",
    subtitle: "Catálogo y stock",
    icon: "📦",
    href: "/pos/catalogo",
    color: "bg-blue-500",
  },
  {
    title: "Servicios",
    subtitle: "Mano de obra y tarifas",
    icon: "⚙️",
    href: "/pos/servicios",
    color: "bg-teal-500",
  },
  {
    title: "Caja",
    subtitle: "Apertura, arqueo y turnos",
    icon: "💵",
    href: "/pos/caja",
    color: "bg-amber-500",
  },
  {
    title: "Cotizaciones",
    subtitle: "Proformas de mostrador",
    icon: "📝",
    href: "/pos/cotizaciones",
    color: "bg-purple-500",
  },
  {
    title: "Promociones",
    subtitle: "Descuentos y campañas",
    icon: "🏷️",
    href: "/pos/promociones",
    color: "bg-orange-500",
  },
  {
    title: "Créditos",
    subtitle: "Cuentas por cobrar",
    icon: "💳",
    href: "/pos/creditos",
    color: "bg-cyan-500",
  },
];

export default function PosPanel() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
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
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl sm:text-3xl select-none shrink-0">
              🛒
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                POS
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {modules.map((mod) => (
            <Link 
              key={mod.href} 
              href={mod.href}
              className="group block bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all hover:shadow-lg active:scale-[0.98] overflow-hidden relative"
            >
              <div className={`absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 ${mod.color} opacity-5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
                <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${mod.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  {mod.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                    {mod.title}
                  </h3>
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
