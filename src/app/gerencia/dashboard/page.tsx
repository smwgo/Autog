"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";

type Period = "today" | "week" | "month" | "year";

interface Summary {
  dateLabel: string;
  sucursal: string;
  metrics: {
    ventasTotales: number;
    cobradoEnCaja: number;
    montoHoy: number;
    ticketPromedio: number;
    autosEnPista: number;
    autosEntregados: number;
    gastosYRepuestos: number;
    cuentasPorCobrar: number;
  };
  weeklyChart: {
    day: string;
    income: number;
    expense: number;
    heightIncome: number;
    heightExpense: number;
  }[];
  ultimasOrdenes: {
    id: string;
    orderNumber: string;
    client: string;
    vehicle: string;
    status: string;
    amount: number;
  }[];
}

interface ApplicationStats {
  salesCount: number;
  bestSellers: {
    products: { name: string; quantity: number }[];
    services: { name: string; quantity: number }[];
  };
  customers: number;
  inventory: { products: number; units: number; lowStock: number };
  workshop: { activeOrders: number; openTasks: number };
  appointments: number;
  pendingQuotes: number;
  teamMembers: number;
  systemUsers: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SummaryResponse extends Summary {
  success: boolean;
  error?: string;
}

const periodLabels: Record<Period, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  year: "Este año",
};

function getDateRange(period: Period) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (period === "week") {
    const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;
    start.setDate(today.getDate() - offset);
    end.setDate(start.getDate() + 6);
  } else if (period === "month") {
    start.setDate(1);
    end.setMonth(today.getMonth() + 1, 0);
  } else if (period === "year") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return { desde: format(start), hasta: format(end) };
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "sales":
      return <svg {...common}><path d="M3 17 9 11l4 4 8-9" /><path d="M15 6h6v6" /></svg>;
    case "workshop":
      return <svg {...common}><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3 3.7-3.7Z" /></svg>;
    case "customers":
      return <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3.5 3.5 0 0 1 0 6.8M18 14a5 5 0 0 1 3 4.6V20" /></svg>;
    case "inventory":
      return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5M12 13v8" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
    case "quote":
      return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v6h6M9 14h6M9 18h6" /></svg>;
    case "team":
      return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4.6V20" /></svg>;
    case "cash":
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 9h.01M17 15h.01" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>;
  }
}

const sellerChartColors = [
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#22c55e",
];

