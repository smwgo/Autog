"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
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
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
          >
            &larr; Volver al inicio
          </Link>
        </div>

        <div className="mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <span className="text-4xl select-none mt-1">🏢</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Oficina
                </h1>
                <p className="text-sm text-zinc-500 mt-1">Gestión administrativa conectada en tiempo real a Neon PostgreSQL</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Conectado a Neon DB
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => {
            const badge = getBadgeText(mod.key);
            return (
              <Link 
                key={mod.href} 
                href={mod.href}
                className="group block bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden relative"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}></div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${mod.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      {mod.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                  {badge && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
