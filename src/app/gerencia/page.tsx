"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

const modules = [
  {
    title: "Tablero",
    description: "Métricas y KPIs clave.",
    icon: "📈",
    href: "/gerencia/dashboard",
    color: "bg-blue-500",
  },
  {
    title: "Finanzas",
    description: "Flujo de caja y balances.",
    icon: "💰",
    href: "/gerencia/reportes",
    color: "bg-emerald-500",
  },
  {
    title: "Personal",
    description: "Equipo y permisos.",
    icon: "👥",
    href: "/gerencia/personal",
    color: "bg-purple-500",
  },
  {
    title: "Inventario",
    description: "Stock y sucursales.",
    icon: "📦",
    href: "/gerencia/inventario",
    color: "bg-amber-500",
  },
  {
    title: "Auditoría",
    description: "Actividades y accesos.",
    icon: "🛡️",
    href: "/gerencia/auditoria",
    color: "bg-red-500",
  },
  {
    title: "Configuración",
    description: "Ajustes del sistema.",
    icon: "⚙️",
    href: "/gerencia/configuracion",
    color: "bg-zinc-500",
  },
];

export default function GerenciaPanel() {
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
          <div className="flex items-start gap-4">
            <span className="text-4xl select-none mt-1">📊</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Gerencia
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <Link 
              key={mod.href} 
              href={mod.href}
              className="group block bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden relative"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`}></div>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${mod.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  {mod.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {mod.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
