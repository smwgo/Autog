"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ClienteMobileNav } from "@/components/ClienteMobileNav";

interface ResumenStats {
  vehicles: number;
  appointments: number;
  history: number;
  quotes: number;
  invoices: number;
  profiles: number;
}

const modules = [
  {
    key: "vehicles" as keyof ResumenStats,
    title: "Vehículos",
    description: "Estado y kilometraje.",
    icon: "🚗",
    href: "/cliente/vehiculos",
    color: "bg-blue-500",
    badgeLabel: "registrados",
  },
  {
    key: "appointments" as keyof ResumenStats,
    title: "Citas",
    description: "Mantenimientos y agenda.",
    icon: "📅",
    href: "/cliente/citas",
    color: "bg-emerald-500",
    badgeLabel: "agendadas",
  },
  {
    key: "history" as keyof ResumenStats,
    title: "Historial",
    description: "Trabajos y garantías.",
    icon: "📖",
    href: "/cliente/historial",
    color: "bg-amber-500",
    badgeLabel: "servicios",
  },
  {
    key: "quotes" as keyof ResumenStats,
    title: "Cotizaciones",
    description: "Presupuestos pendientes.",
    icon: "📝",
    href: "/cliente/cotizaciones",
    color: "bg-purple-500",
    badgeLabel: "cotizaciones",
  },
  {
    key: "invoices" as keyof ResumenStats,
    title: "Facturas",
    description: "Comprobantes y pagos.",
    icon: "🧾",
    href: "/cliente/facturas",
    color: "bg-indigo-500",
    badgeLabel: "facturas",
  },
  {
    key: "profiles" as keyof ResumenStats,
    title: "Perfil",
    description: "Datos y preferencias.",
    icon: "⚙️",
    href: "/cliente/perfil",
    color: "bg-zinc-500",
    badgeLabel: "perfiles",
  },
];

export default function ClientePanel() {
  const [stats, setStats] = useState<ResumenStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cliente/resumen", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.error("Error cargando resumen de cliente:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit min-h-[44px] sm:min-h-0 items-center"
          >
            &larr; Volver al inicio
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Neon PostgreSQL Conectado • CRUD Real</span>
          </div>
        </div>

        <div className="mb-8 sm:mb-10">
          <div className="flex items-start gap-4">
            <span className="text-3xl sm:text-4xl select-none mt-1">👤</span>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Portal de Cliente
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Gestiona tus vehículos, citas, historial, cotizaciones, facturas y perfil en tiempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {modules.map((mod) => {
            const count = stats ? stats[mod.key] : null;
            return (
              <Link 
                key={mod.href} 
                href={mod.href}
                className="group block bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl active:scale-[0.99] overflow-hidden relative"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}></div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${mod.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      {mod.icon}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {loading ? (
                      <span className="inline-block w-8 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    ) : count !== null ? (
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-zinc-900 dark:text-white leading-none">
                          {count}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-1">
                          {mod.badgeLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Nav for Mobile */}
      <ClienteMobileNav />
    </div>
  );
}
