"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { getClientUserBranch, getClientActiveBranch } from "@/lib/branch";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { getAuthHeaders } from "@/lib/auth-headers";

const modules = [
  {
    title: "Venta",
    href: "/pos/venta",
    color: "bg-blue-600",
    gradient: "from-blue-600 via-indigo-600 to-blue-700",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="1.5" width="8" height="4.5" rx="1" strokeDasharray="16" />
        <line x1="8" y1="3.5" x2="16" y2="3.5" />
        <rect x="5" y="4" width="14" height="18" rx="2.5" />
        <rect x="8" y="7" width="8" height="4" rx="1" />
        <circle cx="8.5" cy="14" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="12" cy="14" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="14" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="8.5" cy="17" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="17" r="0.75" fill="currentColor" stroke="none" />
        <line x1="10" y1="20" x2="14" y2="20" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "Historial",
    href: "/pos/facturas",
    color: "bg-indigo-500",
    gradient: "from-indigo-500 to-purple-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-8m8 4h-8m6 4h-6" />
      </svg>
    ),
  },
  {
    title: "Clientes",
    href: "/pos/clientes",
    color: "bg-blue-500",
    gradient: "from-blue-500 to-indigo-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Productos",
    href: "/pos/catalogo",
    color: "bg-sky-500",
    gradient: "from-sky-500 to-blue-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    title: "Servicios",
    href: "/pos/servicios",
    color: "bg-teal-500",
    gradient: "from-teal-400 to-cyan-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Caja",
    href: "/pos/caja",
    color: "bg-amber-500",
    gradient: "from-amber-400 to-amber-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="12" x="2" y="6" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    title: "Cotizaciones",
    href: "/pos/cotizaciones",
    color: "bg-purple-500",
    gradient: "from-fuchsia-500 to-purple-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
  },
  {
    title: "Órdenes",
    href: "/pos/ordenes",
    color: "bg-amber-500",
    gradient: "from-amber-500 via-orange-500 to-amber-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Créditos",
    href: "/pos/creditos",
    color: "bg-cyan-500",
    gradient: "from-cyan-400 to-blue-500",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
        <circle cx="7" cy="15" r="1" fill="currentColor" />
        <line x1="11" x2="16" y1="15" y2="15" />
      </svg>
    ),
  },
  {
    title: "Vehículos",
    href: "/pos/vehiculos",
    color: "bg-indigo-500",
    gradient: "from-indigo-500 to-blue-600",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
];

