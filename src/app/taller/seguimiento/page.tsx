"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const COLOR_BADGE_MAP: Record<
  string,
  { bg: string; border: string; text: string; bar: string; dot: string }
> = {
  blue: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/40",
    text: "text-blue-300",
    bar: "from-blue-500 to-indigo-500",
    dot: "bg-blue-400",
  },
  amber: {
    bg: "bg-amber-500/20",
    border: "border-amber-500/40",
    text: "text-amber-300",
    bar: "from-amber-500 to-orange-500",
    dot: "bg-amber-400",
  },
  purple: {
    bg: "bg-purple-500/20",
    border: "border-purple-500/40",
    text: "text-purple-300",
    bar: "from-purple-500 to-indigo-500",
    dot: "bg-purple-400",
  },
  sky: {
    bg: "bg-sky-500/20",
    border: "border-sky-500/40",
    text: "text-sky-300",
    bar: "from-sky-400 to-blue-600",
    dot: "bg-sky-400",
  },
  emerald: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/40",
    text: "text-emerald-300",
    bar: "from-emerald-400 to-teal-500",
    dot: "bg-emerald-400",
  },
  pink: {
    bg: "bg-pink-500/20",
    border: "border-pink-500/40",
    text: "text-pink-300",
    bar: "from-pink-500 to-rose-500",
    dot: "bg-pink-400",
  },
  rose: {
    bg: "bg-rose-500/20",
    border: "border-rose-500/40",
    text: "text-rose-300",
    bar: "from-rose-500 to-red-600",
    dot: "bg-rose-400",
  },
};