function BestSellerDonut({
  title,
  items,
  loading,
}: {
  title: string;
  items: { name: string; quantity: number }[];
  loading: boolean;
}) {
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  const segments = items.map((item, index) => ({
    item,
    index,
    length: total ? (item.quantity / total) * circumference : 0,
    offset: items
      .slice(0, index)
      .reduce((sum, previous) => sum + (total ? (previous.quantity / total) * circumference : 0), 0),
  }));

  return (
    <div className="min-w-0 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-white/[0.03]">
      <p className="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">{title}</p>
      <div className="mt-3 flex items-center gap-3">
        <div role="img" className="relative h-[76px] w-[76px] shrink-0" aria-label={`${title}: ${total} unidades vendidas`}>
          <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" role="img" aria-hidden="true">
            <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-200 dark:text-zinc-700" />
            {segments.map(({ item, index, length, offset }) => (
                <circle
                  key={`${item.name}-${index}`}
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke={sellerChartColors[index % sellerChartColors.length]}
                  strokeWidth="8"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                />
            ))}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-sm leading-none text-zinc-800 dark:text-white">{loading ? "…" : total}</strong>
            <span className="mt-1 text-[9px] text-zinc-400">vendidos</span>
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {loading ? (
            <p className="text-[11px] text-zinc-400">Cargando…</p>
          ) : items.length ? (
            items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sellerChartColors[index % sellerChartColors.length] }} />
                <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300" title={item.name}>{item.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">{item.quantity}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-zinc-400">Sin ventas</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardGeneral() {
  const [period, setPeriod] = useState<Period>("month");
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const periodMenuRef = useRef<HTMLDivElement>(null);
  const periodButtonRef = useRef<HTMLButtonElement>(null);
  const dateRange = useMemo(() => getDateRange(period), [period]);

  useEffect(() => {
    if (!periodMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!periodMenuRef.current?.contains(event.target as Node)) {
        setPeriodMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPeriodMenuOpen(false);
        periodButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [periodMenuOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(dateRange);

    const loadDashboard = async () => {
      try {
        const [summaryResponse, statsResponse] = await Promise.all([
            fetch(`/api/gerencia/resumen?periodo=personalizado&${query}${period === "year" ? "&agrupacion=mes" : ""}`, { signal: controller.signal }),
          fetch(`/api/indicadores?${query}`, { signal: controller.signal }),
        ]);
        const [summaryResult, statsResult] = await Promise.all([
          summaryResponse.json() as Promise<SummaryResponse>,
          statsResponse.json() as Promise<ApiResponse<ApplicationStats>>,
        ]);

        if (!summaryResponse.ok || !summaryResult.success || !summaryResult.metrics) {
          throw new Error(summaryResult.error || "No se pudieron cargar las métricas de ventas y operación.");
        }
        if (!statsResponse.ok || !statsResult.success || !statsResult.data) {
          throw new Error(statsResult.error || "No se pudieron cargar los indicadores de los módulos.");
        }

        setSummary(summaryResult);
        setStats(statsResult.data);
        setError(null);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error("Error al cargar el tablero global de indicadores:", loadError);
        setSummary(null);
        setStats(null);
        setError(loadError instanceof Error ? loadError.message : "Ocurrió un error al cargar los indicadores.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, [dateRange, period, reloadKey]);

  const setSelectedPeriod = (value: Period) => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setStats(null);
    setPeriod(value);
  };

  const refresh = () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setStats(null);
    setReloadKey((key) => key + 1);
  };

  const modules = [
    { title: "Punto de venta", description: "Ventas y cobros", icon: "cash", href: "/pos", color: "text-emerald-500", value: stats ? `${stats.salesCount} ventas` : "—", detail: summary ? `${formatCurrency(summary.metrics.cobradoEnCaja)} cobrados` : "Cargando…" },
    { title: "Finanzas", description: "Ingresos, egresos y cartera", icon: "sales", href: "/gerencia/reportes", color: "text-blue-500", value: summary ? `${formatCurrency(summary.metrics.ventasTotales)} ingresos` : "—", detail: summary ? `${formatCurrency(summary.metrics.gastosYRepuestos)} gastos · ${formatCurrency(summary.metrics.cuentasPorCobrar)} por cobrar` : "Cargando…" },
    { title: "Taller", description: "Trabajo en curso", icon: "workshop", href: "/taller", color: "text-amber-500", value: stats ? `${stats.workshop.activeOrders} órdenes activas` : "—", detail: stats ? `${stats.workshop.openTasks} tareas pendientes` : "Cargando…" },
    { title: "Inventario", description: "Catálogo y existencias", icon: "inventory", href: "/gerencia/inventario", color: "text-cyan-500", value: stats ? `${stats.inventory.products} productos` : "—", detail: stats ? `${stats.inventory.units} unidades · ${stats.inventory.lowStock} con stock bajo` : "Cargando…" },
    { title: "Clientes y agenda", description: "Relación con clientes", icon: "calendar", href: "/cliente", color: "text-violet-500", value: stats ? `${stats.customers} clientes` : "—", detail: stats ? `${stats.appointments} citas por atender` : "Cargando…" },
    { title: "Cotizaciones", description: "Seguimiento comercial", icon: "quote", href: "/presupuestos", color: "text-blue-500", value: stats ? `${stats.pendingQuotes} pendientes` : "—", detail: "Por revisar o aprobar" },
    { title: "Equipo", description: "Accesos y personal", icon: "team", href: "/gerencia/personal", color: "text-rose-500", value: stats ? `${stats.teamMembers} colaboradores` : "—", detail: stats ? `${stats.systemUsers} cuentas de usuario` : "Cargando…" },
  ];

  const chart = summary?.weeklyChart ?? [];
  const maxChartValue = Math.max(1, ...chart.flatMap((day) => [day.income, day.expense]));
  const recentOrders = summary?.ultimasOrdenes ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6fa] font-sans dark:bg-[#090d14]">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 px-4 py-5 pb-28 sm:space-y-8 sm:px-6 sm:py-8 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/gerencia"
              aria-label="Volver a Gerencia"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6M9 12h12" /></svg>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-2xl">Indicadores</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="relative" ref={periodMenuRef}>
              <button
                ref={periodButtonRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={periodMenuOpen}
                aria-controls="indicator-period-menu"
                onClick={() => setPeriodMenuOpen((isOpen) => !isOpen)}
                className="inline-flex h-10 min-w-36 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700"
              >
                <span>{periodLabels[period]}</span>
                <svg
                  aria-hidden="true"
                  className={`h-4 w-4 text-zinc-400 transition-transform ${periodMenuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              {periodMenuOpen && (
                <div
                  id="indicator-period-menu"
                  role="menu"
                  aria-label="Seleccionar período"
                  className="absolute right-0 z-30 mt-2 w-48 origin-top-right rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-lg shadow-zinc-900/10 ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30 dark:ring-white/5"
                >
                  {(Object.entries(periodLabels) as [Period, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={period === value}
                      onClick={() => {
                        setSelectedPeriod(value);
                        setPeriodMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        period === value
                          ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
                      }`}
                    >
                      {label}
                      {period === value && (
                        <svg aria-hidden="true" className="h-4 w-4 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.26a1 1 0 0 1-1.42.003L3.294 9.17a1 1 0 1 1 1.412-1.416l4.086 4.078 6.498-6.548a1 1 0 0 1 1.414.006Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            <span>{error}</span>
            <button type="button" onClick={refresh} className="font-semibold underline underline-offset-2">Reintentar</button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-[#111722] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Rendimiento</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-zinc-500"><i className="h-2.5 w-2.5 rounded-sm bg-blue-500" />Ingresos</span>
                <span className="inline-flex items-center gap-1.5 text-zinc-500"><i className="h-2.5 w-2.5 rounded-sm bg-rose-500" />Gastos</span>
              </div>
            </div>
            <div className={`mt-7 flex h-48 items-end justify-between sm:h-56 ${period === "year" ? "gap-1 sm:gap-2" : "gap-2 sm:gap-4"}`}>
              {chart.map((day) => (
                <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className={`flex h-full w-full items-end justify-center ${period === "year" ? "gap-0.5 sm:gap-1" : "gap-1.5"}`}>
                    <div
                      title={`${day.day}: ingresos ${formatCurrency(day.income)}`}
                      className={`w-full rounded-t-md bg-blue-500 transition-all ${period === "year" ? "max-w-4" : "max-w-7"}`}
                      style={{ height: `${day.income ? Math.max(5, (day.income / maxChartValue) * 100) : 2}%` }}
                    />
                    <div
                      title={`${day.day}: gastos ${formatCurrency(day.expense)}`}
                      className={`w-full rounded-t-md bg-rose-500 transition-all ${period === "year" ? "max-w-4" : "max-w-7"}`}
                      style={{ height: `${day.expense ? Math.max(5, (day.expense / maxChartValue) * 100) : 2}%` }}
                    />
                  </div>
                  <span className={`font-medium text-zinc-400 ${period === "year" ? "text-[9px] sm:text-[11px]" : "text-[11px]"}`}>{day.day}</span>
                </div>
              ))}
              {!chart.length && <p className="w-full self-center text-center text-sm text-zinc-400">{loading ? "Cargando actividad…" : "No hay actividad para mostrar."}</p>}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
              <span className="text-zinc-500">Ingresos <strong className="ml-1 text-blue-500">{summary ? formatCurrency(summary.metrics.ventasTotales) : "—"}</strong></span>
              <span className="text-zinc-500">Gastos <strong className="ml-1 text-rose-500">{summary ? formatCurrency(summary.metrics.gastosYRepuestos) : "—"}</strong></span>
              <span className="text-zinc-500">Por cobrar <strong className="ml-1 text-amber-600 dark:text-amber-400">{summary ? formatCurrency(summary.metrics.cuentasPorCobrar) : "—"}</strong></span>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-[#111722] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Pulso del sistema</p>
              </div>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Vista global</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <BestSellerDonut title="Productos más vendidos" items={stats?.bestSellers.products ?? []} loading={loading && !stats} />
              <BestSellerDonut title="Servicios más vendidos" items={stats?.bestSellers.services ?? []} loading={loading && !stats} />
            </div>
            <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              {modules.map((module) => (
                <Link key={module.title} href={module.href} className="group flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 dark:bg-white/5 ${module.color}`}><Icon name={module.icon} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-800 transition group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">{module.title}</span>
                    <span className="block truncate text-xs text-zinc-400">{module.detail}</span>
                  </span>
                  <span className="max-w-[42%] truncate text-right text-xs font-semibold text-zinc-600 dark:text-zinc-300">{module.value}</span>
                  <svg className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-[#111722] sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Actividad del taller</p>
              <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">Órdenes recientes</h3>
            </div>
          </div>
          {loading && !summary ? (
            <p className="py-5 text-sm text-zinc-500">Cargando actividad del taller…</p>
          ) : !recentOrders.length ? (
            <p className="py-5 text-sm text-zinc-500">{error ? "No se pudo cargar la actividad." : "No hay órdenes recientes."}</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {recentOrders.slice(0, 8).map((order) => (
                <article key={order.id} className="min-w-0 rounded-2xl bg-zinc-50 p-4 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">{order.orderNumber.replace(/^OT\s*/i, "")}</p>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-500" title={order.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-500">{order.client} · {order.vehicle}</p>
                  <p className="mt-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(order.amount)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <GerenciaMobileNav />
    </div>
  );
}
