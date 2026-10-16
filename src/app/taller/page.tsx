"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";

interface TallerStats {
  ordenes: number;
  inspecciones: number;
  tareasActivas: number;
  historial: number;
  repuestos: number;
  tiemposCount: number;
  tiemposFormatted: string;
}

const modules = [
  {
    key: "ordenes",
    title: "Órdenes",
    description: "Vehículos y reparaciones.",
    icon: "🚗",
    href: "/taller/ordenes",
    color: "bg-blue-500",
    badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  {
    key: "inspecciones",
    title: "Inspecciones",
    description: "Diagnóstico y estado.",
    icon: "📋",
    href: "/taller/inspecciones",
    color: "bg-amber-500",
    badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  {
    key: "tareas",
    title: "Tareas",
    description: "Asignaciones del mecánico.",
    icon: "🔧",
    href: "/taller/tareas",
    color: "bg-emerald-500",
    badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  {
    key: "historial",
    title: "Historial",
    description: "Servicios anteriores.",
    icon: "📖",
    href: "/taller/historial",
    color: "bg-purple-500",
    badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  {
    key: "repuestos",
    title: "Repuestos",
    description: "Pedidos a bodega.",
    icon: "🔩",
    href: "/taller/repuestos",
    color: "bg-indigo-500",
    badgeColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  {
    key: "tiempos",
    title: "Tiempos",
    description: "Horas por orden.",
    icon: "⏱️",
    href: "/taller/tiempos",
    color: "bg-rose-500",
    badgeColor: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
];

export default function TallerPanel() {
  const [stats, setStats] = useState<TallerStats | null>(null);

  useEffect(() => {
    fetch("/api/taller/resumen", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.stats) {
          setStats(d.stats);
        }
      })
      .catch(() => {});
  }, []);

  const getBadgeText = (key: string) => {
    if (!stats) return null;
    switch (key) {
      case "ordenes":
        return `${stats.ordenes} registradas`;
      case "inspecciones":
        return `${stats.inspecciones} controles`;
      case "tareas":
        return `${stats.tareasActivas} activas`;
      case "historial":
        return `${stats.historial} servicios`;
      case "repuestos":
        return `${stats.repuestos} solicitudes`;
      case "tiempos":
        return stats.tiemposFormatted || `${stats.tiemposCount} registros`;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
          >
            &larr; Volver al inicio
          </Link>

          <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Conectado a Neon DB
          </span>
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl sm:text-3xl select-none shrink-0">
              🔧
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Panel de Taller
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Gestión operativa en tiempo real sincronizada con Neon PostgreSQL.
              </p>
            </div>
          </div>
        </div>

        {/* Resumen rápido móvil/desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-[11px] sm:text-xs font-medium text-zinc-500">Órdenes Taller</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {stats ? stats.ordenes : "..."}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-[11px] sm:text-xs font-medium text-zinc-500">Tareas Activas</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats ? stats.tareasActivas : "..."}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-[11px] sm:text-xs font-medium text-zinc-500">Repuestos Pedidos</p>
            <p className="text-lg sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {stats ? stats.repuestos : "..."}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <p className="text-[11px] sm:text-xs font-medium text-zinc-500">Tiempo Acumulado</p>
            <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
              {stats ? stats.tiemposFormatted || `${stats.tiemposCount} reg.` : "..."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {modules.map((mod) => {
            const badge = getBadgeText(mod.key);
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group block bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl active:scale-[0.99] overflow-hidden relative"
              >
                <div
                  className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}
                ></div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${mod.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      {mod.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                  {badge && (
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${mod.badgeColor}`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <TallerMobileNav />
    </div>
  );
}
