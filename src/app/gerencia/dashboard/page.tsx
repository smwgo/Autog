"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
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
    a.download = "reporte-gerencia-neon.csv";
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
      trend: "Neon DB",
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
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Link href="/gerencia" className="hover:text-blue-600 transition-colors">Gerencia</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Tablero General</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Resumen del Negocio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-sm font-medium outline-none focus:border-blue-500"
            >
              <option>Hoy</option>
              <option>Esta semana</option>
              <option>Este mes</option>
              <option>Este año</option>
            </select>
            <button
              onClick={handleExport}
              className="h-10 px-4 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              Descargar Reporte CSV
            </button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${kpi.color}`}>
                  {kpi.icon}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${kpi.isUp ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-red-600 bg-red-50 dark:bg-red-500/10'}`}>
                  {kpi.trend}
                </span>
              </div>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{kpi.label}</h3>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">{loading ? "..." : kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Ingresos vs Gastos (Neon DB)</h3>
              <span className="text-xs text-zinc-500">
                Ingresos: <strong className="text-blue-600">${Number(summary?.ingresosHoy || 0).toFixed(2)}</strong> | Egresos: <strong className="text-rose-500">${Number(summary?.egresosTotal || 0).toFixed(2)}</strong>
              </span>
            </div>
            <div className="flex-grow flex items-end justify-between gap-2 h-64 mt-auto">
              {[45, 72, 55, 90, 68, 85, 100].map((h, i) => (
                <div key={i} className="w-full flex justify-center items-end gap-1 group">
                  <div className="w-1/2 bg-blue-500 rounded-t-sm transition-all hover:bg-blue-400" style={{ height: `${h}%` }}></div>
                  <div className="w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-t-sm transition-all hover:bg-zinc-300 dark:hover:bg-zinc-700" style={{ height: `${h * 0.55}%` }}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs font-medium text-zinc-400">
              <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Últimas Órdenes en Neon</h3>
            <div className="space-y-4 flex-grow">
              {loading ? (
                <p className="text-sm text-zinc-500">Cargando órdenes...</p>
              ) : recentOrders.length === 0 ? (
                <p className="text-sm text-zinc-500">No hay órdenes recientes</p>
              ) : (
                recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        order.status === "Terminado" || order.status === "Entregado"
                          ? "bg-emerald-500"
                          : order.status.includes("Esperando")
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}></div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{order.orderNumber}</p>
                        <p className="text-xs text-zinc-500">{order.client} — {order.vehicle}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      ${Number(order.amount || 0).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link
              href="/oficina/ordenes"
              className="w-full mt-4 py-3 text-center rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Ver todas las órdenes
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
