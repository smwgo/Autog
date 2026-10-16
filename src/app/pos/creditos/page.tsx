"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface CreditAccount {
  id: string;
  customerName: string;
  identification: string;
  phone: string;
  creditLimit: number;
  currentBalance: number; // deuda actual
  dueDate: string;
  status: "AL_DIA" | "POR_VENCER" | "VENCIDO";
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

const initialCredits: CreditAccount[] = [
  {
    id: "cred-1",
    customerName: "Flota Taxis El Sol S.A.",
    identification: "1792345678001",
    phone: "0991234567",
    creditLimit: 1500,
    currentBalance: 650.0,
    dueDate: "2026-11-15",
    status: "AL_DIA",
    lastPaymentDate: "2026-10-10",
    lastPaymentAmount: 300,
  },
  {
    id: "cred-2",
    customerName: "Carlos Méndez (Taller Aliado)",
    identification: "1718293041",
    phone: "0987654321",
    creditLimit: 800,
    currentBalance: 780.0,
    dueDate: "2026-10-18",
    status: "POR_VENCER",
    lastPaymentDate: "2026-09-25",
    lastPaymentAmount: 150,
  },
  {
    id: "cred-3",
    customerName: "Transportes Andinos Cía. Ltda.",
    identification: "1790011223001",
    phone: "0998877665",
    creditLimit: 3000,
    currentBalance: 1200.0,
    dueDate: "2026-09-30",
    status: "VENCIDO",
    lastPaymentDate: "2026-08-20",
    lastPaymentAmount: 500,
  },
  {
    id: "cred-4",
    customerName: "María Belén Andrade",
    identification: "1723456789",
    phone: "0981122334",
    creditLimit: 400,
    currentBalance: 95.0,
    dueDate: "2026-11-05",
    status: "AL_DIA",
    lastPaymentDate: "2026-10-01",
    lastPaymentAmount: 100,
  },
];

