"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

const modules = [
  {
    title: "Vehículos",
    description: "Estado y kilometraje.",
    icon: "🚗",
    href: "/cliente/vehiculos",
    color: "bg-blue-500",
  },
  {
    title: "Citas",
    description: "Mantenimientos y agenda.",
    icon: "📅",
    href: "/cliente/citas",
    color: "bg-emerald-500",
  },
  {
    title: "Historial",
    description: "Trabajos y garantías.",
    icon: "📖",
    href: "/cliente/historial",
    color: "bg-amber-500",
  },
  {
    title: "Cotizaciones",
    description: "Presupuestos pendientes.",
    icon: "📝",
    href: "/cliente/cotizaciones",
    color: "bg-purple-500",
  },
  {
    title: "Facturas",
    description: "Comprobantes y pagos.",
    icon: "🧾",
    href: "/cliente/facturas",
    color: "bg-indigo-500",
  },
  {
    title: "Perfil",
    description: "Datos y preferencias.",
    icon: "⚙️",
    href: "/cliente/perfil",
    color: "bg-zinc-500",
  },
];

export default function ClientePanel() {
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
            <span className="text-4xl select-none mt-1">👤</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Cliente
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">
                Tu área personal.
              </p>
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
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl ${mod.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  {mod.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
