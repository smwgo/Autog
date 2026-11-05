"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { GerenciaExecutiveKpis } from "@/components/gerencia/GerenciaExecutiveKpis";
import { useEffect, useState } from "react";

export default function DashboardGeneral() {
  const [period, setPeriod] = useState("Este mes");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gerencia/resumen");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const handleExport = () => {
    if (!summary) return;
    const csv = [
      "Metrica,Valor",
      `Ingresos,${summary.ingresosHoy || 0}`,
      `Egresos,${summary.egresosTotal || 0}`,
      `Ordenes Activas,${summary.ordenesActivas || 0}`,
      `Ticket Promedio,${Number(summary.ticketPromedio || 0).toFixed(2)}`,
      `Clientes Registrados,${summary.clientesTotal || 0}`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reporte-gerencia.csv";
    a.click();
  };

  const kpis = [
    {
      label: `Ingresos (${period})`,
      value: summary ? `$${Number(summary.ingresosHoy || 0).toFixed(2)}` : "$0.00",
      trend: "+12.5%",
      isUp: true,
      icon: "💵",
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Órdenes en Taller",
      value: summary ? String(summary.ordenesActivas || 0) : "0",
      trend: "Activas",
      isUp: true,
      icon: "🔧",
      color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Ticket Promedio",
      value: summary ? `$${Number(summary.ticketPromedio || 0).toFixed(2)}` : "$0.00",
      trend: "+3.2%",
      isUp: true,
      icon: "🧾",
      color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "Clientes en Base",
      value: summary ? String(summary.clientesTotal || 0) : "0",
      trend: "Activos",
      isUp: true,
      icon: "👥",
      color: "text-purple-500 bg-purple-50 dark:bg-purple-500/10",
    },
  ];

  const recentOrders = summary?.ultimasOrdenes || [];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & CSV Export */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/gerencia"
              title="Volver a Gerencia"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500">
              <Link href="/gerencia" className="hover:text-blue-600 transition-colors">Gerencia</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Indicadores</span>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="h-9 px-3.5 sm:px-4 rounded-xl bg-blue-600 text-white font-medium text-xs sm:text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>📥</span>
            <span>Reporte CSV</span>
          </button>
        </div>

        {/* Panel Ejecutivo KPI (Exacto a Dirección) */}
        <div className="mb-6 sm:mb-8">
          <GerenciaExecutiveKpis onDataLoaded={(d) => setSummary(d)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-5 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">Ingresos vs Gastos</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                  Ingresos: <strong className="text-blue-600">${Number(summary?.ingresosHoy || 0).toFixed(2)}</strong>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-zinc-300 dark:bg-zinc-700"></span>
                  Egresos: <strong className="text-rose-500">${Number(summary?.egresosTotal || 0).toFixed(2)}</strong>
                </span>
              </div>
            </div>
            <div className="flex-grow flex items-end justify-between gap-1.5 sm:gap-2 h-48 sm:h-64 mt-auto pt-4">
              {(summary?.weeklyChart || [
                { day: "Lun", heightIncome: 4, heightExpense: 4, income: 0, expense: 0 },
                { day: "Mar", heightIncome: 4, heightExpense: 4, income: 0, expense: 0 },
                { day: "Mié", heightIncome: 4, heightExpense: 4, income: 0, expense: 0 },
                { day: "Jue", heightIncome: 4, heightExpense: 4, income: 0, expense: 0 },
                { day: "Vie", heightIncome: 4, heightExpense: 4, income: 0, expense: 0 },
                { day: "Sáb", heightIncome: 4, heightExpense: 4, income: 0, expense: 0 },
                { day: "Dom", heightIncome: 4, heightExpense: 4, income: 0, expense: 0 },
              ]).map((bar: any, i: number) => (
                <div key={i} className="w-full flex justify-center items-end gap-1 group h-full">
                  <div
                    title={`Ingresos ${bar.day}: $${Number(bar.income || 0).toFixed(2)}`}
                    className="w-1/2 bg-blue-500 rounded-t-md transition-all hover:bg-blue-400 cursor-pointer"
                    style={{ height: `${bar.heightIncome}%` }}
                  />
                  <div
                    title={`Egresos ${bar.day}: $${Number(bar.expense || 0).toFixed(2)}`}
                    className="w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-t-md transition-all hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                    style={{ height: `${bar.heightExpense}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 sm:mt-4 text-[11px] sm:text-xs font-medium text-zinc-400">
              {(summary?.weeklyChart || [
                { day: "Lun" }, { day: "Mar" }, { day: "Mié" }, { day: "Jue" }, { day: "Vie" }, { day: "Sáb" }, { day: "Dom" }
              ]).map((item: any, i: number) => (
                <span key={i}>{item.day}</span>
              ))}
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6">Últimas Órdenes</h3>
            <div className="space-y-2.5 sm:space-y-4 flex-grow">
              {loading ? (
                <p className="text-sm text-zinc-500">Cargando órdenes...</p>
              ) : recentOrders.length === 0 ? (
                <p className="text-sm text-zinc-500">No hay órdenes recientes</p>
              ) : (
                recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/30 sm:bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        order.status === "Terminado" || order.status === "Entregado"
                          ? "bg-emerald-500"
                          : order.status.includes("Esperando")
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}></div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{order.orderNumber}</p>
                        <p className="text-xs text-zinc-500 truncate">{order.client} — {order.vehicle}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex-shrink-0">
                      ${Number(order.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link
              href="/oficina/ordenes"
              className="w-full mt-4 py-3 text-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-98 transition-all"
            >
              Ver todas las órdenes
            </Link>
          </div>
        </div>
      </main>
      <GerenciaMobileNav />
    </div>
  );
}