export default function CreditosPage() {
  const [creditos, setCreditos] = useState<CreditAccount[]>(initialCredits);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "AL_DIA" | "POR_VENCER" | "VENCIDO">("TODOS");

  // Modal registrar abono
  const [cuentaAbono, setCuentaAbono] = useState<CreditAccount | null>(null);
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [metodoAbono, setMetodoAbono] = useState("Efectivo");
  const [notaAbono, setNotaAbono] = useState("");

  // Modal nuevo crédito
  const [modalNuevoCredito, setModalNuevoCredito] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaId, setNuevaId] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoLimite, setNuevoLimite] = useState<number>(500);
  const [nuevaDeudaInicial, setNuevaDeudaInicial] = useState<number>(0);
  const [nuevoVencimiento, setNuevoVencimiento] = useState("2026-11-30");

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const handleAplicarAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaAbono || montoAbono <= 0) return;

    if (montoAbono > cuentaAbono.currentBalance) {
      alert("El monto de abono no puede ser mayor a la deuda actual.");
      return;
    }

    const nuevoSaldo = Math.max(0, cuentaAbono.currentBalance - montoAbono);
    const nuevoEstado = nuevoSaldo === 0 ? "AL_DIA" : cuentaAbono.status;

    setCreditos((prev) =>
      prev.map((c) =>
        c.id === cuentaAbono.id
          ? {
              ...c,
              currentBalance: nuevoSaldo,
              status: nuevoEstado,
              lastPaymentDate: new Date().toISOString().split("T")[0],
              lastPaymentAmount: montoAbono,
            }
          : c
      )
    );

    setMensajeExito(`Abono de $${montoAbono.toFixed(2)} registrado exitosamente a ${cuentaAbono.customerName}.`);
    setTimeout(() => setMensajeExito(null), 4000);
    setCuentaAbono(null);
    setMontoAbono(0);
    setNotaAbono("");
  };

  const handleCrearCredito = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevaId.trim()) {
      alert("Nombre y Cédula/RUC son obligatorios.");
      return;
    }

    const nuevo: CreditAccount = {
      id: `cred-${Date.now()}`,
      customerName: nuevoNombre.trim(),
      identification: nuevaId.trim(),
      phone: nuevoTelefono.trim() || "N/A",
      creditLimit: Number(nuevoLimite) || 500,
      currentBalance: Number(nuevaDeudaInicial) || 0,
      dueDate: nuevoVencimiento,
      status: "AL_DIA",
    };

    setCreditos([nuevo, ...creditos]);
    setMensajeExito(`Línea de crédito para ${nuevo.customerName} creada con cupo de $${nuevo.creditLimit}.`);
    setTimeout(() => setMensajeExito(null), 4000);
    setModalNuevoCredito(false);
    setNuevoNombre("");
    setNuevaId("");
    setNuevoTelefono("");
    setNuevoLimite(500);
    setNuevaDeudaInicial(0);
  };

  const filtrados = creditos.filter((c) => {
    const coincideTexto =
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.identification.includes(searchTerm) ||
      c.phone.includes(searchTerm);

    if (!coincideTexto) return false;
    if (filtroEstado !== "TODOS" && c.status !== filtroEstado) return false;
    return true;
  });

  const carteraTotal = creditos.reduce((acc, c) => acc + c.currentBalance, 0);
  const cupoTotalOtorgado = creditos.reduce((acc, c) => acc + c.creditLimit, 0);
  const totalVencidos = creditos.filter((c) => c.status === "VENCIDO").length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Cabecera y Navegación */}
        <div className="mb-6">
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
          >
            &larr; Volver al panel POS
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl select-none mt-1">💳</span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Créditos
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Cuentas por cobrar, líneas de crédito para clientes y registro de abonos.
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalNuevoCredito(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
          >
            <span>➕</span>
            <span>Nuevo Crédito</span>
          </button>
        </div>

        {/* Mensaje éxito */}
        {mensajeExito && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
            <span>✓ {mensajeExito}</span>
            <button
              onClick={() => setMensajeExito(null)}
              className="text-emerald-500 hover:text-emerald-700 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* KPIs / Resumen de Cartera */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Cartera Total por Cobrar
              </span>
              <span className="text-xl">💰</span>
            </div>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
              ${carteraTotal.toFixed(2)}
            </p>
            <span className="text-xs text-zinc-500">Saldo pendiente de pago</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Cupo Total Otorgado
              </span>
              <span className="text-xl">🛡️</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
              ${cupoTotalOtorgado.toFixed(2)}
            </p>
            <span className="text-xs text-zinc-500">Límite global autorizado</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Cuentas Vencidas
              </span>
              <span className="text-xl">⚠️</span>
            </div>
            <p className="text-2xl font-bold text-rose-500 mt-2">
              {totalVencidos}
            </p>
            <span className="text-xs text-zinc-500">Requieren gestión de cobro</span>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, RUC o teléfono..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(["TODOS", "AL_DIA", "POR_VENCER", "VENCIDO"] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  filtroEstado === estado
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {estado === "TODOS"
                  ? "Todos"
                  : estado === "AL_DIA"
                  ? "Al Día"
                  : estado === "POR_VENCER"
                  ? "Por Vencer"
                  : "Vencidos"}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Créditos */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {filtrados.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No se encontraron cuentas de crédito con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">RUC / Cédula</th>
                    <th className="py-3.5 px-4">Uso de Cupo</th>
                    <th className="py-3.5 px-4 text-right">Saldo Deudor</th>
                    <th className="py-3.5 px-4">Vencimiento</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filtrados.map((cuenta) => {
                    const porcentajeUso = Math.min(
                      100,
                      Math.round((cuenta.currentBalance / cuenta.creditLimit) * 100)
                    );

                    return (
                      <tr
                        key={cuenta.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                          <div>{cuenta.customerName}</div>
                          <span className="text-xs font-normal text-zinc-400">
                            📞 {cuenta.phone}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                          {cuenta.identification}
                        </td>
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-500 font-semibold">{porcentajeUso}%</span>
                            <span className="text-zinc-400">Cupo: ${cuenta.creditLimit}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                porcentajeUso > 90
                                  ? "bg-rose-500"
                                  : porcentajeUso > 70
                                  ? "bg-amber-500"
                                  : "bg-cyan-500"
                              }`}
                              style={{ width: `${porcentajeUso}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-zinc-900 dark:text-white text-base">
                          ${cuenta.currentBalance.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-xs">
                          {cuenta.dueDate}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              cuenta.status === "AL_DIA"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : cuenta.status === "POR_VENCER"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            }`}
                          >
                            {cuenta.status === "AL_DIA"
                              ? "Al Día"
                              : cuenta.status === "POR_VENCER"
                              ? "Por Vencer"
                              : "Vencido"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setCuentaAbono(cuenta);
                              setMontoAbono(cuenta.currentBalance);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                          >
                            Abonar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Registrar Abono */}
        {cuentaAbono && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>💵</span>
                  <span>Registrar Abono a Cuenta</span>
                </h3>
                <button
                  onClick={() => setCuentaAbono(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Cliente:</p>
                <p className="font-bold text-zinc-900 dark:text-white text-sm">
                  {cuentaAbono.customerName}
                </p>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-cyan-500/20 text-xs">
                  <span className="text-zinc-500">Saldo pendiente:</span>
                  <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm">
                    ${cuentaAbono.currentBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleAplicarAbono} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Monto a Abonar ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={cuentaAbono.currentBalance}
                    required
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold text-lg text-cyan-600 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setMontoAbono(cuentaAbono.currentBalance)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-200"
                    >
                      Pagar Total (${cuentaAbono.currentBalance})
                    </button>
                    {cuentaAbono.currentBalance > 50 && (
                      <button
                        type="button"
                        onClick={() => setMontoAbono(Math.round(cuentaAbono.currentBalance / 2))}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-200"
                      >
                        50%
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={metodoAbono}
                    onChange={(e) => setMetodoAbono(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Referencia / Nota (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notaAbono}
                    onChange={(e) => setNotaAbono(e.target.value)}
                    placeholder="Comprobante # o notas adicionales..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    Registrar Abono
                  </button>
                  <button
                    type="button"
                    onClick={() => setCuentaAbono(null)}
                    className="px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 font-semibold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nuevo Crédito */}
        {modalNuevoCredito && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>💳</span>
                  <span>Asignar Línea de Crédito</span>
                </h3>
                <button
                  onClick={() => setModalNuevoCredito(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearCredito} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Cliente o Empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Ej: Taller Mecánico San José"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      RUC o Cédula
                    </label>
                    <input
                      type="text"
                      required
                      value={nuevaId}
                      onChange={(e) => setNuevaId(e.target.value)}
                      placeholder="1790000000001"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={nuevoTelefono}
                      onChange={(e) => setNuevoTelefono(e.target.value)}
                      placeholder="0991234567"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Cupo Límite ($)
                    </label>
                    <input
                      type="number"
                      min="50"
                      required
                      value={nuevoLimite}
                      onChange={(e) => setNuevoLimite(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Deuda Inicial ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={nuevaDeudaInicial}
                      onChange={(e) => setNuevaDeudaInicial(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Fecha Límite de Pago
                  </label>
                  <input
                    type="date"
                    value={nuevoVencimiento}
                    onChange={(e) => setNuevoVencimiento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    Guardar Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalNuevoCredito(false)}
                    className="px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 font-semibold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
