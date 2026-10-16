"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface SaleDetail {
  id: string;
  saleNumber: string;
  createdAt: string;
  customerName?: string | null;
  paymentMethod: string;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  customer?: {
    identification?: string;
    phone?: string;
    email?: string;
  } | null;
  items?: SaleItem[];
}

const OPCIONES_METODO_PAGO = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta Débito/Crédito" },
  { value: "Transferencia", label: "Transferencia Bancaria" },
  { value: "Crédito", label: "Crédito Interno" },
];

const OPCIONES_ESTADO = [
  { value: "Completada", label: "Completada", dot: "bg-emerald-500" },
  { value: "Anulada", label: "Anulada", dot: "bg-rose-500" },
];

function CustomDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; dot?: string }[];
  onChange: (val: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  const opcionSeleccionada = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full px-4 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-sm font-medium flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs focus:outline-none"
      >
        <span className="flex items-center gap-2">
          {opcionSeleccionada?.dot && (
            <span className={`w-2 h-2 rounded-full ${opcionSeleccionada.dot}`} />
          )}
          <span>{opcionSeleccionada?.label || value}</span>
        </span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            abierto ? "rotate-180 text-blue-500" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-1">
            {options.map((opt) => {
              const esActivo = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setAbierto(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-left transition-colors flex items-center justify-between cursor-pointer ${
                    esActivo
                      ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {opt.dot && <span className={`w-2 h-2 rounded-full ${opt.dot}`} />}
                    <span>{opt.label}</span>
                  </span>
                  {esActivo && (
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EditarFacturaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [venta, setVenta] = useState<SaleDetail | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [status, setStatus] = useState("Completada");

  useEffect(() => {
    if (!id) {
      setErrorMsg("No se proporcionó un ID de factura válido.");
      setCargando(false);
      return;
    }

    const cargarFactura = async () => {
      try {
        setCargando(true);
        setErrorMsg(null);
        const res = await fetch(`/api/ventas?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await res.json();

        if (res.ok && data.success && data.venta) {
          const v = data.venta;
          setVenta(v);
          setCustomerName(v.customerName || "Consumidor Final");
          setPaymentMethod(v.paymentMethod || "Efectivo");
          setStatus(v.status || "Completada");
        } else {
          setErrorMsg(data.error || "No se pudo cargar la factura.");
        }
      } catch (err: any) {
        console.error("Error cargando factura:", err);
        setErrorMsg("Error de conexión al cargar los datos de la factura.");
      } finally {
        setCargando(false);
      }
    };

    cargarFactura();
  }, [id]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setGuardando(true);
      setErrorMsg(null);

      const res = await fetch("/api/ventas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          customerName: customerName.trim(),
          paymentMethod,
          status,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito("Factura actualizada exitosamente.");
        setTimeout(() => {
          router.push("/pos/facturas");
        }, 1200);
      } else {
        setErrorMsg(data.error || "Error al actualizar la factura.");
      }
    } catch (err: any) {
      console.error("Error al guardar factura:", err);
      setErrorMsg(err.message || "Error de conexión al guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-12">
      <Header />

      <main className="flex-grow p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
        {/* Encabezado Principal */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/pos/facturas"
              title="Volver a Facturas"
              aria-label="Volver a Facturas"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-200/70 dark:bg-zinc-800/60 hover:bg-zinc-300/70 dark:hover:bg-zinc-800 active:scale-95 transition-all shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-medium text-zinc-900 dark:text-white tracking-tight">
                Editar Factura {venta ? `#${venta.saleNumber}` : ""}
              </h1>
            </div>
          </div>

          {/* Acciones Superiores */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/pos/facturas"
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="button"
              onClick={handleGuardar}
              disabled={guardando || cargando}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mensajes de Alerta */}
        {mensajeExito && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm animate-in fade-in duration-200 shadow-sm">
            <span className="text-xl">✓</span>
            <div className="flex-1 font-semibold">{mensajeExito}</div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-800 dark:text-red-300 text-sm animate-in fade-in duration-200 shadow-sm">
            <span className="text-xl">⚠️</span>
            <div className="flex-1 font-semibold">{errorMsg}</div>
          </div>
        )}

        {cargando ? (
          <div className="p-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Cargando factura...</p>
          </div>
        ) : !venta ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-500">No se encontró la información de la factura solicitada.</p>
            <Link
              href="/pos/facturas"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
            >
              Volver a Facturas
            </Link>
          </div>
        ) : (
          <form onSubmit={handleGuardar} className="space-y-6">
            {/* Tarjeta 1: Datos de la Factura */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span>🧾</span>
                <span>Datos de la factura</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cliente / Razón Social */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Cliente / Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Consumidor Final"
                    className="w-full px-4 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Método de Pago */}
                <CustomDropdown
                  label="Método de pago"
                  value={paymentMethod}
                  options={OPCIONES_METODO_PAGO}
                  onChange={setPaymentMethod}
                />

                {/* Estado */}
                <CustomDropdown
                  label="Estado de factura"
                  value={status}
                  options={OPCIONES_ESTADO}
                  onChange={setStatus}
                />
              </div>
            </div>

            {/* Tarjeta 2: Detalle de Artículos y Total */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span>📦</span>
                  <span>Artículos vendidos</span>
                </span>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {venta.items?.length || 0} línea(s)
                </span>
              </h2>

              <div className="overflow-x-auto mb-5">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">P. Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {venta.items && venta.items.length > 0 ? (
                      venta.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="py-3 px-3 font-medium text-zinc-900 dark:text-white">
                            {it.name}
                          </td>
                          <td className="py-3 px-3 text-center text-zinc-600 dark:text-zinc-400">
                            {it.quantity}
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-600 dark:text-zinc-400">
                            ${Number(it.price || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-zinc-900 dark:text-white">
                            ${Number(it.total || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-400 text-xs">
                          Sin artículos detallados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-end gap-1.5 text-sm">
                <div className="flex justify-between w-64 text-zinc-600 dark:text-zinc-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    ${Number(venta.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                {Number(venta.discount || 0) > 0 && (
                  <div className="flex justify-between w-64 text-emerald-600 dark:text-emerald-400">
                    <span>Descuento:</span>
                    <span className="font-semibold">-${Number(venta.discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(venta.tax || 0) > 0 && (
                  <div className="flex justify-between w-64 text-zinc-600 dark:text-zinc-400">
                    <span>Impuestos (IVA):</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      ${Number(venta.tax).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between w-64 text-base font-bold text-zinc-900 dark:text-white pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span>Total Factura:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    ${Number(venta.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón inferior para móviles */}
            <div className="sm:hidden pt-2">
              <button
                type="submit"
                disabled={guardando || cargando}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        )}
      </main>

      <PosMobileNav />
    </div>
  );
}

export default function EditarFacturaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <EditarFacturaContent />
    </Suspense>
  );
}
