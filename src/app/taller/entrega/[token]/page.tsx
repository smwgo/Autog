"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function FirmaEntregaMovilPage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? decodeURIComponent(params.token) : "";

  const [cargando, setCargando] = useState(true);
  const [orden, setOrden] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [nombreFirmante, setNombreFirmante] = useState("");
  const [guardandoFirma, setGuardandoFirma] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujandoRef = useRef(false);
  const tieneTrazosRef = useRef(false);

  const cargarOrdenEntrega = async () => {
    if (!token) return;
    try {
      setCargando(true);
      const res = await fetch(`/api/taller/operacion?quoteToken=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrden(data.order);
        setNombreFirmante(data.order.deliverySignedBy || data.order.client || "");
        setError("");
      } else {
        setError(data.error || "No se encontró la orden de entrega.");
      }
    } catch {
      setError("Error de conexión al cargar el acta de entrega.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarOrdenEntrega();
  }, [token]);

  const obtenerPosicionCanvas = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const iniciarTrazo = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = obtenerPosicionCanvas(e);
    dibujandoRef.current = true;
    tieneTrazosRef.current = true;
    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moverTrazo = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!dibujandoRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = obtenerPosicionCanvas(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const terminarTrazo = () => {
    dibujandoRef.current = false;
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tieneTrazosRef.current = false;
  };

  const handleConfirmarFirmaRemota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orden) return;

    let signatureDataUrl = orden.deliverySignatureUrl || "";
    if (canvasRef.current && tieneTrazosRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL("image/png");
    }

    if (!signatureDataUrl) {
      alert("Por favor dibuja tu firma en el recuadro antes de confirmar.");
      return;
    }

    try {
      setGuardandoFirma(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_7_ENTREGA_FIRMA",
          orderId: orden.id,
          quoteToken: token,
          deliverySignatureUrl: signatureDataUrl,
          deliverySignedBy: nombreFirmante.trim() || orden.client || "Cliente",
          deliveryStatus: "Firmado y Entregado",
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrden(data.order);
        setMensajeExito(
          "¡Gracias! Tu firma de conformidad y recepción ha quedado registrada en la orden."
        );
      } else {
        alert(data.error || "No se pudo guardar la firma.");
      }
    } catch {
      alert("Error de conexión al guardar la firma.");
    } finally {
      setGuardandoFirma(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Cargando acta de entrega del vehículo...</p>
        </div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111113] border border-white/10 rounded-2xl p-6 text-center space-y-4">
          <h1 className="text-lg font-bold">Acta de Entrega no disponible</h1>
          <p className="text-xs text-zinc-400">{error}</p>
          <Link
            href="/taller/seguimiento"
            className="inline-flex h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold items-center justify-center"
          >
            Ir a Seguimiento en Línea
          </Link>
        </div>
      </div>
    );
  }

  const items: any[] = Array.isArray(orden.items) ? orden.items : [];
  const yaFirmado = Boolean(orden.deliverySignatureUrl);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans py-6 px-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Cabecera del Acta de Entrega */}
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
              #{orden.orderNumber}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                yaFirmado
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-amber-500/20 border-amber-500/40 text-amber-300"
              }`}
            >
              {yaFirmado ? "✓ Firmado por Cliente" : "Pendiente de Firma"}
            </span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">
              Acta de Entrega y Recepción de Vehículo
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Revisa el detalle de entrega y el informe técnico, y firma desde tu celular.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/5 grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-zinc-500 block text-[11px]">Cliente</span>
              <strong className="text-white">{orden.client}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Placa</span>
              <strong className="text-emerald-300 font-mono">{orden.plate}</strong>
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

        {/* Paso 1: Detalle de la Entrega */}
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            1. Detalle de la Entrega ({items.length} trabajos/repuestos)
          </h2>

          <div className="divide-y divide-white/5">
            {items.map((it: any, idx: number) => (
              <div key={it.id || idx} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-semibold text-white">{it.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    Cant: {it.qty || 1} × ${Number(it.price || 0).toFixed(2)}
                  </p>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  ${((Number(it.qty) || 1) * (Number(it.price) || 0)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Total de la Orden</span>
            <strong className="text-base font-mono text-emerald-400">
              ${Number(orden.totalCost || 0).toFixed(2)}
            </strong>
          </div>
          {orden.balanceDue > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300">Saldo pendiente de pago</span>
              <strong className="font-mono text-amber-300">
                ${Number(orden.balanceDue).toFixed(2)}
              </strong>
            </div>
          )}
        </div>

        {/* Paso 2: Informe Técnico */}
        <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            2. Informe Técnico del Taller
          </h2>

          <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line bg-[#0a0a0a] p-3.5 rounded-xl border border-white/5">
            {orden.technicalReportText ||
              `Se completaron satisfactoriamente los trabajos programados en la orden #${orden.orderNumber}. El vehículo fue verificado en control de calidad y queda operativo.`}
          </p>

          {orden.technicalReportUrl && (
            <a
              href={orden.technicalReportUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 px-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-semibold items-center gap-1.5"
            >
              <span>📎 Ver Informe Técnico Adjunto</span>
            </a>
          )}
        </div>

        {/* Paso 3: Firma de Recepción del Cliente desde su Celular */}
        <form
          onSubmit={handleConfirmarFirmaRemota}
          className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              3. Firma de Conformidad del Cliente
            </h2>
            {!yaFirmado && (
              <button
                type="button"
                onClick={limpiarFirma}
                className="text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Limpiar trazo
              </button>
            )}
          </div>

          {mensajeExito && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-medium">
              {mensajeExito}
            </div>
          )}

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              Nombre y apellido de quien recibe
            </label>
            <input
              type="text"
              value={nombreFirmante}
              onChange={(e) => setNombreFirmante(e.target.value)}
              placeholder="Nombre completo"
              className="w-full h-10 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {yaFirmado && orden.deliverySignatureUrl ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#0a0a0a] border border-emerald-500/30 flex flex-col items-center">
                <img
                  src={orden.deliverySignatureUrl}
                  alt="Firma del cliente"
                  className="max-h-36 object-contain"
                />
                <span className="text-[11px] text-emerald-400 mt-2">
                  Firmado por: {orden.deliverySignedBy || orden.client}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden border border-dashed border-white/20 bg-[#0a0a0a]">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={190}
                  onMouseDown={iniciarTrazo}
                  onMouseMove={moverTrazo}
                  onMouseUp={terminarTrazo}
                  onMouseLeave={terminarTrazo}
                  onTouchStart={iniciarTrazo}
                  onTouchMove={moverTrazo}
                  onTouchEnd={terminarTrazo}
                  className="w-full h-44 touch-none cursor-crosshair block"
                />
              </div>
              <p className="text-[11px] text-zinc-500 text-center">
                Firma con tu dedo dentro del recuadro para confirmar la recepción del vehículo.
              </p>

              <button
                type="submit"
                disabled={guardandoFirma}
                className="w-full h-12 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/50 text-emerald-200 hover:text-white text-sm font-semibold shadow-lg cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {guardandoFirma
                  ? "Guardando firma..."
                  : "✍️ Firmar y Confirmar Recepción"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