function SeguimientoOrdenContent() {
  const searchParams = useSearchParams();
  const initialOrden = searchParams.get("orden") || "";
  const initialPin = searchParams.get("pin") || "";

  const [ordenInput, setOrdenInput] = useState(initialOrden);
  const [pinInput, setPinInput] = useState(initialPin);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [orden, setOrden] = useState<any | null>(null);

  const consultarSeguimiento = async (numOrden: string, pin: string) => {
    const cleanOrd = numOrden.trim();
    const cleanPin = pin.trim();
    if (!cleanOrd || !cleanPin) {
      setError("Ingresa el número de orden (o placa) y el PIN de 4 dígitos.");
      return;
    }

    try {
      setCargando(true);
      setError("");
      const res = await fetch(
        `/api/taller/operacion?trackingOrder=${encodeURIComponent(
          cleanOrd
        )}&trackingPin=${encodeURIComponent(cleanPin)}`
      );
      const data = await res.json();
      if (data.success && data.order) {
        setOrden(data.order);
      } else {
        setOrden(null);
        setError(
          data.error || "No se pudo verificar la orden. Revisa el número de orden y tu PIN."
        );
      }
    } catch {
      setError("Error de conexión al consultar el estado de tu orden.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (initialOrden && initialPin) {
      consultarSeguimiento(initialOrden, initialPin);
    }
  }, [initialOrden, initialPin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    consultarSeguimiento(ordenInput, pinInput);
  };

  const colorStyle =
    COLOR_BADGE_MAP[orden?.statusColor || "amber"] || COLOR_BADGE_MAP.amber;
  const items: any[] = Array.isArray(orden?.items) ? orden.items : [];
  const fotosAvance: string[] = [
    ...(Array.isArray(orden?.evidencePhotos) ? orden.evidencePhotos : []),
    ...(Array.isArray(orden?.receptionPhotos) ? orden.receptionPhotos : []),
  ];
  const historialEstados: any[] = Array.isArray(orden?.statusHistory)
    ? orden.statusHistory
    : [];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans py-6 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Cabecera Superior */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/taller"
              className="w-10 h-10 rounded-full bg-[#111113] hover:bg-[#161618] border border-white/10 text-zinc-200 flex items-center justify-center transition-all"
              title="Volver"
            >
              ←
            </Link>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
                Portal de Seguimiento en Vivo
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Estado de tu Vehículo en Taller
              </h1>
            </div>
          </div>

          {orden && (
            <button
              type="button"
              onClick={() => consultarSeguimiento(ordenInput || orden.orderNumber, pinInput || orden.trackingPin)}
              className="h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              🔄 Actualizar
            </button>
          )}
        </div>

        {/* Tarjeta de Acceso con Número de Orden y PIN */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111113] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              Consulta con tu Número de Orden (o Placa) y PIN de seguridad
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono">
              🔐 Acceso con PIN
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-6">
              <label className="block text-[11px] text-zinc-400 mb-1">
                N° de Orden o Placa
              </label>
              <input
                type="text"
                value={ordenInput}
                onChange={(e) => setOrdenInput(e.target.value)}
                placeholder="Ej: OT-2026-101 o ABC-123"
                className="w-full h-11 px-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-emerald-500 text-white text-sm font-mono uppercase placeholder:text-zinc-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] text-zinc-400 mb-1">
                PIN (4 dígitos)
              </label>
              <input
                type="text"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Ej: 4821"
                className="w-full h-11 px-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-emerald-500 text-emerald-300 text-sm font-mono font-bold text-center placeholder:text-zinc-600 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={cargando}
                className="w-full h-11 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {cargando ? "Verificando..." : "Ver Seguimiento"}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}
        </form>

        {/* Resultado del Seguimiento en Línea */}
        {orden && (
          <div className="space-y-4 animate-fade-in">
            {/* Estado Actual con el Nombre y Color Elegido */}
            <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs font-bold text-zinc-200">
                    #{orden.orderNumber}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-300">
                    {orden.plate}
                  </span>
                </div>

                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text}`}
                >
                  <span className={`w-2 h-2 rounded-full ${colorStyle.dot} animate-pulse`} />
                  <span>{orden.status}</span>
                </span>
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {orden.vehicle}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Cliente: <strong className="text-zinc-200">{orden.client}</strong> • Técnico a cargo:{" "}
                  <strong className="text-zinc-200">{orden.mechanic}</strong>
                </p>
              </div>

              {/* Barra de Progreso */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Avance general de la orden</span>
                  <span className={`font-mono font-bold ${colorStyle.text}`}>
                    {orden.progress ?? 50}% completado
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#0a0a0a] border border-white/5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${colorStyle.bar} transition-all duration-500`}
                    style={{
                      width: `${Math.min(100, Math.max(10, Number(orden.progress || 50)))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Datos de Recepción */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-[#0a0a0a] border border-white/5 text-xs">
                  <span className="text-[10px] text-zinc-500 block">Kilometraje</span>
                  <strong className="text-white font-mono">
                    {orden.mileage ? `${Number(orden.mileage).toLocaleString()} km` : "Registrado"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0a0a0a] border border-white/5 text-xs">
                  <span className="text-[10px] text-zinc-500 block">Combustible</span>
                  <strong className="text-white">{orden.fuelLevel || "1/2"}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0a0a0a] border border-white/5 text-xs">
                  <span className="text-[10px] text-zinc-500 block">Próx. Cambio Aceite</span>
                  <strong className="text-emerald-400 font-mono">
                    {orden.nextOilChangeKm
                      ? `${Number(orden.nextOilChangeKm).toLocaleString()} km`
                      : "Por definir"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0a0a0a] border border-white/5 text-xs">
                  <span className="text-[10px] text-zinc-500 block">Total Orden</span>
                  <strong className="text-emerald-400 font-mono text-sm">
                    ${Number(orden.totalCost || 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Acceso directo a Aprobar Presupuesto si aplica */}
              {orden.quoteToken && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-semibold text-purple-300 block">
                      Presupuesto #{orden.quoteNumber || orden.orderNumber}: {orden.quoteStatus}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Puedes revisar el desglose e impuestos desde tu celular.
                    </span>
                  </div>
                  <Link
                    href={`/taller/presupuesto/${encodeURIComponent(orden.quoteToken)}`}
                    className="h-9 px-3.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/35 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center"
                  >
                    Ver Presupuesto →
                  </Link>
                </div>
              )}
            </div>

            {/* Detalle de Trabajos y Repuestos en Tiempo Real */}
            <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Trabajos y Repuestos de la Orden ({items.length})
                </h3>
                <span className="text-[11px] text-zinc-400">Estado en vivo</span>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3">
                  El técnico está registrando los servicios de tu orden.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((it: any, idx: number) => (
                    <div
                      key={it.id || idx}
                      className="p-3 rounded-xl bg-[#0a0a0a] border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">
                          {it.name}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Cant: {it.qty || 1} × ${Number(it.price || 0).toFixed(2)}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border shrink-0 ${
                          it.status === "Listo"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : it.status === "En Proceso"
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                            : "bg-white/5 border-white/10 text-zinc-400"
                        }`}
                      >
                        {it.status || "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Estados y Avisos */}
            {historialEstados.length > 0 && (
              <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Bitácora de Estados y Avisos
                </h3>
                <div className="space-y-2">
                  {historialEstados.map((h: any, idx: number) => {
                    const stColor =
                      COLOR_BADGE_MAP[h.color || "amber"] || COLOR_BADGE_MAP.amber;
                    return (
                      <div
                        key={h.id || idx}
                        className="p-3 rounded-xl bg-[#0a0a0a] border border-white/5 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stColor.bg} ${stColor.border} ${stColor.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${stColor.dot}`} />
                            {h.status}
                          </span>
                          {h.message && (
                            <p className="text-zinc-300 text-[11px] leading-relaxed mt-1">
                              {h.message}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {h.createdAt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Galería de Fotos de Recepción y Avance (Cloudflare R2) */}
            {fotosAvance.length > 0 && (
              <div className="bg-[#111113] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Evidencia Fotográfica del Vehículo ({fotosAvance.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {fotosAvance.map((url, i) => (
                    <a
                      key={`${url}-${i}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] aspect-video block"
                    >
                      <img
                        src={url}
                        alt={`Evidencia ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeguimientoOrdenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
          <p className="text-sm text-zinc-400">Cargando seguimiento en línea...</p>
        </div>
      }
    >
      <SeguimientoOrdenContent />
    </Suspense>
  );
}
