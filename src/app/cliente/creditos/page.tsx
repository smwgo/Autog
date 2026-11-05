"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface CreditAccount {
  id: string;
  customerName: string;
  identification: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  dueDate: string;
  status: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  notes?: string;
}

interface Invoice {
  id: string;
  number: string;
  source: string;
  date: string;
  total: number;
  paymentStatus?: string;
  pendingBalance?: number;
}

export default function ClienteCreditosPage() {
  const [cargando, setCargando] = useState(true);
  const [creditos, setCreditos] = useState<CreditAccount | null>(null);
  const [facturasPendientes, setFacturasPendientes] = useState<Invoice[]>([]);
  const [modalAbono, setModalAbono] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        setCargando(true);
        const res = await fetch("/api/cliente/dashboard");
        const data = await res.json();
        if (data.success) {
          setCreditos(data.credits || {
            id: "crd-1",
            customerName: data.customer?.name || "Camila Rojas",
            identification: data.customer?.identification || "0923849120",
            creditLimit: 600.0,
            currentBalance: 170.0,
            availableCredit: 430.0,
            dueDate: "28 de Octubre, 2026",
            status: "AL_DIA",
            lastPaymentDate: "15 oct 2026",
            lastPaymentAmount: 150.0,
          });
          const allInvs: Invoice[] = data.invoices || [];
          setFacturasPendientes(
            allInvs.filter((i) => (i.paymentStatus || "").includes("Abono") || (i.paymentStatus || "").includes("pendiente"))
          );
        }
      } catch (err) {
        console.error("Error al cargar créditos:", err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-sans pb-16">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/cliente"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Volver a Portal de Cliente</span>
            </Link>
            <span className="text-slate-300 dark:text-zinc-700">|</span>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              Módulo: Mis Créditos & Cuenta Corriente
            </span>
          </div>

          <button
            type="button"
            onClick={() => setModalAbono(true)}
            className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>💳</span>
            <span>Realizar Abono</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-grow w-full space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/cliente"
            title="Volver a Portal de Cliente"
            className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Mis Créditos y Cuentas</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                {creditos?.status || "Al Día"}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Cupo comercial rotativo para adquisición de repuestos y financiamiento de mano de obra en taller.
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Cargando estado de tu línea de crédito...</p>
          </div>
        ) : creditos ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tarjeta de Línea de Crédito */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center text-2xl">
                    💳
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Línea de Crédito Activa
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {creditos.customerName}
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Vencimiento:</span>
                  <strong className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-200">
                    {creditos.dueDate}
                  </strong>
                </div>
              </div>

              {/* Métricas destacadas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60">
                  <span className="text-xs text-slate-400 block font-medium">Cupo Disponible</span>
                  <strong className="text-xl sm:text-2xl font-mono text-emerald-600 block mt-1">
                    ${creditos.availableCredit.toFixed(2)}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60">
                  <span className="text-xs text-slate-400 block font-medium">Saldo Adeudado</span>
                  <strong className="text-xl sm:text-2xl font-mono text-amber-600 block mt-1">
                    ${creditos.currentBalance.toFixed(2)}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-700/60">
                  <span className="text-xs text-slate-400 block font-medium">Límite Aprobado</span>
                  <strong className="text-xl sm:text-2xl font-mono text-slate-900 dark:text-white block mt-1">
                    ${creditos.creditLimit.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400">
                  <span>Utilización del crédito</span>
                  <span className="font-mono font-bold">
                    {Math.round((creditos.currentBalance / creditos.creditLimit) * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(8, (creditos.currentBalance / creditos.creditLimit) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-zinc-800">
                <span>Último abono registrado: {creditos.lastPaymentDate || "15 oct 2026"}</span>
                <strong className="font-mono text-slate-800 dark:text-zinc-200">
                  ${Number(creditos.lastPaymentAmount || 150).toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Cuentas Bancarias para Transferencias */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xs p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🏦</span>
                <span>Cuentas para Realizar Abonos</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 space-y-1">
                  <strong className="text-slate-900 dark:text-white block font-bold">
                    Banco Pichincha (Cta. Corriente)
                  </strong>
                  <p className="font-mono text-slate-600 dark:text-zinc-300">
                    N°: <strong>2100492810</strong> • RUC: 0992384912001
                  </p>
                  <span className="text-[10px] text-slate-400">AutoG Sistema Automotriz S.A.</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 space-y-1">
                  <strong className="text-slate-900 dark:text-white block font-bold">
                    Banco Guayaquil (Cta. Ahorros)
                  </strong>
                  <p className="font-mono text-slate-600 dark:text-zinc-300">
                    N°: <strong>0048192041</strong>
                  </p>
                  <span className="text-[10px] text-slate-400">AutoG Taller & POS</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 space-y-1">
                  <strong className="text-slate-900 dark:text-white block font-bold">
                    Deuna! / Pagos QR
                  </strong>
                  <p className="font-mono text-slate-600 dark:text-zinc-300">+593 99 876 5432</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const text = `Hola AutoG, soy ${creditos.customerName} (Doc: ${creditos.identification}). Adjunto mi comprobante para registrar un abono a mi crédito de $${creditos.currentBalance.toFixed(2)}.`;
                  window.open(`https://wa.me/593998765432?text=${encodeURIComponent(text)}`, "_blank");
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>💬</span>
                <span>Enviar Comprobante por WhatsApp</span>
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Modal Abono */}
      {modalAbono && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Abono a Cuenta</h3>
            <p className="text-xs text-slate-500">
              Transfiere a cualquiera de las cuentas oficiales y confirma por WhatsApp para liberar tu cupo inmediatamente.
            </p>
            <button
              onClick={() => setModalAbono(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
