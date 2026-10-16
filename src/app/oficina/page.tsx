"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { useEffect, useState } from "react";

const modules = [
  {
    key: "ordenes",
    title: "Órdenes",
    description: "Cotizaciones y órdenes.",
    icon: "📄",
    href: "/oficina/ordenes",
    color: "bg-amber-500",
  },
  {
    key: "agenda",
    title: "Agenda",
    description: "Citas y técnicos.",
    icon: "📅",
    href: "/oficina/agenda",
    color: "bg-emerald-500",
  },
  {
    key: "facturacion",
    title: "Facturación",
    description: "Facturas y cobranzas.",
    icon: "🧾",
    href: "/oficina/facturacion",
    color: "bg-purple-500",
  },
  {
    key: "proveedores",
    title: "Proveedores",
    description: "Compras y cuentas por pagar.",
    icon: "🤝",
    href: "/oficina/proveedores",
    color: "bg-indigo-500",
  },
  {
    key: "caja",
    title: "Caja",
    description: "Cobros y liquidaciones.",
    icon: "💵",
    href: "/oficina/caja",
    color: "bg-teal-500",
  },
];

export default function OficinaPanel() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch("/api/oficina/resumen")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch(() => {});
  }, []);

  const getBadgeText = (key: string) => {
    if (!summary) return null;
    if (key === "ordenes") return `${summary.ordenesTotal || 0} registros`;
    if (key === "agenda") return `${summary.citasHoy || 0} citas`;
    if (key === "facturacion") return `${summary.facturasEmitidas || 0} docs SRI`;
    if (key === "proveedores") return `${summary.proveedoresActivos || 0} activos`;
    if (key === "caja") return summary.cajaAbierta ? "Caja Abierta" : "Caja Cerrada";
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-4 sm:mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit py-1"
          >
            &larr; Volver al inicio
          </Link>
        </div>

        <div className="mb-6 sm:mb-10">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center sm:items-start gap-3 sm:gap-4">
              <span className="text-3xl sm:text-4xl select-none">🏢</span>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Oficina
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 sm:mt-1">
                  Gestión administrativa conectada en tiempo real a Neon PostgreSQL
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Conectado a Neon DB
            </span>
          </div>
        </div>

        {/* Resumen Rápido Móvil */}
        {summary && (
          <div className="grid grid-cols-2 sm:hidden gap-2.5 mb-5">
            <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">Estado de Caja</span>
              <span className={`text-base font-bold ${summary.cajaAbierta ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                {summary.cajaAbierta ? "🟢 Caja Abierta" : "🔴 Caja Cerrada"}
              </span>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-500 block">Agenda de Hoy</span>
              <span className="text-base font-bold text-zinc-900 dark:text-white">
                {summary.citasHoy || 0} citas activas
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {modules.map((mod) => {
            const badge = getBadgeText(mod.key);
            return (
              <Link 
                key={mod.href} 
                href={mod.href}
                className="group block bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all active:scale-[0.98] sm:hover:shadow-xl sm:hover:-translate-y-1 overflow-hidden relative"
              >
                <div className={`absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 ${mod.color} opacity-5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${mod.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      {mod.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{mod.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {badge && (
                      <span className="px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {badge}
                      </span>
                    )}
                    <svg className="w-4 h-4 text-zinc-400 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <OficinaMobileNav />
    </div>
  );
}