export default function PosPanel() {
  // Estado de Caja (igual que en POS de Venta)
  const [cajaActiva, setCajaActiva] = useState<any | null>(null);
  const [cajaInfo, setCajaInfo] = useState<{ initialCash: number; expectedCash: number } | null>(null);

  // Modales de Apertura y Cierre
  const [mostrarModalApertura, setMostrarModalApertura] = useState(false);
  const [fondoApertura, setFondoApertura] = useState("");
  const [guardandoApertura, setGuardandoApertura] = useState(false);

  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [conteoCierre, setConteoCierre] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  const [cerrandoCaja, setCerrandoCaja] = useState(false);

  // Consultar estado de caja
  const verificarCajaApertura = useCallback(async () => {
    try {
      const activeBr = getClientActiveBranch();
      const uBr = getClientUserBranch();
      const res = await fetch(`/api/caja?sede=${encodeURIComponent(activeBr)}&userBranch=${encodeURIComponent(uBr)}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const active = json.activeSession || null;
        setCajaActiva(active);
        if (active) {
          if (typeof window !== "undefined") localStorage.setItem("pos_caja_activa", "ABIERTA");
          setCajaInfo({
            initialCash: parseFloat(active.initialCash?.toString() || "0"),
            expectedCash: parseFloat(json.data?.expectedCash?.toString() || active.initialCash?.toString() || "0"),
          });
        } else {
          if (typeof window !== "undefined") localStorage.setItem("pos_caja_activa", "CERRADA");
          setCajaInfo(null);
        }
      }
    } catch (e) {
      console.error("Error al consultar caja:", e);
    }
  }, []);

  useEffect(() => {
    verificarCajaApertura();
  }, [verificarCajaApertura]);

  const sumarFondoApertura = (monto: number) => {
    const act = parseFloat(fondoApertura) || 0;
    setFondoApertura((act + monto).toFixed(2));
  };

  const sumarConteoCierre = (monto: number) => {
    const act = parseFloat(conteoCierre) || 0;
    setConteoCierre((act + monto).toFixed(2));
  };

  const handleGuardarApertura = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const monto = parseFloat(fondoApertura) || 0;
    if (monto < 0 || isNaN(monto)) {
      alert("Monto inválido");
      return;
    }

    setGuardandoApertura(true);
    try {
      const activeBr = getClientActiveBranch();
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_INITIAL",
          initialCash: monto,
          branch: activeBr,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al abrir caja");
      }

      setMostrarModalApertura(false);
      await verificarCajaApertura();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setGuardandoApertura(false);
    }
  };

  const handleConfirmarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    const contado = parseFloat(conteoCierre) || 0;
    const esperado = parseFloat(cajaInfo?.expectedCash?.toString() || "0");
    const diferencia = contado - esperado;

    setCerrandoCaja(true);
    try {
      const res = await fetch("/api/caja", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: cajaActiva?.id,
          declaredCash: contado,
          expectedCash: esperado,
          diffCash: diferencia,
          notes: notasCierre,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al cerrar caja");
      }

      setCajaActiva(null);
      setCajaInfo(null);
      setMostrarModalCierre(false);
      setConteoCierre("");
      setNotasCierre("");
      await verificarCajaApertura();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCerrandoCaja(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-8 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Cabecera: Flecha de regreso, Título POS y Botón de Estado de Caja */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <Link 
              href="/acceso" 
              aria-label="Volver"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-500/10 dark:bg-zinc-800/30 hover:bg-zinc-500/20 dark:hover:bg-zinc-800/60 border border-zinc-300/40 dark:border-zinc-700/30 text-zinc-700 dark:text-zinc-200 backdrop-blur-sm transition-all flex items-center justify-center shrink-0 active:scale-95"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                POS
              </h1>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 ml-auto shrink-0">
            <BranchTabs onChange={() => verificarCajaApertura()} size="sm" />

            {/* Botón de Caja: Exactamente igual al de POS de Venta */}
            {cajaActiva ? (
              <button
                type="button"
                data-pos-cash-button
                onClick={() => {
                  verificarCajaApertura();
                  setMostrarModalCierre(true);
                }}
                className="w-10 h-10 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-300 border border-rose-500/30 flex items-center justify-center text-sm transition-all shadow-[0_0_15px_rgba(244,63,94,0.12)] cursor-pointer"
                title="Cerrar Caja"
              >
                <span>🔒</span>
              </button>
            ) : (
              <button
                type="button"
                data-pos-cash-button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.removeItem("pos_caja_omitida");
                  }
                  setFondoApertura("");
                  setMostrarModalApertura(true);
                }}
                className="w-10 h-10 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer"
                title="Abrir Caja (Apertura)"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              </button>
            )}
          </div>
        </div>

        {/* Módulos POS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {modules.map((mod, index) => (
            <Link 
              key={mod.href} 
              href={mod.href}
              className="group block bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 min-h-[96px] sm:min-h-[104px] border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all duration-300 ease-out hover:-translate-y-1.5 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.97] overflow-hidden relative flex flex-col justify-center"
            >
              {/* Esquina con color suave: más nítido y pastel en modo claro */}
              <div
                style={{ animationDelay: `${index * 0.4}s` }}
                className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-[0.08] dark:opacity-5 rounded-bl-full -mr-10 -mt-10 transition-all duration-500 ease-out group-hover:scale-125 group-hover:opacity-20 dark:group-hover:opacity-15 auto-corner-mobile sm:animate-none pointer-events-none`}
              />
              {/* Destello de brillo diagonal: visible tanto en modo claro como oscuro */}
              <div 
                style={{ animationDelay: `${index * 0.4}s` }}
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full auto-shine-mobile sm:animate-none transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-zinc-400/15 dark:via-white/[0.07] to-transparent pointer-events-none" 
              />

              <div className="flex items-center justify-between gap-3 min-w-0 relative z-10 w-full">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${mod.gradient} shadow-md flex items-center justify-center flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    {mod.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-normal text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                    {mod.title}
                  </h3>
                </div>

                {/* Flecha a la derecha con animación sutil en hover */}
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-transparent flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:border-blue-200 dark:group-hover:border-transparent group-hover:translate-x-1 transition-all duration-200 shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Modal: Apertura de Caja */}
      {mostrarModalApertura && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col gap-5 text-center backdrop-blur-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-sm">
                💵
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Apertura</h3>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  Fondo
                </span>
              </div>
            </div>

            <form onSubmit={handleGuardarApertura} className="flex flex-col gap-4">
              <div className="relative flex items-center justify-center bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl px-4 py-3 transition-all">
                <span className="text-2xl font-bold text-zinc-400 dark:text-zinc-500 mr-2">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  autoFocus
                  placeholder="0.00"
                  value={fondoApertura}
                  onChange={(e) => setFondoApertura(e.target.value)}
                  className="w-full text-3xl font-extrabold text-zinc-900 dark:text-white text-center bg-transparent focus:outline-none tracking-tight"
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {[10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => sumarFondoApertura(val)}
                    className="h-10 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/40 transition-all cursor-pointer"
                  >
                    +${val}
                  </button>
                ))}
                {fondoApertura !== "" && (
                  <button
                    type="button"
                    onClick={() => setFondoApertura("")}
                    className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 active:scale-95 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalApertura(false)}
                  className="flex-1 h-11 px-4 rounded-2xl bg-zinc-500/10 hover:bg-zinc-500/20 active:scale-[0.98] text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-300/40 dark:border-zinc-700/40 text-xs font-semibold transition-all text-center cursor-pointer"
                >
                  Omitir
                </button>
                <button
                  type="submit"
                  disabled={guardandoApertura}
                  className="flex-1 h-11 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-[0.98] text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {guardandoApertura ? "Guardando..." : "Abrir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cierre de Caja */}
      {mostrarModalCierre && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center text-base">
                  🔒
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">Cierre</h3>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalCierre(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Esperado</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  ${(parseFloat(cajaInfo?.expectedCash?.toString() || "0") || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Diferencia</span>
                <p
                  className={`text-base font-bold ${
                    conteoCierre !== "" &&
                    parseFloat(conteoCierre) - (parseFloat(cajaInfo?.expectedCash?.toString() || "0") || 0) < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {conteoCierre === ""
                    ? "$0.00"
                    : `$${(parseFloat(conteoCierre) - (parseFloat(cajaInfo?.expectedCash?.toString() || "0") || 0)).toFixed(2)}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmarCierre} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-400 mb-1.5">
                  Contado
                </label>
                <div className="relative flex items-center bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 focus-within:border-rose-500/50 rounded-2xl px-4 py-2.5">
                  <span className="text-2xl font-bold text-zinc-400 dark:text-zinc-500 mr-2">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    autoFocus
                    placeholder="0.00"
                    value={conteoCierre}
                    onChange={(e) => setConteoCierre(e.target.value)}
                    className="w-full text-2xl font-black text-zinc-900 dark:text-white bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {[5, 10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => sumarConteoCierre(val)}
                    className="h-10 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/40 transition-all cursor-pointer"
                  >
                    +${val}
                  </button>
                ))}
                {conteoCierre !== "" && (
                  <button
                    type="button"
                    onClick={() => setConteoCierre("")}
                    className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 active:scale-95 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-400 mb-1">
                  Observaciones
                </label>
                <input
                  type="text"
                  placeholder="Opcional..."
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  className="w-full h-11 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-base sm:text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                />
              </div>

              <button
                type="submit"
                disabled={cerrandoCaja}
                className="w-full h-11 mt-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-[0.98] text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {cerrandoCaja ? "Cerrando..." : "Confirmar y Cerrar Caja"}
              </button>
            </form>
          </div>
        </div>
      )}

      <PosMobileNav />
    </div>
  );
}
