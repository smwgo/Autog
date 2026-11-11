"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function AprobacionPresupuestoMovilPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? decodeURIComponent(params.token) : "";

  const [cargando, setCargando] = useState(true);
  const [orden, setOrden] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [comentarioCliente, setComentarioCliente] = useState("");
  const [mensajeRespuesta, setMensajeRespuesta] = useState("");

  const cargarPresupuesto = async () => {
    if (!token) return;
    try {
      setCargando(true);
      const res = await fetch(`/api/taller/operacion?quoteToken=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrden(data.order);
        setError("");
      } else {
        setError(data.error || "No se encontró el presupuesto solicitado.");
      }
    } catch {
      setError("Error de conexión al consultar el presupuesto.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPresupuesto();
  }, [token]);

  const handleResponder = async (decision: "APROBAR" | "AJUSTAR") => {
    if (!orden) return;
    try {
      setProcesando(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESPONDER_PRESUPUESTO_CLIENTE",
          quoteToken: token,
          orderId: orden.id,
          decision,
          clientComment: comentarioCliente,
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrden(data.order);
        setMensajeRespuesta(data.message || "Respuesta registrada correctamente.");
      }
    } catch {
      alert("No se pudo enviar tu respuesta. Intenta nuevamente.");
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Cargando presupuesto del vehículo...</p>
        </div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111113] border border-white/10 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-xl">
            ✕
          </div>
          <h1 className="text-lg font-bold">Presupuesto no disponible</h1>
          <p className="text-xs text-zinc-400">{error}</p>
          <Link
            href="/cliente"
            className="inline-flex h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold items-center justify-center"
          >
            Ir al Portal de Clientes
          </Link>
        </div>
      </div>
    );
  }

  const items: any[] = Array.isArray(orden.items) ? orden.items : [];
  const subtotal = Number(orden.subtotal || 0);
  const discountAmount = Number(orden.discountAmount || 0);
  const taxRate = Number(orden.quoteTaxRate ?? 15);
  const taxAmount = Number(orden.taxAmount || 0);
  const totalFinal = Number(orden.totalCost || 0);
  const yaAprobado = orden.quoteStatus === "Aprobado por Cliente";

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans py-6 px-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Cabecera Móvil del Presupuesto */}
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
              {orden.quoteNumber || `PRE-${orden.orderNumber}`}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${yaAprobado
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                }`}
            >
              {orden.quoteStatus || "Pendiente de Aprobación"}
            </span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">Presupuesto</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Orden #{orden.orderNumber} • Técnico: {orden.mechanic}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/5 grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-zinc-500 block text-[11px]">Cliente</span>
              <strong className="text-white">{orden.client}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Placa / Serie</span>
              <strong className="text-amber-300 font-mono">{orden.plate}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-500 block text-[11px]">Vehículo / Equipo</span>
              <strong className="text-white">
                {orden.vehicle}
                {orden.mileage ? ` • ${Number(orden.mileage).toLocaleString()} km` : ""}
              </strong>
            </div>
          </div>
        </div>

        {/* Detalle de Servicios y Repuestos */}
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Servicios y Repuestos ({items.length})
            </h2>
            <span className="text-[11px] text-zinc-400">Valores en USD</span>
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">
              No hay ítems cargados en este presupuesto.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map((it: any, idx: number) => {
                const qty = Number(it.qty) || 1;
                const price = Number(it.price) || 0;
                return (
                  <div key={it.id || idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${it.type === "PART"
                            ? "bg-pink-500/20 text-pink-300"
                            : "bg-blue-500/20 text-blue-300"
                            }`}
                        >
                          {it.type === "PART" ? "Repuesto" : "Servicio"}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">
                          {it.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Cant: {qty} × ${price.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-xs sm:text-sm font-mono font-bold text-white shrink-0">
                      ${(qty * price).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Desglose de Impuestos y Descuentos */}
          <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="font-mono text-zinc-200">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>
                  Descuento{" "}
                  {orden.quoteDiscountType === "PERCENT" ? `(${orden.quoteDiscount}%)` : ""}
                </span>
                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <span>Impuestos (IVA {taxRate}%)</span>
              <span className="font-mono text-zinc-200">+${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/10 text-base font-bold text-white">
              <span>Total Presupuesto</span>
              <span className="text-lg font-mono text-emerald-400">${totalFinal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Bloque de Aprobación desde el Celular */}
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
          {mensajeRespuesta && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              ✓ {mensajeRespuesta}
            </div>
          )}

          {yaAprobado ? (
            <div className="text-center py-2 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto text-xl">
                ✓
              </div>
              <h3 className="text-base font-bold text-emerald-300">
                Presupuesto Aprobado por el Cliente
              </h3>
              <p className="text-xs text-zinc-400">
                Gracias por tu confirmación. Nuestro equipo técnico ya está trabajando en tu vehículo.
              </p>
            </div>
          ) : (
            <>
              <label className="text-xs font-medium text-zinc-300 block">
                Comentario o indicación opcional para el técnico
              </label>
              <input
                type="text"
                value={comentarioCliente}
                onChange={(e) => setComentarioCliente(e.target.value)}
                placeholder="Ej: Por favor avisarme cuando esté listo..."
                className="w-full h-11 px-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => handleResponder("APROBAR")}
                  className="h-12 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/50 text-emerald-300 hover:text-white font-bold text-sm shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {procesando ? "Procesando..." : "✅ Aprobar Presupuesto Ahora"}
                </button>
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => handleResponder("AJUSTAR")}
                  className="h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-semibold text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  💬 Solicitar Ajuste / Consulta
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
